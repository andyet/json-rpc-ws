'use strict';

module.exports = function log() {
  if (process.env.debug === 'json-rpc-ws') {
    console.log.apply(console, arguments);
  }
};
