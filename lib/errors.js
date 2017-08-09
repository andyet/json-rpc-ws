'use strict';

var logger = require('debug')('json-rpc-ws');
var assert = require('assert').ok;

/*
 * http://www.jsonrpc.org/specification#error_object
 */
var errors = {
  parseError: { code: -32700, message: 'Parse error' },
  invalidRequest: { code: -32600, message: 'Invalid Request' },
  methodNotFound: { code: -32601, message: 'Method not found' },
  invalidParams: { code: -32602, message: 'Invalid params' },
  internalError: { code: -32603, message: 'Internal error' },
  serverError: { code: -32000, message: 'Server error' }
};

/**
 * Returns a valid jsonrpc2.0 error reply
 *
 * @param {String} type - type of error
 * @param {Number|String|null} id - optional id for reply message
 * @param {Any} data - optional data attribute for error message
 * @returns {Object|null} mreply object that can be sent back
 */
module.exports = function getError(type, id, data) {

  assert(errors[type], 'Invalid error type ' + type);

  var payload = {
    error: errors[type]
  };
  if (typeof id === 'string' || typeof id === 'number') {
    payload.id = id;
  }
  if (data !== undefined) {
    payload.error.data = data;
  }
  logger('error %j', payload);
  return payload;
};
