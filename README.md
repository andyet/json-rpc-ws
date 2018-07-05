# json-rpc-ws

[![Greenkeeper badge](https://badges.greenkeeper.io/andyet/json-rpc-ws.svg)](https://greenkeeper.io/)

A websocket transport for json-rpc.  Allows for asynchronous
bi-directional requests and responses.

[![Build Status](https://travis-ci.org/andyet/json-rpc-ws.svg?branch=master)](https://travis-ci.org/andyet/json-rpc-ws)

--
Method handlers are registered via the `expose` method.  Results are
routed through id via the callback passed to the `send` method.

For a simple example see the files in `./example`

## How to Use

Note: [ws](https://github.com/websockets/ws) removed client code as of
1.0.0, so browser-based implementations of this work differently now

### Node

```
var JsonRpcWs = require('json-rpc-ws');

var server = JsonRpcWs.createServer();

server.expose('mirror', function mirror (params, reply) {

    console.log('mirror handler', params);
    reply(null, params);
});

server.start({ port: 8080 }, function started () {

    console.log('Server started on port 8080');
});
```

```
var JsonRpcWs = require('json-rpc-ws');
var client = JsonRpcWs.createClient();

client.connect('ws://localhost:8080', function connected () {

    client.send('mirror', ['a param', 'another param'], function mirrorReply (error, reply) {

        console.log('mirror reply', reply);
    });
});
```

### Browser

```
var JsonRpcWs = require('json-rpc-ws/browser');
var client = JsonRpcWs.createClient();

client.connect('ws://localhost:8080', function connected () {

    client.send('mirror', ['a param', 'another param'], function mirrorReply (error, reply) {

        console.log('mirror reply', reply);
    });
});
```

## API

### Server

`start(options)` - Start the server, options are passed straight into the [ws](http://npmjs.com/package/ws) server options. See the ws documentation for further info

### Client

`connect(url)` - Connect to given url (should start with ws:// or wss://). Like the server, this parameter is passed straight into a `ws` WebSocket object.

### Shared

Both the client and server have the following methods:

`expose(method, handler)` - Add a handler for a given named rpc method. Only one handler per method is allowed, as each request can only have one reply.  The handler will be passed two parameters, the parameters from the rpc call and a callback in which to send the response.  The callback takes two paramters `error` and `reply`.  Because this is json-rpc only one of error and reply can be non-null.

## License

MIT
