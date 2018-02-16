function communicationEstablished()
{
    ws.onmessage = onReceivedMessage;
    readyToDisplay();
}
function onReceivedMessage(message)
{
    console.log("Received Message: ", message);
    var message = JSON.parse(message.data);

    switch (message.id) 
    {
        case 'ListScreens':
        	if (message.type.toLowerCase() == "building")
            	showBuildings(message.screens);
            else if (message.type.toLowerCase() == "department")
            	showDepartments(message.screens);
            else if (message.type.toLowerCase() == "room")
            	showRooms(message.screens);
            else if (message.type.toLowerCase() == "screen")
            	showScreens(message.screens);
            break;
        case 'iceCandidate':
            webRtcPeer.addIceCandidate(message.candidate);
            break;
        case 'viewerResponse':
		    viewerResponse(message.sdpAnswer);
            startReceivingVideo();
            break;

        case 'error':
            displayError(message.message);
            break;
        case 'presenting':
            currentlyPresenting();
            break;
        default:
            console.error('Unrecognized message', message);
            break;
    }
}
function ListScreens(roomNameArray)
{
    sendMessage2("presenter", {roomNameArray: roomNameArray});
}
function ShowSecurityCode(buildingName, department, room, listOfScreens)
{
    sendMessage2("presenter", {roomNameArray: [foundBuildingName, foundDepartmentName, foundRoomName, foundScreens]});
}
