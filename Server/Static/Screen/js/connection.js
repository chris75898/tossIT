var ws;
window.onload = function() 
{
    var qs = parse_query_string(window.location.search.substr(1));
    var qBuildingName = qs.building || "ESC";
    var qDepartmentName = qs.department || "IT Department";
    var qRoom = qs.room || "Back Office";
    var qScreen = qs.screen || Math.floor(Math.random()* 1000).toString();
    roomName = [qBuildingName, qDepartmentName, qRoom, qScreen];

    var vidScreen = document.getElementById("videoScreen");
    vidScreen.addEventListener("loadstart", function()
    {
        vidScreen.classList.add("loadingVideo");
    });
    vidScreen.addEventListener("canplay", function()
    {
        vidScreen.classList.remove("loadingVideo");
        vidScreen.setAttribute("poaster", "");
    });

    var devName = document.getElementById("deviceName");
    var tmpRoomName = roomName.slice();
    tmpRoomName[tmpRoomName.length - 1] =  "#" + tmpRoomName[tmpRoomName.length - 1];
    devName.innerHTML = tmpRoomName.join(", ");
    window.setTimeout(tryConnect, 3000);
}
function parse_query_string(query) {
    var vars = query.split("&");
    var query_string = {};
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split("=");
      // If first entry with this name
      if (typeof query_string[pair[0]] === "undefined") {
        query_string[pair[0]] = decodeURIComponent(pair[1]);
        // If second entry with this name
      } else if (typeof query_string[pair[0]] === "string") {
        var arr = [query_string[pair[0]], decodeURIComponent(pair[1])];
        query_string[pair[0]] = arr;
        // If third or later entry with this name
      } else {
        query_string[pair[0]].push(decodeURIComponent(pair[1]));
      }
    }
    return query_string;
  }
  
window.onbeforeunload = function() 
{
	ws.close();
}
function tryConnect()
{
    document.getElementById("connecting").style.display = "inline-block";
    document.getElementById("videoScreen").style.display = "none";
    document.getElementById("titlePage").style.display = "none";

    ws = new WebSocket('wss://' + window.location.host + '/one2many');
    ws.onerror = function() {try {ws.close()} catch(err) {console.log(err)}};;
    ws.onclose = function() {ws = null; tryConnect();}
    ws.onopen = function() {communicationEstablished();}
}
function readyToDisplay()
{
    document.getElementById("connecting").style.display = "none";
    document.getElementById("videoScreen").style.display = "none";
    document.getElementById("titlePage").style.display = "inline-block";
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