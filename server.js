'use strict';

var Base = require('./base');
var Hoek = require('hoek');
var Util = require('util');
var WebSocket = require('ws');
var logger = require('debug')('json-rpc-ws');

/**
 * json-rpc-ws server
 *
 * @constructor
 * @public
 */
var Server = function Server () {

    logger('new Server');
    this.type = 'server';
    Base.call(this);
};

Util.inherits(Server, Base);

/**
 * Start the server
 *
 * @param {Object} options - optional options to pass to the ws server.
 * @param {function} callback - optional callback which is called once the server has started listening.
 * @public
 */
Server.prototype.start = function start (options, callback) {

    logger('Server start');
    this.server = WebSocket.createServer(options);
    if (typeof callback === 'function') {
        this.server.once('listening', callback);
    }
    this.server.on('connection', this.connected.bind(this));
};


/**
 * Stop the server
 *
 * @todo param {function} callback - called after the server has stopped
 * @public
 */
Server.prototype.stop = function stop () {

    logger('stop');
    this.hangup();
    if (this.server) {
        this.server.close();
        this.server = null;
    }
};

module.exports = Server;
