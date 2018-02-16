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
var requiredConfigParams = [];
requiredConfigParams["OrganizationName"] = {label: "Organization's Name", defaultValue: "", isHidden: false, type: "text"};
requiredConfigParams["QuickAddress"] = {label: "Shortened Url", defaultValue: "", isHidden: false, type: "text"};
requiredConfigParams["adminUserName"] = {label: "Admin Username", defaultValue: "admin", isHidden: false, type: "text"};
requiredConfigParams["adminUserSalt"] = {defaultValue: "", isHidden: true, type: "text"};
requiredConfigParams["adminUserPasswordHash"] = {label: "Admin Password", defaultValue: "", isHidden: false, type: "password"};
requiredConfigParams["ChromeExtensionUrl"] = {label: "Chrome App Url", defaultValue: "", isHidden: false, type: "text"};
requiredConfigParams["androidAppUrl"] = {label: "Android App Url", defaultValue: "", isHidden: false, type: "text"};
requiredConfigParams["iosAppUrl"] = {label: "iOS App Url", defaultValue: "", isHidden: false, type: "text"};
requiredConfigParams["AllowAnonymousScreenAccess"] = {label: "Allow Anonymous Screen Access", defaultValue: false, isHidden: false, type: "checkbox"};
for (var eachConfig in requiredConfigParams)
{
	if (!(eachConfig in config))
		config[eachConfig] = requiredConfigParams[eachConfig];;
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
		{
			if (config[eachItem].isHidden)
				continue;
			html += "<span>" + (config[eachItem].label || eachItem) + "</span><input style='padding-left: 10px' type='" + config[eachItem].type + "' " + ((config[eachItem].type == "checkbox" && config[eachItem].value) ? "checked" : "") + " name='" + eachItem + "' value='" + (config[eachItem].value || config[eachItem].defaultValue || "") + "' /><br />";
		}
		html += "<button type=submit>Save</button></form>"
		html += "<a href='/admin/Client?type=Screen'>Download Screen Script</a><br />"
		html += "<a href='/admin/Client?type=Chrome'>Download Chrome Extension</a><br />"
		html += "<a href='/admin/Client?type=Android'>Download Android App</a><br />"
		html += "<a href='/admin/Client?type=iOS'>Download iOS App</a><br />"
		html += "</body></html>"
		res.send(html);
	});
	apiRoutes.post("/admin", function(req, res){
		var config = fs.readFileSync(path.join(__dirname, "Config/config.json"), "utf8");
		try {config = JSON.parse(config);} catch(err) {return res.sendStatus(403);}

		if (!req.body)
			return res.sendStatus(200);

		var allowAnonymousScreenAccess = false;
		for (var eachParam in req.body)
		{
			if (!(eachParam in config))
				config[eachParam] = {value: req.body[eachParam], defaultValue: "", isHidden: false, type: "string"};

			if (eachParam == "QuickAddress")
			{
				config[eachParam].value = req.body[eachParam]; 
				updateClientConfigurations("QuickAddress", req.body[eachParam]);
			}
			else if (eachParam == "adminUserPasswordHash")
			{
				if (config.adminUserPasswordHash.value == req.body[eachParam] || req.body[eachParam].trim() == "")
					continue;
				config.adminUserSalt.value = crypto.randomBytes(32).toString("hex"); 
				config.adminUserPasswordHash.value = getHash(config, req.body[eachParam]);
			}
			else if (eachParam == "AllowAnonymousScreenAccess")
				allowAnonymousScreenAccess = true;
			else
				config[eachParam].value = req.body[eachParam];
		}
		config["AllowAnonymousScreenAccess"].value = allowAnonymousScreenAccess;
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
		if (req.body.username !== (config.adminUserName.value || config.adminUserName.defaultValue))
			return res.send("Unauthorized");
		var validHash = config.adminUserPasswordHash.value || config.adminUserPasswordHash.defaultValue;
		if (validHash.length > 0 && getHash(config, req.body.password) !== validHash)
			return res.send("Unauthorized");

		req.session.authenticated = true;
		return res.redirect('/admin'); 
	});
	app.get("/admin/Client", function(req, res)
	{
		if (!("type" in req.query))
			return res.sendStatus(400);
		var allowedTypes = ["chrome", "screen", "ios", "android"];
		if (allowedTypes.indexOf(req.query.type.toLowerCase()) == -1)
			return res.sendStatus(400);
		var currentType = req.query.type.charAt(0).toUpperCase() + req.query.type.slice(1).toLowerCase();
		var filePath = path.join(__dirname, "../Clients/Packages/" + currentType + "_" + info.version + ".tar.gz");
		if (fs.existsSync(filePath))
			return res.download(filePath, currentType + "_" + info.version + ".tar.gz");

		tar.c({gzip: true, file: filePath}, [path.join(__dirname, "../Clients/Screen/")]).then(() => {
			return res.download(filePath, currentType + "_" + info.version + ".tar.gz");
		}); 
	});

	app.get("/Version", function(req,res){
		res.send(info.version);
	});
	
	app.use(express.static(path.join(__dirname, 'Public')));

	var config = fs.readFileSync(path.join(__dirname, "Config/config.json"), "utf8");
	config = JSON.parse(config);
	if (config.AllowAnonymousScreenAccess.value === true)
		app.use("/Screen", express.static(path.join(__dirname, '../Client/Screen')));

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



function updateClientConfigurations(key, value)
{
	var listOfClients = ["Screen"];

	for (var i=0; i<listOfClients.length; i++)
	{
		var configLocation = path.join(__dirname, "../Clients", listOfClients[i], "config.json");
		if (!fs.existsSync(configLocation))
			var config = {};
		else
			var config = JSON.parse(fs.readFileSync(configLocation, "utf8"));

		config.key = value;
		fs.writeFileSync(configLocation, JSON.stringify(config));
	}
}
function getHash(config, password)
{
	var salt = config.adminUserSalt.value || config.adminUserSalt.defaultValue || "";
	var testingPassword = password || "";
	return crypto.createHash("sha512").update(salt + password).digest("hex");
}
var sessionCounter = 0;
function onNewConnection(ws)
{
	sessionCounter++;
	rooms.addNewConnection(sessionCounter, ws);
    msg.logDebug("New Connection: " + sessionCounter.toString());
    return sessionCounter.toString();
}