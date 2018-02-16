var securityCodeTextbox;
var foundSecurityCode;
function enterSecurityCode()
{
	var htmlContainer = showSection("securityCode");
	htmlContainer.innerHTML = "<h3>Type in the access code, shown on the screen</h3>";

	securityCodeTextbox = document.createElement("input");
	securityCodeTextbox.type = "text";
	securityCodeTextbox.placeholder = "Access Code";
	securityCodeTextbox.addEventListener("keyup", function(e)
	{
		if (e.keyCode == 13)
			beforeValidateSecurityCode();
	});
	
	htmlContainer.appendChild(securityCodeTextbox);
	htmlContainer.appendChild(whereToLook(enterSecurityCode));

	var hr = document.createElement("hr");
	htmlContainer.appendChild(hr);
	var button = createButton("Verify Code", beforeValidateSecurityCode);
	htmlContainer.appendChild(button);
	securityCodeTextbox.focus();
}
function beforeValidateSecurityCode()
{
	foundSecurityCode = securityCodeTextbox.value.trim();
	initiateViewing();
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