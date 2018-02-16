window.onload = pageStart;

function pageStart()
{
    
    document.getElementById("viewRemoteScreenButton").addEventListener("click", function(){tryConnect();})
    document.getElementById("presentMyScreenButton").addEventListener("click", function(){showSection("presentOptions")})
    document.getElementById("computerDownloadApp").addEventListener("click", function(){window.location.href = "https://chrome.google.com/webstore/detail/tossit/dohegojhkafhijjjllmncafadffohfhp?utm_source=chrome-ntp-icon&authuser=2";})

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

}
function showSection(name)
{
    var allActive = document.getElementsByClassName("active");
    for (var i=0; i<allActive.length; i++)
    {
        if (allActive[i].id != name)
            allActive[i].classList.remove("active");
    }

    var elm = document.getElementById(name);
    elm.classList.add("active");
    return elm;
}
function hideStaticContainer(name)
{
    document.getElementById(name).style.display = "none";
}

function showStaticContainer(name)
{
    document.getElementById(name).style.display = null;
}