
window.onbeforeunload = function() 
{
	ws.close();
}
function tryConnect()
{
    showSection("connecting"); 
    //hideStaticContainer("titlePage");
    ws = new WebSocket('wss://edi-staff1.janesville.k12.wi.us/one2many');
    ws.onerror = function() {try {ws.close()} catch(err) {console.log(err)}};;
    ws.onclose = function() {ws = null; tryConnect();}
    ws.onopen = function() {setTimeout(communicationEstablished, 2000);}
}
function readyToDisplay()
{
    showStaticContainer("titlePage");
    showSection("viewOptions");
    getBuildings();
}
function startReceivingVideo()
{
    document.getElementById("videoScreen").style.display = "inline-block";
    document.getElementById("titlePage").style.display = "none";
}
function sendMessage2(messageId, otherAttributes)
{
	var jsonMessage = {id: messageId};
	for (var eachAttribute in otherAttributes)
		jsonMessage[eachAttribute] = otherAttributes[eachAttribute];
	ws.send(JSON.stringify(jsonMessage));;
}