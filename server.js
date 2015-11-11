var http = require('http');
var path = require('path');
var helpers = require("./helpers.js");
var EventEmitter = require("events").EventEmitter,
    events = new EventEmitter();
var server = http.createServer(function(req, res){
    var lookup = path.basename(decodeURI(req.url));
    //console.log(lookup, req.method);
    var stringConfig = "";
    req.on('data', function (chunk) {
        stringConfig += chunk;
    });
    var result = "";
    req.on('end', function() {
        switch(req.method) {
            case "POST": 
                switch(lookup) {
                    case "compile": 
                       result = helpers.compile(JSON.parse(stringConfig), events);
                    break;
                    case "init": 
                       result = helpers.init(JSON.parse(stringConfig), events);
                    break;
                    default:
                    console.error("404");
                }
            break;
            default:
            console.error("Request With " + req.method + " method is not supported");
        }
    });
    res.writeHead(200, {'content-type': 'text/plain'});
    events.on("operationsFinished", function (data) {
        res.end(data.message);
    });
    
}).listen(3000, null);
server.timeout = 320000;