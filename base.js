'use strict';
var logger = require('debug')('json-rpc-ws');
var Connection = require('./connection');

/**
 * Base functionality shared by client and server
 *
 * @constructor
 * @api public
 */
var Base = function Base () {

    this.requestHandlers = {};
    this.connections = {};
};

/**
 * Add a handler function for a given method
 *
 * @param {String} method name.
 * @param {function} handler to be passed params for given method.
 * @api public
 */
Base.prototype.expose = function expose (method, handler) {

    logger('registering handler for %s', method);
    if (!this.requestHandlers[method]) {
        this.requestHandlers[method] = [];
    }
    this.requestHandlers[method].push(handler.bind(this));
};

/**
 * Connected event handler
 *
 * @param {Object} socket object
 * @api private
 */
Base.prototype.connected = function connected (socket) {

    logger('%s connected', this.type);
    var connection = new Connection(socket, this);
    this.connections[connection.id] = connection;
};

/**
 * Disconnected event handler
 *
 * @param {Object} connection object
 * @api private
 */
Base.prototype.disconnected = function disconnected (connection) {

    logger('disconnected');
    delete this.connections[connection.id];
};

/**
 * Test if a handler exists for a given method
 *
 * @param {String} method to test
 * @returns {Boolean} whether or not there are any handlers for the given method
 * @api public
 */
Base.prototype.hasHandler = function hasHandler (method) {

    if (this.requestHandlers[method] !== undefined) {
        return true;
    }
    return false;
};

/**
 * Get handlers for a given method
 *
 * @param {String} method name
 * @returns {Array|undefined} handlers for given method, if any
 */
Base.prototype.getHandlers = function getHandler (method) {

    return this.requestHandlers[method];
};

/**
 * Shut down all existing connections
 *
 * @api public
 */
Base.prototype.hangup = function hangup () {

    logger('hangup');
    var connections = Object.keys(this.connections);
    connections.forEach(function hangupConnection (id) {

        this.connections[id].close();
        delete this.connections[id];
    });
};

module.exports = Base;
