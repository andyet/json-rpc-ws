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
 * @api public
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
 * @param {Object} Optional options to pass to the ws server.
 * @param {function} optional Callback which is called once the server has started listening.
 * @api public
 */
Server.prototype.start = function start (options, callback) {

    logger('Server start - %s', options);
    this.server = WebSocket.createServer(options, callback);
    if (typeof callback === 'function') {
        this.server.once('listening', callback);
    }
    this.server.on('connection', this.connected.bind(this));
};


/**
 * Stop the server
 *
 * @param {function} callback to fire after the server has stopped
 * @api public
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
