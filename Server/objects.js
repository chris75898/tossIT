var msg = require("./messaging.js");

var connections = {};
var rooms = {};

exports.addNewConnection = function(ws, sessionId)
{
    connections[sessionId] = {viewingRoomObj:null,presentingRoomObj:[], ws: ws, remoteScreen:null, candidatesQueue:[], webRtcEndpoint:null, webRtcPipeline:null};
}
exports.getConnection = function(sessionId)
{
    return connections[sessionId];
}
exports.addNewRoom = function(roomArray, screenSessionId, screenWs)
{
    if (roomArray.length != 4)
        return;

    var buildingName = roomArray[0];
    var departmentName = roomArray[1];
    var roomName = roomArray[2];
    var deviceNumber = roomArray[3];

    if (!(buildingName in rooms))
        rooms[buildingName] = {};
    var buildingObject = rooms[buildingName];
    if (!(departmentName in buildingObject))
        buildingObject[departmentName] = {};
    var departmentObject = buildingObject[departmentName];
    if (!(roomName in departmentObject))
        departmentObject[roomName] = {};
    var roomObject = departmentObject[roomName];
    if (deviceNumber in roomObject)
    {
        roomObject[deviceNumber].screenSessionId = screenSessionId;
        roomObject[deviceNumber].screenWs = screenWs;
    }
    else
        roomObject[deviceNumber] = {screenSessionId: screenSessionId, screenWs: screenWs, screenSecurityCode: null, viewerSessionIds : [], presenterPipeline: null, presenterWebRtcEndpoint: null, presenterSessionId: null, roomNameArray: roomArray};
    return roomObject[deviceNumber];
}
exports.getSecurityCode = function(roomArray)
{
    var roo = exports.getRoom(roomArray);
    if (roo == null)
        return null;
    if (roo.screenSecurityCode == null)
        roo.screenSecurityCode = generateSecurityCode();
    return roo.screenSecurityCode;
}
function generateSecurityCode()
{

    var text = "";
    var possible = "ABCDEFGHJKMNPRTUVWXY346789";
    for (var i = 0; i < 4; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}
exports.isSecurityCodeValid = function(roomArray, securityCode, generateNewCodeOnValid)
{
    var roo = exports.getRoom(roomArray);
    if (!roo)
        return false;
    var isValid = false;
    if ((securityCode || "").toLowerCase() == (roo.screenSecurityCode || "").toLowerCase())
        isValid = true;
    if (generateNewCodeOnValid === true)
        roo.screenSecurityCode = generateSecurityCode();
    return isValid;
}
exports.isRoomPresenting = function(roomArray)
{
    var room = exports.getRoom(roomArray);
    if (room == null)
        return false;
    if (!room.presenterSessionId)
        return false;
    if (!(room.presenterSessionId in connections))
        return false;
    if (!room.presenterPipeline)
        return false;
    if (!room.presenterWebRtcEndpoint)
        return false;
    return true;
}
exports.listRooms = function(building, department, room, deviceId)
{
    if (!building)
    {
        var validBuildings = [];
        for (var eachBuilding in rooms)
        {
            if (Object.keys(exports.listRooms(eachBuilding).screens).length > 0)
                validBuildings.push(eachBuilding);
        }
        return {type: 'building', screens: validBuildings};
    }
    else if (!department)
    {
        var validDepartments = [];
        for (var eachDepartment in rooms[building])
        {
            if (Object.keys(exports.listRooms(building, eachDepartment).screens).length > 0)
                validDepartments.push(eachDepartment);
        }
        return {type: 'department', screens: validDepartments};
    }
    else if (!room)
    {
        var validRooms = [];
        for (var eachRoom in rooms[building][department])
        {
            if (Object.keys(exports.listRooms(building, department, eachRoom).screens).length > 0)
                validRooms.push(eachRoom);
        }
        return {type: 'room', screens: validRooms}
    }
    else if (!deviceId)
    {
        var returnObject = {type: "screen", screens: {}};
        for (var eachDevice in rooms[building][department][room])
            if (rooms[building][department][room][eachDevice].screenWs && rooms[building][department][room][eachDevice].screenWs.readyState == rooms[building][department][room][eachDevice].screenWs.OPEN)
            returnObject["screens"][eachDevice] = {isPresenting: exports.isRoomPresenting([building,department,room,eachDevice])}
        return returnObject;
    }
    return [];
}
exports.getRooms = function(roomArray)
{
    try
    {
        var returnArray = [];
        var building = rooms[roomArray[0]];
        var department = building[roomArray[1]];
        var room = department[roomArray[2]]

        if ((!roomArray[3]) || (typeof roomArray[3] != "object") || roomArray[3].length == 0)
            return returnArray;
        
        for (var i=0; i<roomArray[3].length; i++)
        {
            var currentRoom = room[roomArray[3][i]];
            if (currentRoom == undefined)
                continue;
            returnArray.push(currentRoom);
        }
        return returnArray;
    } catch(err) 
    {
        msg.logDebug("Error getting rooms: " + roomArray, 1, 2);
        return [];
    }
    
}

exports.getRoom = function(roomArray)
{
    try 
    {
        var one = rooms[roomArray[0]];
        var two = rooms[roomArray[0]][roomArray[1]];
        var three = rooms[roomArray[0]][roomArray[1]][roomArray[2]];
        var four = rooms[roomArray[0]][roomArray[1]][roomArray[2]][roomArray[3]];

        return four;
    } catch(err)
    {return null;}
}