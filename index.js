'use strict';
var Client = require('./client');
var Server = require('./server');
var logger = require('debug')('json-rpc-ws');

/*!
 * json-rpc-ws: a node.js json-rpc websocket client
 * Copyright(c) 2015 Andyet <howdy@andyet.com>
 * MIT Licensed
 */

var JsonRpcWs = {
    Server: Server,
    Client: Client
};

/**
 * Create a new server.
 *
 * @returns {JsonRpcWs.Server}
 */
JsonRpcWs.createServer = function createServer () {

    logger('createServer');
    return new JsonRpcWs.Server();
};


/**
 * Create a new json-rpc websocket connection
 *
 * @returns {JsonRpcWs.Client}
 */
JsonRpcWs.createClient = function createClient () {

    logger('createClient');
    return new JsonRpcWs.Client();
};

module.exports = JsonRpcWs;
