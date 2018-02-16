var securityCodeTimeout = null;
function showSecurity(securityCode)
{
    document.getElementById("securityCodeValue").innerText = securityCode;
    document.getElementById("securityCode").style.display = "block";

	clearTimeout(securityCodeTimeout);
    securityCodeTimeout = window.setTimeout(function() {hideSecurity()}, 30000);
}
function hideSecurity()
{
	document.getElementById("securityCode").style.display = "none";
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
	sendMessage2("look", {sdpOffer: offerSdp, roomNameArray: [foundBuildingName, foundDepartmentName, foundRoomName, foundScreens], securityCode: foundSecurityCode});
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
function createButton(name, destination)
{
	var destination = destination;
	var newButton = document.createElement("div");
	newButton.classList.add("button");
	newButton.innerText = name;
	newButton.addEventListener("click", function() {destination(name);});
	return newButton;
}
function createMultiSelect(name, disabled)
{
	var newButton = document.createElement("div");
	var isDisabled = (disabled == undefined || !disabled) ? false : true;
	newButton.classList.add( isDisabled ? "disabledButton" : "button");
	newButton.innerText = "Screen #" + name;
	newButton.setAttribute("screenName", name);
	if (!isDisabled)
		newButton.addEventListener("click", function() {newButton.classList.toggle("activeButton"); });
	return newButton;
}
function getLoadingObject()
{
	try {var found = document.getElementById("spinner");
	found.parentNode.removeChild(found);} catch(err) {}
	var div = document.createElement("div");
	div.id = "spinner";
	div.style.display = "none";
	setTimeout(function() {div.style.display = "block";}, 200);

	return div;
}
function createMultiSelect(name, disabled)
{
	var newButton = document.createElement("div");
	var isDisabled = (disabled == undefined || !disabled) ? false : true;
	newButton.classList.add( isDisabled ? "disabledButton" : "button");
	newButton.innerText = "Screen #" + name;
	newButton.setAttribute("screenName", name);
	if (!isDisabled)
		newButton.addEventListener("click", function() {newButton.classList.toggle("activeButton"); });
	return newButton;
}
function onError(errorMessage)
{
	console.error(errorMessage);
}

function startReceivingVideo()
{
	hideSecurity();
	var htmlContainer = showSection("videoContainer");
	hideStaticContainer("titlePage");
}
