'use strict';

var Base = require('./base');
var Connection = require('./connection');
var Util = require('util');
var WebSocket = window.WebSocket;
var logger = require('debug')('json-rpc-ws');
var assert = require('assert').ok;
var uuid = require('uuid').v4;
var Browser = require('./browser');

/**
 * json-rpc-ws client
 *
 * @param {Object} Parent object, used to find method handlers.
 * @param {Socket} Websocket connection.
 * @extends {Base}
 * @constructor
 */
var Client = function Client () {

    logger('new Client');
    this.type = 'client';
    this.id = uuid();
    if (Browser) {
        this.browser = true;
    }
    Base.call(this);
};

Util.inherits(Client, Base);

/**
 * Connect to a json-rpc-ws server
 *
 * @param {String} address - url to connect to i.e. `ws://foo.com/`.
 * @param {function} callback - optional callback to call once socket is connected
 * @public
 */
Client.prototype.connect = function connect (address, callback) {

    logger('Client connect %s', address);
    assert(!this.isConnected(), 'Already connected');
    var self = this;
    var opened = false;
    var errored = false;
    this.socket = new WebSocket(address);
    if (this.browser) {
        this.socket.onerror = function onerror (err) {

            if (!opened && callback) {
                self.socket.onopen = undefined;
                callback(err);
            }
        };
        this.socket.onopen = function onopen () {

            opened = true;
            self.socket.onopen = undefined;
            self.connected(this);
            if (callback) {
                callback();
            }
        };
    } else {
        this.socket.once('open', function clientConnected () {

            // The client connected handler runs scoped as the socket so we can pass
            // it into our connected method like thisk
            self.connected(this);
        });
        if (callback) {
            this.socket.once('open', function socketOpen () {

                opened = true;
                callback.apply(this, arguments);
            });
            this.socket.once('error', function socketError (e) {

                if (!opened) {
                    callback.apply(this, arguments);
                }
            });
        }
    }
};

/**
 * Test whether we have a connection or not
 *
 * @returns {Boolean} whether or not we have a connection
 * @public
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
 * @returns {Object} current connection
 * @public
 */
Client.prototype.getConnection = function getConnection () {

    var ids = Object.keys(this.connections);
    return this.connections[ids[0]];
};


/**
 * Close the current connection
 *
 * @param {function} callback - called when the connection has been closed
 * @public
 */
Client.prototype.disconnect = function disconnect (callback) {

    assert(this.isConnected(), 'Not connected');
    var connection = this.getConnection();
    connection.hangup(callback);
};

/**
 * Send a method request
 *
 * @param {String} method - name of method
 * @param {Array} params - optional parameters for method
 * @param {function} callback - optional reply handler
 * @public
 * @todo allow for empty params aka arguments.length === 2
 */
Client.prototype.send = function send (method, params, callback) {

    logger('send %s', method);
    assert(this.isConnected(), 'Not connected');
    var connection = this.getConnection();
    connection.sendMethod(method, params, callback);
};

module.exports = Client;
