'use strict';

var Base = require('./base');
var Connection = require('./connection');
var Errors = require('./errors');
var Util = require('util');
var WebSocket = require('ws');
var logger = require('debug')('json-rpc-ws');

/**
 * json-rpc-ws server
 *
 * @constructor
 * @extends {Base}
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
    this.server = new WebSocket.Server(options);
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

    logger('Server stop');
    this.hangup();
    this.server.close();
    this.server = null;
};

/**
 * Send a method request through a specific connection
 *
 * @param {String} id - connection id to send the request through
 * @param {String} method - name of method
 * @param {Array} params - optional parameters for method
 * @param {replyCallback} callback - optional reply handler
 * @public
 */
Server.prototype.send = function send (id, method, params, callback) {

    logger('Server send %s %s', id, method);
    var connection = this.getConnection(id);
    if (connection) {
        connection.sendMethod(method, params, callback);
    } else if (typeof callback === 'function') {
        callback(Errors('serverError').error);
    }
};

module.exports = Server;
