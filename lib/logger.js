'use strict';

module.exports = function log(message) {
  if (process.env.debug === 'json-rpc-ws') {
    console.log(message);
  }
};
