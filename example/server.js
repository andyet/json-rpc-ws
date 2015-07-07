var JsonRpcWs = require('../');
var server = JsonRpcWs.createServer();
var logger = require('debug')('example');

server.expose('mirror', function mirror (params, reply) {

    logger('mirror handler', params);
    reply(null, params);
});

server.expose('delay', function delay (params, reply) {

    logger('delay handler', params);
    setTimeout(function delayedReply () {

        reply(null, params);
    }, 5000);
});

server.start({ port: 8080 }, function started () {

    logger('Server started');
});
