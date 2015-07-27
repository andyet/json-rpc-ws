'use strict';
var Client = require('./lib/client');
var Server = require('./lib/server');
var Errors = require('./lib/errors');
var logger = require('debug')('json-rpc-ws');

/*!
 * json-rpc-ws: a node.js json-rpc websocket client
 * Copyright(c) 2015 Andyet <howdy@andyet.com>
 * MIT Licensed
 */

var JsonRpcWs = {
    Server: Server,
    Client: Client,
    Errors: Errors
};

/**
 * Create a new server.
 *
 * @returns {Object} JsonRpcWs Server instance
 * @public
 */
JsonRpcWs.createServer = function createServer () {

    logger('createServer');
    return new JsonRpcWs.Server();
};


/**
 * Create a new json-rpc websocket connection
 *
 * @returns {Object}JsonRpcWs Client instance
 * @public
 */
JsonRpcWs.createClient = function createClient () {

    logger('createClient');
    return new JsonRpcWs.Client();
};

module.exports = JsonRpcWs;
