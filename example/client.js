var JsonRpcWs = require('../');
var client = JsonRpcWs.createClient();
var logger = require('debug')('example');

client.connect('ws://localhost:8080', function connected () {

    client.send('mirror', ['a param', 'another param'], function mirrorReply (error, reply) {

        logger('mirror reply', reply);
    });
});
