var uuid = require('uuid').v4;
var logger = require('debug')('json-rpc-ws');
var Hoek = require('hoek');

/**
 * Quarantined JSON.parse try/catch block in its own function
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
 * json-rpc-ws connection
 *
 * @constructor
 * @param {Object} parent that controls this connection
 * @param {Socket} web socket
 */
var Connection = function Connection (socket, parent) {

    logger('new Connection %s', parent.type);
    this.id = uuid();
    this.socket = socket;
    this.parent = parent;
    this.responseHandlers = {}; //Response callbacks indexed by id
    this.socket.on('message', this.message.bind(this));
    this.socket.once('close', this.close.bind(this));
};

/*
 * http://www.jsonrpc.org/specification#error_object
 */
Connection.errors = {
    parseError: { code: -32700, message: 'Parse error' },
    invalidRequest: { code: -32600, message: 'Invalid Request' },
    methodNotFound: { code: -32601, message: 'Method not found' },
    invalidParams: { code: -32602, message: 'Invalid params' },
    internalError: { code: -32603, message: 'Internal error' },
    serverError: { code: -32000, message: 'Server error' }
};

/**
 * Send json payload to the socket connection
 *
 * @params {Object} payload to be stringified
 */
Connection.prototype.sendRaw = function sendRaw (payload) {
    //TODO make sure this.connection exists, is connected
    //TODO validate payload

    this.socket.send(JSON.stringify(payload));
};

/**
 * Send a result message
 *
 * @param {String} Id for the message
 * @param {Object} Error for the message
 * @param {String} Result for the message
 * @api private
 *
 */
Connection.prototype.sendResult = function sendResult (id, error, result) {

    Hoek.assert(error || result, 'Must have an error or a result.');
    Hoek.assert(id || error, 'Results must have an id or an error');
    Hoek.assert( !( error && result ), 'Cannot have both an error and a result');

    return this.sendRaw({
        jsonrpc: '2.0',
        id: id,
        result: result,
        error: error
    });
};

/**
 * Send a method message
 *
 * @param {String} method for the message
 * @param {Array} params for the message
 * @param {function} Optional callback for a reply from the message
 */
Connection.prototype.sendMethod = function sendMethod (method, params, callback) {

    var id = uuid();
    logger('sendMethod %s', method, id);

    if (callback) {
        this.responseHandlers[id] = callback;
    }
    this.sendRaw({
        jsonrpc: '2.0',
        id: id,
        method: method,
        params: params || []
    });
};

/**
 * Send an error message
 *
 * @param {Object} error object (See Connection.errors)
 */
Connection.prototype.sendError = function sendError (error) {

    return this.sendResult(null, error);
};

/*
 * Called when socket gets 'close' event
 */
Connection.prototype.close = function close () {

    logger('close');
    this.parent.disconnected(this); //Tell parent what went on so it can track connections
    delete this.socket;
};

/**
 * Hang up the current socket
 *
 * @api public
 */
Connection.prototype.hangup = function hangup () {

    logger('hangup');
    if (this.socket) {
        this.socket.close();
    }
};

/**
 * Incoming message handler
 *
 * @params {string} message from the websocket
 * @api private
 */
Connection.prototype.message = function message (data) {

    logger('message');
    var payload = jsonParse(data);

    if (payload === null) {
        return this.sendError(Connection.errors.parseError);
    }
    if (!payload.id && !payload.error) {
        return this.sendError(Connection.errors.invalidRequest);
    }
    if (payload.result || payload.error) {
        logger('message result %s id %s error %s', payload.result, payload.id, payload.error);
        if (!payload.id) {
            return;
        }
        var responseHandler = this.responseHandlers[payload.id];
        if (!responseHandler) {
            return this.sendError(Connection.errors.invalidRequest);
        }
        delete this.responseHandlers[payload.id];
        return responseHandler(payload.error, payload.result);
    }
    if (!payload.method) {
        return this.sendError(Connection.errors.invalidRequest);
    }
    logger('message method %s', payload.method);
    if (!this.parent.hasHandler(payload.method)) {
        return this.sendError(Connection.errors.methodNotFound);
    }
    if (payload.params && (!payload.params instanceof Array)) {
        return this.sendError(Connection.errors.invalidParams);
    }
    var params = payload.params || [];
    var handlers = this.parent.getHandlers(payload.method);
    var handlerCount = handlers.length;
    var handler;
    var handlerCallback = function handlerCallback (err, result) {

        logger('handler got callback %s, %s', err, result);
        return this.sendResult(payload.id, err, result);
    }.bind(this);
    for (var handlerIndex = 0; handlerIndex < handlerCount; handlerIndex++) {
        logger('calling handler %s', payload.method);
        handler = handlers[handlerIndex];
        handler(params, handlerCallback);
    }
};


module.exports = Connection;
