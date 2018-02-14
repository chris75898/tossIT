var kurentoTools = require("./kurentoTools.js");
var deviceObjects = require('./objects.js');
var msg = require("./messaging.js");

exports.addScreen = function(sessionId, ws, roomNameArray)
{
    var currentRoom = deviceObjects.addNewRoom(roomNameArray, sessionId, ws);;
    msg.logDebug("New Screen Connected " + (roomNameArray || []).join(", "), null, 0);
    if (deviceObjects.isRoomPresenting(roomNameArray))
        iniateScreenViewing(roomNameArray);
}
function iniateScreenViewing(roomNameArray)
{
    var currentRoom = deviceObjects.getRoom(roomNameArray);
    if (!currentRoom)
        return;
    if (!deviceObjects.isRoomPresenting(roomNameArray))
        return;
    if (currentRoom.screenWs)
        msg.sendMessage("Start_Viewing", {}, currentRoom.screenWs);
}
exports.listRooms = function(ws, roomNameArray)
{
    if (!roomNameArray)
        msg.sendMessage("ListScreens", deviceObjects.listRooms(), ws);
    else
        msg.sendMessage("ListScreens", deviceObjects.listRooms(roomNameArray[0], roomNameArray[1], roomNameArray[2], roomNameArray[3]), ws);
}
exports.showSecurityCode = function(ws, roomNameArray)
{
    var roos = deviceObjects.getRooms(roomNameArray);
    if (roos.length == 0)
        return;

    for (var i=0; i<roos.length; i++)
    {
        var securityCode = deviceObjects.getSecurityCode(roos[i].roomNameArray);
        msg.sendMessage("DisplaySecurityCode", {securityCode: securityCode}, roos[i].screenWs);
    }
}
exports.addNewConnection = function(sessionId, ws)
{
    deviceObjects.addNewConnection(ws, sessionId);
}
function getConnection(sessionId)
{
    return deviceObjects.getConnection(sessionId);
}
function clearCandidatesQueue(sessionId) 
{
    var con = getConnection(sessionId);
    if (!con)
        return;

    con.candidatesQueue = [];
}
function processCandidateQueue(sessionId, webRtcEndpoint /*need to look this up*/)
{
    var con = getConnection(sessionId);
    if (!con)
        return;

    while(con.candidatesQueue.length) 
    {
        var candidate = con.candidatesQueue.shift();
        webRtcEndpoint.addIceCandidate(candidate);
    }
}
function storePresenter(sessionId, pipeline, webRtcEndpoint, roomNameArray)
{
    var roos = deviceObjects.getRooms(roomNameArray);
    var con = getConnection(sessionId);
    if (!con)
        return;
    for (var i=0; i<roos.length; i++)
    {
        roos[i].presenterPipeline = pipeline;
        roos[i].presenterWebRtcEndpoint = webRtcEndpoint;
        roos[i].presenterSessionId = sessionId;

        con.presentingRoomObj.push(roos[i]);
        iniateScreenViewing(roos[i].roomNameArray);
    }

    storeViewer(sessionId, pipeline, webRtcEndpoint)
}
function storeViewer(sessionId, pipeline, webRtcEndpoint, roomObject)
{
    var con = getConnection(sessionId);
    if (!con)
        return;
    con.webRtcPipeline = pipeline;
    con.webRtcEndpoint = webRtcEndpoint;

    if (roomObject)
    {
        roomObject.viewerSessionIds.push(sessionId);
        con.viewingRoomObj = roomObject;
    }
}
exports.startPresenter = async function(sessionId, ws, sdpOffer, roomNameArray, securityCode)
{
    //Make sure room exists, nobody is presenting, and access code is valid
    var roos = deviceObjects.getRooms(roomNameArray);
    
    var validRoos = [];
    for (var i=0; i<roos.length; i++)
    {
        if (deviceObjects.isRoomPresenting(roos[i].roomNameArray))
            continue;
        validRoos.push(roos[i]);
    }
    //only one accessCode needs to be valid
    var securityCodeValid = false;
    for (var i=0; i<validRoos.length; i++)
    {
        if (deviceObjects.isSecurityCodeValid(validRoos[i].roomNameArray, securityCode, true))
            securityCodeValid = true;
    }

    if (validRoos.length == 0 || (!securityCodeValid))
        return msg.sendMessage("presenterResponse", {response : 'rejected', message: "Access code is invalid"}, ws);

    roomNameArray = [validRoos[0].roomNameArray[0], validRoos[0].roomNameArray[1], validRoos[0].roomNameArray[2], []];
    for (var i=0; i<validRoos.length; i++)
        roomNameArray[3].push(validRoos[i].roomNameArray[3]);

    clearCandidatesQueue(sessionId);

    //Pipeline
    try {var pipeline = await kurentoTools.createMediaPipeline();} catch(err) 
    {
        msg.logDebug("Unable to create media pipeline for " + sessionId, null, 2);
        return msg.sendMessage("presenterResponse", {response : 'rejected', message: "Unable to build connection"}, ws);
    }

    //Endpoint
    try {var webRtcEndpoint = await kurentoTools.createWtcEndPoint(pipeline);} catch(err)
    {
        msg.logDebug("Unable to create wtc end point for " + sessionId, null, 2);
        return msg.sendMessage("presenterResponse", {response : 'rejected', message: "Unable to build connection"}, ws);
    }

    storePresenter(sessionId, pipeline, webRtcEndpoint, roomNameArray)
    processCandidateQueue(sessionId, webRtcEndpoint);

    webRtcEndpoint.on('OnIceCandidate', async function(event) {
        var candidate = await kurentoTools.getComplexType(event.candidate);
        msg.sendMessage("iceCandidate", {candidate: candidate}, ws);
    });
    
    //Process Offer
    try {var sdpAnswer = await kurentoTools.processOffer(webRtcEndpoint, sdpOffer);} catch(err)
    {
        msg.logDebug("Unable to process offer for " + sessionId, null, 2);
        return msg.sendMessage("presenterResponse", {response : 'rejected', message: "Unable to build connection"}, ws);
    }
    msg.sendMessage("presenterResponse", {response: "accepted", sdpAnswer:sdpAnswer}, ws);
				
    webRtcEndpoint.gatherCandidates(function(error) {
        if (error) {
            //stop(sessionId);
            return msg.sendMessage("presenterResponse", {response : 'rejected', message: "Unable to build connection"}, ws);
        }
    });
}

exports.stop = function(sessionId)
{
    stop(sessionId);
}
function stop(sessionId) 
{
    var con = getConnection(sessionId);
    if (!con) return;

    //If this is a presenter
    for (var r=0; r<con.presentingRoomObj.length; r++)
    {
        if (con.presentingRoomObj[r].presenterSessionId != sessionId)
            continue;

        //Go through all viewers
        for (var v=0; v<con.presentingRoomObj[r].viewerSessionIds.length; v++)
        {
            var currentCon = getConnection(con.presentingRoomObj[r].viewerSessionIds[v]);
            if (currentCon.ws) 
                msg.sendMessage("stopCommunication", {}, currentCon.ws);
            currentCon.viewingRoomObj = null;
            currentCon.webRtcEndpoint.release();
            currentCon.webRtcEndpoint = null;
            currentCon.webRtcPipeline = null;
        }
        con.presentingRoomObj[r].viewerSessionIds = [];
        try {con.presentingRoomObj[r].presenterPipeline.release();} catch(err) {msg.logDebug("Unable to release pipleine", 2, 1);}
        
        msg.sendMessage("Stop_Viewing", {}, con.presentingRoomObj[r].screenWs);

        con.presentingRoomObj[r].presenterPipeline = null;
        con.presentingRoomObj[r].presenterWebRtcEndpoint = null;
        con.presentingRoomObj[r].presenterSessionId = null;
        con.presentingRoomObj[r] = null;
    }

    //If viewer 
    if (con.viewingRoomObj)
    {
        con.viewingRoomObj.viewerSessionIds.splice(con.viewingRoomObj.viewerSessionIds.indexOf(sessionId));
        con.viewingRoomObj = null;
        con.webRtcEndpoint.release();
        con.webRtcEndpoint = null;
        con.webRtcPipeline = null;
    }

	clearCandidatesQueue(sessionId);
}
var viewers = [];
exports.onIceCandidate = async function(sessionId, _candidate) 
{
    var con = getConnection(sessionId);
    if (!con) return msg.logDebug("Unable to find Connection for " + sessionId, null, 2);

    var roo = null;
    //if presenting
    if (con.presentingRoomObj.length > 0)
        roo = con.presentingRoomObj[0];
    //if viewing
    else if (con.viewingRoomObj)
        roo = con.viewingRoomObj;
        
    var candidate = await kurentoTools.getComplexType(_candidate)
  
    if (roo && roo.presenterSessionId === sessionId && roo.presenterWebRtcEndpoint) {
        console.info('Sending presenter candidate');
        roo.presenterWebRtcEndpoint.addIceCandidate(candidate);
    }
    else if (con && con.webRtcEndpoint) {
        console.info('Sending viewer candidate');
        con.webRtcEndpoint.addIceCandidate(candidate);
    }
    else {
        console.info('Queueing candidate');
    
        if (!con.candidatesQueue)
            con.candidatesQueue = [];
        con.candidatesQueue.push(candidate);
    }
}
exports.startLooker = async function(sessionId, ws, sdpOffer, roomNameArray, securityCode) 
{
    clearCandidatesQueue(sessionId);

    var roos = deviceObjects.getRooms(roomNameArray);
    var con = getConnection(sessionId);

    if (!con)
        return msg.sendMessage("viewerResponse", {response : 'rejected', message: "Unable to find user session"}, ws);

    if (roos.length != 1)
        return msg.sendMessage("viewerResponse", {response : 'rejected', message: "Screen does not exist"}, ws);
    var roo = roos[0];
    if (!deviceObjects.isRoomPresenting(roo.roomNameArray))
        return msg.sendMessage("viewerResponse", {response : 'rejected', message: "Screen is not currently presenting"}, ws);

    if (!deviceObjects.isSecurityCodeValid(roo.roomNameArray, securityCode, false))
        return msg.sendMessage("viewerResponse", {response : 'rejected', message: "Access Code is not valid"}, ws);

    try {var webRtcEndpoint = await kurentoTools.createWtcEndPoint(roo.presenterPipeline);} catch(err)
    {
        msg.logDebug("Unable to create viewer wtc end point for " + sessionId, null, 2);
        return msg.sendMessage("viewerResponse", {response : 'rejected', message: "Unable to establish connection"}, ws);
    }
    
    con.webRtcEndpoint = webRtcEndpoint;
    storeViewer(sessionId, roo.presenterPipeline, webRtcEndpoint, roo);

    processCandidateQueue(sessionId, webRtcEndpoint);
    webRtcEndpoint.on('OnIceCandidate', async function(event) {
        var candidate = await kurentoTools.getComplexType(event.candidate);
        msg.sendMessage('iceCandidate', {candidate: candidate}, ws);
    });

    try {var sdpAnswer = await kurentoTools.processOffer(webRtcEndpoint, sdpOffer);} catch(err)
    {
        msg.logDebug("Unable to process viewer sdpOffer for " + sessionId, null, 2);
        return msg.sendMessage("viewerResponse", {response : 'rejected', message: "Unable to establish connection"}, ws);
    }

    try {await kurentoTools.connectToWtcEndPoint(roo.presenterWebRtcEndpoint, webRtcEndpoint);} catch(err) 
    {
        stop(sessionId);
        return msg.sendMessage("viewerResponse", {response : 'rejected', message: "Unable to establish connection"}, ws);
    }

	msg.sendMessage("viewerResponse", {response : 'accepted', sdpAnswer: sdpAnswer}, ws);
	webRtcEndpoint.gatherCandidates(function(error) {
        if (error) {
            stop(sessionId);
            return msg.sendMessage("viewerResponse", {response : 'rejected', message: "Unable to establish connection"}, ws);
        }
    });
}
exports.startViewer = async function(sessionId, ws, sdpOffer, roomNameArray) {
    clearCandidatesQueue(sessionId);
    
    var roo = deviceObjects.getRoom(roomNameArray);
    var con = getConnection(sessionId);
    if ((!roo) || (!con))
    {
		stop(sessionId);
		return msg.sendMessage("viewerResponse", {response : 'rejected', message: "There is no presenter in this room"}, ws);
    }

    try {var webRtcEndpoint = await kurentoTools.createWtcEndPoint(roo.presenterPipeline);} catch(err)
    {
        msg.logDebug("Unable to create viewer wtc end point for " + sessionId, null, 2);
        return msg.sendMessage("viewerResponse", {response : 'rejected', message: "Unable to establish connection"}, ws);
    }

    con.webRtcEndpoint = webRtcEndpoint;
    storeViewer(sessionId, roo.presenterPipeline, webRtcEndpoint, roo);
    processCandidateQueue(sessionId, webRtcEndpoint);
    webRtcEndpoint.on('OnIceCandidate', async function(event) {
        var candidate = await kurentoTools.getComplexType(event.candidate);
        msg.sendMessage('iceCandidate', {candidate: candidate}, ws);
    });

    try {var sdpAnswer = await kurentoTools.processOffer(webRtcEndpoint, sdpOffer);} catch(err)
    {
        msg.logDebug("Unable to process viewer sdpOffer for " + sessionId, null, 2);
        return msg.sendMessage("viewerResponse", {response : 'rejected', message: "Unable to establish connection"}, ws);
    }

    try {await kurentoTools.connectToWtcEndPoint(roo.presenterWebRtcEndpoint, webRtcEndpoint);} catch(err) 
    {
        stop(sessionId);
        return msg.sendMessage("viewerResponse", {response : 'rejected', message: "Unable to establish connection"}, ws);
    }

	msg.sendMessage("viewerResponse", {response : 'accepted', sdpAnswer: sdpAnswer}, ws);
	webRtcEndpoint.gatherCandidates(function(error) {
        if (error) {
            stop(sessionId);
            return msg.sendMessage("viewerResponse", {response : 'rejected', message: "Unable to establish connection"}, ws);
        }
    });
}