/*eslint func-names: 0, hapi/hapi-scope-start: 0*/

/*
 * This duplicates the logic in ws for determining whether or not we're
 * in a browser, which determined what our client object actually is.
 *
 * The original code overwrote global, which blew up lab, hence `globeal`
 */
var globeal = (function () { return this; })();
var WebSocket = globeal.WebSocket || globeal.MozWebSocket;

module.exports = WebSocket ? true : false;
