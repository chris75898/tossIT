var path = require('path');
var url = require('url');
var express = require('express');
var ws = require('ws');
var kurento = require('kurento-client');
var fs    = require('fs');
var https = require('https');
var msg = require("./messaging.js");
var rooms = require("./rooms.js");

//
//Startup
//
var app = express();

//Make sure certificates exists
var tlsKeyPath = "keys/server.key";
var tlsCertPath = "keys/server.crt";
var tlsOptions = {};
if (!fs.existsSync(tlsKeyPath) || !fs.existsSync(tlsCertPath))
{
	pem.createCertificate({ days: 1024, selfSigned: true}, function(err, keys){
		tlsOptions.key = keys.serviceKey;
		tlsOptions.cert = keys.certificate;
		startServer();
	});
}
else
{
	tlsOptions.key = fs.readFileSync(tlsKeyPath);
	tlsOptions.cert = fs.readFileSync(tlsCertPath);
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
		}
	}
}





var sessionCounter = 0;
function onNewConnection(ws)
{
	sessionCounter++;
	rooms.addNewConnection(sessionCounter, ws);
    msg.logDebug("New Connection: " + sessionCounter.toString());
    return sessionCounter.toString();
}

app.use(express.static(path.join(__dirname, 'Statics')));
