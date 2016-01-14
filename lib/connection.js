var uuid = require('uuid').v4;
var logger = require('debug')('json-rpc-ws');
var Errors = require('./errors');
var Assert = require('assert');

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
 * Socket onclose handler for browser WebSocket
 */
var socketClosed = function socketClosed () {

    this.socket.onclose = undefined;
    this.close();
};

/**
 * Socket onerror handler for browser WebSocket
 */
var socketError = function socketError () {

    this.socket.onerror = undefined;
    this.close();
};

/**
 * json-rpc-ws connection
 *
 * @constructor
 * @param {Socket} socket - web socket for this connection
 * @param {Object} parent - parent that controls this connection
 */
var Connection = function Connection (socket, parent) {

    logger('new Connection to %s', parent.type);
    this.id = uuid();
    this.socket = socket;
    this.parent = parent;
    this.responseHandlers = {};
    if (this.parent.browser) {
        this.socket.onmessage = this.message.bind(this)
        this.socket.onclose = socketClosed.bind(this);
        this.socket.onerror = socketError.bind(this);
    } else {
        this.socket.on('message', this.message.bind(this));
        this.socket.once('close', this.close.bind(this));
        this.socket.once('error', this.close.bind(this));
    }
};

/**
 * Send json payload to the socket connection
 *
 * @param {Object} payload - data to be stringified
 * @private
 * @todo validate payload
 * @todo make sure this.connection exists, is connected
 * @todo if we're not connected look up the response handler from payload.id
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
        if (params !== undefined && params !== null && typeof params !== 'object') {
            return this.sendError('invalidRequest', id, { info: 'params, if provided, must be one of: null, object, array' });
        }
        logger('message method %s', payload.method);
        if (id === null || id === undefined) {
            return handler.call(this, params, emptyCallback);
        }
        var handlerCallback = function handlerCallback (err, reply) {

            logger('handler got callback %j, %j', err, reply);
            return this.sendResult(id, err, reply);
        };
        return handler.call(this, params, handlerCallback.bind(this));
    }
    // needs a result or error at this point
    if (result === undefined && error === undefined) {
        return this.sendError('invalidRequest', id, { info: 'replies must have either a result or error' });
    }
    if (typeof id === 'string' || typeof id === 'number') {
        logger('message id %s result %j error %j', id, result, error);
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
 * @param {String|Object|Array|Number} result - result for the message
 * @public
 *
 */
Connection.prototype.sendResult = function sendResult (id, error, result) {

    logger('sendResult %s %j %j', id, error, result);
    Assert(error || result, 'Must have an error or a result.');
    Assert( !( error && result ), 'Cannot have both an error and a result');

    var response = { id: id };

    if (result) {
        response.result = result;
    } else {
        response.error = error;
    }

    this.sendRaw(response);
};

/**
 * Send a method message
 *
 * @param {String} method - method for the message
 * @param {Array|Object|null} params  - params for the message
 * @param {function} callback - optional callback for a reply from the message
 * @public
 */
Connection.prototype.sendMethod = function sendMethod (method, params, callback) {

    var id = uuid();
    Assert((typeof method === 'string') && (method.length > 0), 'method must be a non-empty string');
    Assert(params === null || params === undefined || params instanceof Object, 'params, if provided,  must be an array, object or null');
    logger('sendMethod %s', method, id);
    if (callback) {
        this.responseHandlers[id] = callback;
    } else {
        this.responseHandlers[id] = emptyCallback;
    }
    var request = {
        id: id,
        method: method
    };

    if (params) {
        request.params = params;
    }

    this.sendRaw(request);
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
    if (this.parent.browser && error !== 1000) {
        logger('close error %s', error);
    } else if (!this.parent.browser && error) {
        logger('close error %s', error.stack || error);
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
    Assert(this.socket, 'Not connected');
    if (typeof callback === 'function') {
        if (this.parent.browser) {
            this.socket.onerror = function socketHangupError () {

                this.socket.onerror = undefined;
                callback();
            }.bind(this);
            this.socket.onclose = function socketHangupClose () {

                this.socket.onclose = undefined;
                callback();
            }.bind(this);
        } else {
            this.socket.once('error', callback);
            this.socket.once('close', callback);
        }
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
    logger('message %j', data);
    var payload;
    if (this.parent.browser) {
        payload = jsonParse(data.data);
    } else {
        payload = jsonParse(data);
    }

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
