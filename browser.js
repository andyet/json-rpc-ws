'use strict';

var BrowserClient = require('./lib/browser');
var Errors = require('./lib/errors');
var logger = require('debug')('json-rpc-ws');

var JsonRpcWs = {
  Client: BrowserClient,
  Errors: Errors
};

/**
 * Create a new json-rpc websocket connection
 *
 * @returns {Object}JsonRpcWs Client instance
 * @public
 */
JsonRpcWs.createClient = function createClient() {

  logger('createClient');
  return new JsonRpcWs.Client();
};

module.exports = JsonRpcWs;
