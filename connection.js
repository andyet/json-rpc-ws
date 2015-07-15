var uuid = require('uuid').v4;
var logger = require('debug')('json-rpc-ws');
var Errors = require('./errors');
var assert = require('assert').ok;

/**
 * Quarantined JSON.parse try/catch block in its own function
 *
 * @param {String} data - json data to be parsed
 * @returns {Object} Parsed json data
 */
var jsonParse = function jsonParse (data) {

    var payload;
    try {
        payload = JSON.parse(data);
    } catch (error) {
        logger(error);
        payload = null;
    }
    return payload;
};

/**
 * JSON spec requires a reply for every request, but our lib doesn't require a
 * callback for every sendMethod. We need a dummy callback to throw into responseHandlers
 * for when the user doesn't supply callback to sendMethod
 */
var emptyCallback = function emptyCallback () {

    logger('emptycallback');
};

/**
 * json-rpc-ws connection
 *
 * @constructor
 * @param {Socket} socket - web socket for this connection
 * @param {Object} parent - parent that controls this connection
 */
var Connection = function Connection (socket, parent) {

    logger('new Connection %s', parent.type);
    this.id = uuid();
    this.socket = socket;
    this.parent = parent;
    this.responseHandlers = {}; //Response callbacks indexed by id
    this.socket.on('message', this.message.bind(this));
    this.socket.once('close', this.close.bind(this));
    this.socket.once('error', this.close.bind(this));
};

/**
 * Send json payload to the socket connection
 *
 * @param {Object} payload - data to be stringified
 * @private
 * @todo make sure this.connection exists, is connected
 * @todo validate payload
 */
Connection.prototype.sendRaw = function sendRaw (payload) {

    payload.jsonrpc = '2.0';
    this.socket.send(JSON.stringify(payload));
};

/**
 * Validate payload as valid jsonrpc 2.0
 * http://www.jsonrpc.org/specification
 * Reply or delegate as needed
 *
 * @param {Object} payload - payload coming in to be validated
 * @returns {void}
 */
Connection.prototype.processPayload = function processPayload (payload) {

    var version = payload.jsonrpc;
    var id = payload.id;
    var method = payload.method;
    var params = payload.params;
    var result = payload.result;
    var error = payload.error;
    if (version !== '2.0') {
        return this.sendError('invalidRequest', id, { info: 'jsonrpc must be exactly "2.0"' });
    }
    //Will either have a method (request), or result or error (response)
    if (typeof method === 'string') {
        var handler = this.parent.getHandler(method);
        if (!handler) {
            return this.sendError('methodNotFound', id, { info: 'no handler found for method ' + method });
        }
        if (id !== undefined && id !== null && typeof id !== 'string' && typeof id !== 'number') {
            return this.sendError('invalidRequest', id, { info: 'id, if provided, must be one of: null, string, number' });
        }
        if (params !== null && typeof params !== 'object') {
            return this.sendError('invalidRequest', id, { info: 'params must be one of: null, object, array' });
        }
        logger('message method %s', payload.method);
        if (id === null || id === undefined) {
            return handler.call(this, params, emptyCallback);
        }
        var handlerCallback = function handlerCallback (err, reply) {

            logger('handler got callback %s, %s', err, reply);
            return this.sendResult(id, err, reply);
        }.bind(this);
        return handler.call(this, params, handlerCallback);
    }
    // needs a result or error at this point
    if (result === undefined && error === undefined) {
        return this.sendError('invalidRequest', id, { info: 'replies must have either a result or error' });
    }
    if (typeof id === 'string' || typeof id === 'number') {
        logger('message id %s result %s error %s', id, result, error);
        var responseHandler = this.responseHandlers[payload.id];
        if (!responseHandler) {
            return this.sendError('invalidRequest', id, { info: 'no response handler for id ' + id });
        }
        delete this.responseHandlers[payload.id];
        return responseHandler.call(this, error, result);
    }
};

/**
 * Send a result message
 *
 * @param {String} id - id for the message
 * @param {Object} error - error for the message
 * @param {String} result - result for the message
 * @public
 *
 */
Connection.prototype.sendResult = function sendResult (id, error, result) {

    logger('sendResult %s %j %j', id, error, result);
    assert(error || result, 'Must have an error or a result.');
    assert( !( error && result ), 'Cannot have both an error and a result');

    this.sendRaw({
        id: id,
        result: result,
        error: error
    });
};

/**
 * Send a method message
 *
 * @param {String} method - method for the message
 * @param {Array|null} params  - params for the message
 * @param {function} callback - optional callback for a reply from the message
 * @public
 */
Connection.prototype.sendMethod = function sendMethod (method, params, callback) {

    var id = uuid();
    assert((typeof method === 'string') && (method.length > 0), 'method must be a non-empty string');
    assert(params === null || params instanceof Array, 'params must be an array or null');
    logger('sendMethod %s', method, id);
    if (callback) {
        this.responseHandlers[id] = callback;
    } else {
        this.responseHandlers[id] = emptyCallback;
    }
    this.sendRaw({
        id: id,
        method: method,
        params: params
    });
};

/**
 * Send an error message
 *
 * @param {Object} error - json-rpc error object (See Connection.errors)
 * @param {String|Number|null} id - Optional id for reply
 * @param {Any} data - Optional value for data portion of reply
 * @public
 */
Connection.prototype.sendError = function sendError (error, id, data) {

    logger('sendError %s', error);
    //TODO if id matches a responseHandler, we should dump it right?
    this.sendRaw(Errors(error, id, data));
};

/**
 * Called when socket gets 'close' event
 *
 * @param {Error} error - optional error object of close wasn't expected
 * @private
 */
Connection.prototype.close = function close (error) {

    logger('close');
    if (error) {
        logger('close error', error.stack);
    }
    this.parent.disconnected(this); //Tell parent what went on so it can track connections
    delete this.socket;
};

/**
 * Hang up the current socket
 *
 * @param {function} callback - called when socket has been closed
 * @public
 */
Connection.prototype.hangup = function hangup (callback) {

    logger('hangup');
    assert(this.socket, 'Not connected');
    if (typeof callback === 'function') {
        this.socket.once('error', callback);
        this.socket.once('close', callback);
    }
    this.socket.close();
};

/**
 * Incoming message handler
 *
 * @param {String} data - message from the websocket
 * @returns {void}
 * @private
 */
Connection.prototype.message = function message (data) {

    //Validate as json first, easy reply if it's not
    //If it's an array iterate and handle
    //If it's an object handle
    //name of handle function ?!?!?
    logger('message');
    var payload = jsonParse(data);

    if (payload === null) {
        return Errors('parseError');
    }
    //Object or array
    if (payload instanceof Array) {
        payload.forEach(this.processPayload, this);
    } else {
        this.processPayload(payload);
    }
};

module.exports = Connection;
