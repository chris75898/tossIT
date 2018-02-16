var foundBuildingName;
var foundDepartmentName;
var foundRoomName;
var foundScreens;
function getBuildings()
{
	var htmlContainer = showSection("viewOptions");
	htmlContainer.innerHTML = "";
	htmlContainer.appendChild(getLoadingObject());

	htmlContainer.innerHTML = "<h3>Choose your Building</h3>";
	ListScreens();
}
function showBuildings(buildingList)
{
	var htmlContainer = showSection("viewOptions");
	htmlContainer.innerHTML = "<h3>Choose your Building</h3>";
	

	if (buildingList.length == 0)
		return htmlContainer.appendChild(whenNoItemsExist("buildings"));

	
	for (var i=0; i<buildingList.length; i++)
	{
		var btn = createButton(buildingList[i], getDepartments);
		htmlContainer.appendChild(btn);
	}
	htmlContainer.appendChild(whereToLook(getBuildings));
}
function getDepartments(buildingName)
{
	foundBuildingName = buildingName;

	var htmlContainer = showSection("viewOptions");
	htmlContainer.innerHTML = "<h3>Choose your Department</h3>";
	htmlContainer.appendChild(getLoadingObject());

	ListScreens([foundBuildingName]);
}
function showDepartments(listOfDepartments)
{
	var htmlContainer = showSection("viewOptions");
	htmlContainer.innerHTML = "<h3>Choose your Department</h3>";

	if (listOfDepartments.length == 0)
		return htmlContainer.appendChild(whenNoItemsExist("departments"));

	for (var i=0; i<listOfDepartments.length; i++)
	{
		var btn = createButton(listOfDepartments[i], getRooms);
		htmlContainer.appendChild(btn);
	}
	htmlContainer.appendChild(whereToLook(function() {getDepartments(foundBuildingName);}));
}
function getRooms(departmentName)
{
	foundDepartmentName = departmentName;

	var htmlContainer = showSection("viewOptions");
	htmlContainer.innerHTML = "<h3>Choose your Room</h3>";
	htmlContainer.appendChild(getLoadingObject());

	ListScreens([foundBuildingName, foundDepartmentName]);
}
function showRooms(listOfRooms)
{
	var htmlContainer = showSection("viewOptions");
	htmlContainer.innerHTML = "<h3>Choose your Room</h3>";

	if (listOfRooms.length == 0)
		return htmlContainer.appendChild(whenNoItemsExist("rooms"));

	for (var i=0; i<listOfRooms.length; i++)
	{
		var btn = createButton(listOfRooms[i], getScreens);
		htmlContainer.appendChild(btn);
	}
	htmlContainer.appendChild(whereToLook(function() {getRooms(foundDepartmentName);}));
}
function getScreens(roomName)
{
	foundRoomName = roomName;

	var htmlContainer = showSection("viewOptions");
	htmlContainer.innerHTML = "<h3>Choose your Screen</h3>";
	htmlContainer.appendChild(getLoadingObject());

	ListScreens([foundBuildingName, foundDepartmentName, foundRoomName]);
}
function showScreens(listOfScreens)
{
	var htmlContainer = showSection("viewOptions");
	htmlContainer.innerHTML = "<h3>Choose your Screen</h3>";

	if (listOfScreens.length == 0)
		return htmlContainer.appendChild(whenNoItemsExist("screens"));

	for (var eachScreen in listOfScreens)
	{
		if (listOfScreens[eachScreen].isPresenting)
		{
			var btn = createButton("Screen #" + eachScreen, beforePresenting);
			htmlContainer.appendChild(btn);
		}
	}
	for (var eachScreen in listOfScreens)
	{
		if (!listOfScreens[eachScreen].isPresenting)
		{
			var btn = createButton("Screen #" + eachScreen + "\nNot Presenting", null);
			btn.style.cursor = "default";
			htmlContainer.appendChild(btn);
		}
	}

	htmlContainer.appendChild(whereToLook(function() {getScreens(foundRoomName);}));

}
function beforePresenting(name)
{
	var htmlContainer = showSection("viewOptions");

	foundScreens = [name.substr(8)];
	ShowSecurityCode(foundBuildingName, foundDepartmentName, foundRoomName, foundScreens);
	enterSecurityCode();
}

function whenNoItemsExist(itemName)
{
	var elm = document.createElement("h4");
	elm.innerText = "Sorry, no " + itemName + " can be found. Try again later.";
	return elm;
}
function whereToLook(returnFunction)
{
	var returnFunction = returnFunction;
	var hlp = document.createElement("div");
	hlp.innerText = "Where do I find this?";
	hlp.classList.add("helpButton");
	hlp.addEventListener("click", function()
	{
		hlp.innerHTML = "<h3>Help</h3>"
		var htmlContainer = showSection("viewOptions");
		htmlContainer.innerText = "Look in the bottom-left corner of the screen.";
		var img = document.createElement("img");
		img.src="example.png";
		img.style.display = "block";
		img.style.marginLeft = "auto";
		img.style.marginRight = "auto";
		img.style.width = "25%";
		img.style.marginTop = "10px";
		img.style.border = "solid lightgray 3px";
		img.style.borderRadius = "3px";
		htmlContainer.appendChild(img);
		
		var returnButton = createButton("Go Back", returnFunction);
		returnButton.style.marginTop = "15px";
		htmlContainer.appendChild(returnButton);
	});

	return hlp;
}