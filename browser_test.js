/**
 * Browser test code
 * This code is browserified and sent to phantomjs
 * as part of the test suite, it is not part of the
 * library itself
 */

var JsonRpcWs = require('./browser');
var browserClient = JsonRpcWs.createClient();

Function.prototype.bind = require('function-bind');

browserClient.expose('info', function info (params, reply) {

    reply(null, 'browser');
});

window.browserClient = browserClient;
