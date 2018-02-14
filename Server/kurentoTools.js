var kurento = require('kurento-client');
var ws_uri = 'ws://localhost:8888/kurento';
var kurentoClient = null;

function getKurentoClient()
{
    return new Promise(function(resolve, reject) 
    {
        if (kurentoClient !== null)
            return resolve(kurentoClient);

        kurento(ws_uri, function(err, _kurentoClient){
            if (err)
                return reject("Could not find media server at address" + ws_uri + ". Exiting with error " + err);
            kurentoClient = _kurentoClient;
            resolve(kurentoClient);
        })
    });
}

exports.createMediaPipeline = function()
{
    return new Promise(async function(resolve, reject) 
    {
        try {var kClient = await getKurentoClient();} catch(err) {console.log(err); return reject(err);}

        kClient.create('MediaPipeline', function(err, pipeline)
        {
            if (err)
            {
                console.log(err);
                return reject(err);
            }
            resolve(pipeline);
        });
    })
}

exports.createWtcEndPoint = function(pipeline)
{
    return new Promise(function(resolve, reject) 
    {
        pipeline.create('WebRtcEndpoint', function(error, webRtcEndpoint) 
        {
            if (error)
            {
                console.log(error);
                return reject(error);
            }
            resolve(webRtcEndpoint);
        });
    });
}

exports.processOffer = function(wtcEndPoint, sdpOffer)
{
    return new Promise(function(resolve, reject) 
    {
        wtcEndPoint.processOffer(sdpOffer, function(err, sdpAnser)
        {
            if (err)
            {
                console.log(err);
                return reject(err);
            }
            resolve(sdpAnser);
        });
    });
}

exports.getComplexType = function(candidate)
{
    return kurento.getComplexType('IceCandidate')(candidate);
}

exports.connectToWtcEndPoint = function(presenterEndpoint, viewerEndpoint)
{
    return new Promise(function(resolve, reject) 
    {
    presenterEndpoint.connect(viewerEndpoint, function(err){
        if (err)
        {console.log(err); reject(err);}
        resolve();
    });
    });
}