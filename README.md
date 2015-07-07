#json-rpc-ws

A websocket transport for json-rpc.  Allows for asynchronous
bi-directional requests and responses.

Method handlers are registered via the `expose` method.  Results are
routed through id via the callback passed to the `send` method.
