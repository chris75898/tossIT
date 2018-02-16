function showSecurity(securityCode)
{
    document.getElementById("securityCodeValue").innerText = securityCode;
    document.getElementById("securityCode").style.display = "block";

    window.setTimeout(function() {document.getElementById("securityCode").style.display = "none";}, 30000);
}

function viewerResponse(message) 
{
    webRtcPeer.processAnswer(message)
}

function initiateViewing() {
    var options = 
        {
            remoteVideo: document.getElementById("videoScreen"),
            onicecandidate : onIceCandidate
        }

    webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function(error) 
    {
        if(error) return onError(error);
        this.generateOffer(onOfferViewer);
    });
}
function onOfferViewer(error, offerSdp) 
{
	if (error) return onError(error)
	sendMessage2("viewer", {sdpOffer: offerSdp, roomNameArray: roomName});
}
function onIceCandidate(candidate) 
{
    console.log('Local candidate' + JSON.stringify(candidate));
    sendMessage2("onIceCandidate", {candidate: candidate});
}

function dispose() 
{
    if (webRtcPeer) {
		webRtcPeer.dispose();
		webRtcPeer = null;
	}
}

