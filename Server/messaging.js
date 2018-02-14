exports.logDebug = function(message, verboseLevel, errorLevel)
{
	if (errorLevel == 1)
		console.warn(message);
	else if (errorLevel == 2)
		console.error(message)
	else
		console.log(message);
}
exports.sendMessage = function(id, msgObject, ws)
{
	var sendObject = {id: id};
	for (var eachItem in msgObject)
		sendObject[eachItem] = msgObject[eachItem];
	try {ws.send(JSON.stringify(sendObject));} catch(err) {msg.logDebug("Unable to send message " + JSON.stringify(sendObject), 0, 2);}
}