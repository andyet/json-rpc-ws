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
module.exports = function getError (type, id, data) {

    assert(errors[name], 'Invalid error type ' + type);

    var payload = {
        error: errors[name]
    };
    if (id !== null) {
        payload.id = id;
    }
    if (data !== null) {
        payload.error.data = data;
    }
    return data;
};
