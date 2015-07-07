'use strict';
var Base = require('./base');
var Hoek = require('hoek');
var Util = require('util');
var WebSocket = require('ws');
var logger = require('debug')('json-rpc-ws');

/*
 * json-rpc-ws client
 *
 * @constructor
 * @param {Object} Parent object, used to find method handlers.
 * @param {Socket} Websocket connection.
 */
var Client = function Client () {

    logger('new Client');
    this.type = 'client';
    Base.call(this);
};

Util.inherits(Client, Base);

/**
 * Connect to a json-rpc-ws server
 *
 * @param {String} uri to connect to - example: `ws://foo.com/`.
 * @param {function} optional callback to call once socket is connected
 * @api public
 */
Client.prototype.connect = function connect (address, callback) {

    logger('Client connect %s', address);
    Hoek.assert(!this.isConnected(), 'Already connected');
    var self = this;
    this.socket = WebSocket.connect(address);
    this.socket.once('open', function clientConnected () {

        // The client connected handler runs scoped as the socket so we can pass
        // it into our connected method like this
        self.connected(this);
    });
    this.socket.once('open', callback);
};

/**
 * Test whether we have a connection or not
 *
 * @returns {Boolean} whether or not we have a connection
 * @api public
 */
Client.prototype.isConnected = function isConnected () {

    if (Object.keys(this.connections).length === 0) {
        return false;
    }
    return true;
};

/**
 * Return the current connection (there can be only one)
 *
 * @returns {JsonRpcWs.Connection}
 */
Client.prototype.getConnection = function getConnection () {

    var ids = Object.keys(this.connections);
    return this.connections[ids[0]];
};


/**
 * Close the current connection
 *
 * @api public
 */
Client.prototype.disconnect = function disconnect () {

    if (this.isConnected()) {
        this.socket.close();
    }
};

/**
 * Send a method request
 *
 * @param {String} method name
 * @param {Array} Optional params
 * @param {function} optional reply handler
 */
Client.prototype.send = function send (method, params, callback) {

    logger('send %s', method);
    Hoek.assert(this.isConnected(), 'Not connected');
    var connection = this.getConnection();
    connection.sendMethod(method, params, callback);
};

module.exports = Client;
