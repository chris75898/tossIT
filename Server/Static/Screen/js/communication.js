
function communicationEstablished()
{
    ws.onmessage = onReceivedMessage;
    sendMessage2("screen", {"roomNameArray": roomName});
    readyToDisplay();
}

function onReceivedMessage(message)
{
    console.log("Received Message: ", message);

    var message = JSON.parse(message.data);
    switch (message.id) 
    {
        case 'DisplaySecurityCode':
            showSecurity(message.securityCode);
            break;
        case 'Start_Viewing':
            initiateViewing();
            break;
        case 'Stop_Viewing':
            readyToDisplay();
            break;
        case 'viewerResponse':
		    viewerResponse(message.sdpAnswer);
            startReceivingVideo();
            break;
        case 'iceCandidate':
            webRtcPeer.addIceCandidate(message.candidate);
            break;
        case 'stopCommunication':
		    dispose();
            break;
        default:
            console.error('Unrecognized message', message);
    }
}

