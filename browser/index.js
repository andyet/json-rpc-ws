/**
 * Browser test code
 * We use assert here just to throw on errors so we have
 * at least some assurance that the code's working
 */

var JsonRpcWs = require('../browser');
var browserClient = JsonRpcWs.createClient();

browserClient.expose('info', function info (params, reply) {

    reply(null, 'browser');
});

window.browserClient = browserClient;
