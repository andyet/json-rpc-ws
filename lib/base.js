'use strict';
var logger = require('debug')('json-rpc-ws');
var Connection = require('./connection');

/**
 * Base functionality shared by client and server
 *
 * @constructor
 * @public
 */
var Base = function Base() {

  this.requestHandlers = {};
  this.connections = {};
};

/**
 * Add a handler function for a given method
 *
 * @param {String} method - name of the method to add handler for.
 * @param {function} handler - function to be passed params for given method.
 * @todo enforce handler w/ two-param callback
 * @public
 */
Base.prototype.expose = function expose(method, handler) {

  logger('registering handler for %s', method);
  if (this.requestHandlers[method]) {
    throw Error('cannot expose handler, already exists ' + method);
  }
  this.requestHandlers[method] = handler;
};

/**
 * Connected event handler
 *
 * @param {Object} socket - new socket connection
 * @private
 */
Base.prototype.connected = function connected(socket) {

  logger('%s connected', this.type);
  var connection = new Connection(socket, this);
  this.connections[connection.id] = connection;
};

/**
 * Disconnected event handler
 *
 * @param {Object} connection - connection object that has been closed
 * @private
 */
Base.prototype.disconnected = function disconnected(connection) {

  logger('disconnected');
  delete this.connections[connection.id];
};

/**
 * Test if a handler exists for a given method
 *
 * @param {String} method - name of method
 * @returns {Boolean} whether or not there are any handlers for the given method
 * @public
 */
Base.prototype.hasHandler = function hasHandler(method) {

  if (this.requestHandlers[method] !== undefined) {
    return true;
  }
  return false;
};

/**
 * Get handler for a given method
 *
 * @param {String} method - name of method
 * @returns {Array}  - handler for given method
 * @public
 */
Base.prototype.getHandler = function getHandler(method) {

  return this.requestHandlers[method];
};

/**
 * Get a connection by id
 *
 * @param {id} id - id of the connection to get
 * @returns {Connection} - Connection
 * @public
 */
Base.prototype.getConnection = function getConnection(id) {

  return this.connections[id];
};

/**
 * Shut down all existing connections
 *
 * @public
 */
Base.prototype.hangup = function hangup() {

  logger('hangup');
  var connections = Object.keys(this.connections);
  connections.forEach(function hangupConnection(id) {

    this.connections[id].close();
    delete this.connections[id];
  }, this);
};

module.exports = Base;
