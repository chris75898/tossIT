var path = require('path');
var url = require('url');
var express = require('express');
var ws = require('ws');
var kurento = require('kurento-client');
var fs    = require('fs');
var pem  = require("pem");
var https = require('https');
var msg = require("./messaging.js");
var rooms = require("./rooms.js");
var info = require("../package.json");
var tar = require('tar');
var crypto = require('crypto');
var randomstring = require("randomstring");
var session = require('express-session')
var bodyParser = require('body-parser');

//
//Startup
//
var app = express();
var apiRoutes = express.Router();

//Verify Config File
var configFilePath = path.join(__dirname, "Config/config.json");
if (fs.existsSync(configFilePath))
{
	var config = fs.readFileSync(configFilePath, "utf8");
	config = JSON.parse(config);
}
else config = {};
var requiredConfigParams = ["version", "OrganizationName", "QuickAddress", "adminUserName", "adminUserSalt", "adminUserPasswordHash", "ChromeExtensionUrl", "androidAppUrl", "iosAppUrl", "AllHostingScreenFromServer"];
for (var i=0; i<requiredConfigParams.length; i++)
{
	if (!(requiredConfigParams[i] in config))
		config[requiredConfigParams[i]] = null;
}
fs.writeFileSync(path.join(__dirname, "Config/config.json"), JSON.stringify(config));

//Make sure certificates exists
var tlsKeyPath = path.join(__dirname, "Config/server.key");
var tlsCertPath =  path.join(__dirname, "Config/server.crt");
var tlsOptions = {};
if (!fs.existsSync(tlsKeyPath) || !fs.existsSync(tlsCertPath))
{
	pem.createCertificate({ days: 1024, selfSigned: true}, function(err, keys)
	{
		msg.logDebug("SSL Certificate could not be found, generating self-signed certificates");
		tlsOptions.key = keys.serviceKey;
		tlsOptions.cert = keys.certificate;
		initializeServer();
	});
}
else
{
	tlsOptions.key = fs.readFileSync(tlsKeyPath);
	tlsOptions.cert = fs.readFileSync(tlsCertPath);
	initializeServer();
}

function initializeServer()
{
	function verifyAuthentication(req, res, next)
	{
		if (req.url.startsWith("/admin") && (!req.session || !req.session.authenticated))
			return res.redirect("/login");
		next();
	}

	apiRoutes.get("/admin", function(req, res){
		var config = fs.readFileSync(path.join(__dirname, "Config/config.json"), "utf8");
		config = JSON.parse(config);
		var html = "<html><body><form method='POST'>";
		
		for(var eachItem in config)
			html += "<span>" + eachItem + "</span><input type='text' name='" + eachItem + "' value='" + (config[eachItem] || "") + "' /><br />";
		html += "<button type=submit>Save</button></form>"
		html += "<a href='/admin/Client/Screen'>Download Screen Script</a>"
		html += "</body></html>"
		res.send(html);
	});
	apiRoutes.post("/admin", function(req, res){
		var config = fs.readFileSync(path.join(__dirname, "Config/config.json"));
		try {config = JSON.parse(config);} catch(err) {return res.sendStatus(403);}

		if (!req.body)
			return res.sendStatus(200);

		for (var eachParam in req.body)
			config[eachParam] = req.body[eachParam];

		fs.writeFileSync(path.join(__dirname, "Config/config.json"), JSON.stringify(config));
		res.sendStatus(200);
	});
	apiRoutes.get("/login", function(req,res){
		var html = "<html><body><form method='POST'>";
		html += "<input type='text' name='username' /><input type='password' name='password' /><button type='submit'>Login</button>";
		html += "</form></body></html>"
		res.send(html);
	});
	apiRoutes.post("/login", function(req, res){
		var config = fs.readFileSync(path.join(__dirname, "Config/config.json"));
		config = JSON.parse(config);

		if (!req.body.username)
			return res.send("Unauthorized");
		if (config.adminUserName && (req.body.username !== config.adminUserName))
			return res.send("Unauthorized");
		if ((!config.adminUserName) && (req.body.username !== "admin"))
			return res.send("Unauthorized");
		if (config.adminUserPasswordHash && ((!req.body.password) || crypto.createHash("sha512").update(adminUserSalt + req.body.password) !== config.adminUserPasswordHash))
			return res.send("Unauthorized");

		req.session.authenticated = true;
		return res.redirect('/admin'); 
	});
	app.get("/admin/Client/Screen", function(req, res)
	{
		var filePath = path.join(__dirname, "../Clients/Packages/Screen_" + info.version + ".tar.gz");
		if (fs.existsSync(filePath))
			return res.download(filePath, "Screen_" + info.version + ".tar.gz");

		tar.c({gzip: true, file: filePath}, [path.join(__dirname, "../Clients/Screen/")]).then(() => {
			return res.download(filePath, "Screen_" + info.version + ".tar.gz");
		}); 
	});

	app.get("/Version", function(req,res){
		res.send(info.version);
	});
	app.use(express.static(path.join(__dirname, 'Public')));
	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(session({ secret: randomstring.generate(), resave: true, saveUninitialized: false}));
	app.use(verifyAuthentication);
	app.use(apiRoutes);
	startServer();
}
function startServer()
{
	var server = https.createServer(tlsOptions, app).listen(443, function() 
	{
		var wss = new ws.Server(
		{
	    	server : server,
	    	path : '/one2many'
		});

		wss.on('connection', function(ws)
		{
				var sessionId = onNewConnection(ws);
			    ws.on('error', function(error) {msg.logDebug('Connection ' + sessionId + ' error', null, 2); rooms.stop(sessionId);});
			    ws.on('close', function(error) {msg.logDebug('Connection ' + sessionId + ' closed', null, 2); rooms.stop(sessionId);});


			    ws.on('message', function(_message) {
					try {var message = JSON.parse(_message);} catch(err) {return msg.logDebug("Unable to parse message. " + message);}

					switch (message.id) 
					{
						case 'screen':
							rooms.addScreen(sessionId, ws, message.roomNameArray);
							break;
						case 'presenter':
							
							if (message.sdpOffer && message.roomNameArray && message.securityCode)
								rooms.startPresenter(sessionId, ws, message.sdpOffer, message.roomNameArray, message.securityCode);
							else if (message.roomNameArray && message.roomNameArray.length == 4)
								rooms.showSecurityCode(ws, message.roomNameArray);
							else
								rooms.listRooms(ws, message.roomNameArray);
							break;

						case 'viewer':
							rooms.startViewer(sessionId, ws, message.sdpOffer, message.roomNameArray);
							break;
						case 'look': //used to watch a screen:
							rooms.startLooker(sessionId, ws, message.sdpOffer, message.roomNameArray, message.securityCode);
							break;
						case 'stop':
							rooms.stop(sessionId);
							break;

						case 'onIceCandidate':
							rooms.onIceCandidate(sessionId, message.candidate);
							break;

						default:
							msg.sendMessage('error', {message: "Invalid message " + message}, ws);
							break;
			        }
			    });
		});
	});
}





var sessionCounter = 0;
function onNewConnection(ws)
{
	sessionCounter++;
	rooms.addNewConnection(sessionCounter, ws);
    msg.logDebug("New Connection: " + sessionCounter.toString());
    return sessionCounter.toString();
}