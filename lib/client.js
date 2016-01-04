'use strict';

var WebSocket = require('ws');

module.exports = require('./shared_client')(WebSocket, false);
