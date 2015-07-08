/*eslint func-names: 0*/
var Code = require('code');
var Lab = require('lab');
var WS = require('ws');
var JsonRpcWs = require('../');

Code.settings.truncateMessages = false;
var lab = exports.lab = Lab.script();

lab.experiment('json-rpc ws', function () {

    var server = JsonRpcWs.createServer();
    var client = JsonRpcWs.createClient();
    var delayBuffer = [];

    lab.before(function (done) {

        server.expose('reflect', function (params, reply) {


            reply(null, params);
        });
        server.expose('delay', function (params, reply) {

            var last;
            if (delayBuffer.length > 0) {
                last = delayBuffer.pop();
                last[1](null, last[0][0]);
            }
            delayBuffer.push(arguments);
        });
        server.expose('error', function (params, reply) {

            reply('error', null);
        });

        server.start({ host: 'localhost', port: 8081 }, function () {

            client.connect('ws://localhost:8081', done);
        });
    });

    lab.after(function (done) {

        client.disconnect(function () {

            server.stop();
            done();
        });
    });

    lab.test('reflecting handler', function (done) {

        client.send('reflect', ['test one'], function (error, reply) {

            Code.expect(error).to.be.null();
            Code.expect(reply).to.have.length(1);
            Code.expect(reply[0]).to.equal('test one');
            done();
        });
    });

    lab.test('error reply', function (done) {

        client.send('error', null, function (error, reply) {

            Code.expect(reply).to.be.null();
            Code.expect(error).to.equal('error');
            done();
        });
    });

    lab.test('delay handler', function (done) {

        var counter = 0;
        client.send('delay', ['test one'], function (error, reply) {

            Code.expect(counter).to.equal(0);
            counter = counter + 1;
            Code.expect(reply).to.equal('test one');
        });
        client.send('delay', ['test two'], function (error, reply) {

            Code.expect(counter).to.equal(1);
            Code.expect(reply).to.equal('test two');
            done();
        });
        client.send('delay', ['test three']);
    });

    lab.test('cannot register duplicate handler', function (done) {

        Code.expect(function () {

            server.expose('reflect', function (params, reply) {

                reply();
            });
        }).to.throw(Error);
        done();
    });

    lab.test('hasHandler', function (done) {

        Code.expect(server.hasHandler('reflect')).to.equal(true);
        Code.expect(server.hasHandler('nonexistant')).to.equal(false);
        done();
    });

    lab.test('connection Ids', function (done) {

        var connectionId;
        server.expose('saveConnection', function (params, reply) {

            Code.expect(this.id).to.not.equal(undefined);
            connectionId = this.id;
            reply(null, 'ok');
        });
        client.expose('info', function (params, reply) {

            Code.expect(params).to.be.empty();
            reply(null, 'info ok');
        });
        client.send('saveConnection', undefined, function () {

            Code.expect(connectionId).to.not.equal(undefined);
            Code.expect(server.getConnection(connectionId)).to.not.equal(undefined);
            server.send(connectionId, 'info', undefined, function (err, result) {

                Code.expect(result).to.equal('info ok');
                done();
            });
        });
    });
    lab.test('invalid connection id', function (done) {

        server.send(0, 'info', undefined); //No callback is ok
        server.send(0, 'info', undefined, function (err, result) {

            Code.expect(result).to.equal(undefined);
            Code.expect(err).to.include('code', 'message');
            Code.expect(err.code).to.equal(-32000);
            done();
        });
    });
    lab.test('invalid payloads do not throw exceptions', function (done) {

        //This is for code coverage of a lot of the message handler to make sure rogue messages won't take the server down.
        var socket = WS.createConnection('ws://localhost:8081', function () {

            //TODO socket callbacks + socket.once('message') with response validation for each of these
            socket.send('asdf\n');
            socket.send('{}\n'); //Invalid payload (no id)
            socket.send('{"id":"asdf", "result":"test"}\n'); //Result for invalid id
            socket.send('{"error":{"code": -32000, "message":"Server error"}}\n'); //Error with no id
            socket.send('{"id":"adsf"}\n'); //No method
            socket.send('{"id":"good", "method":"reflect", "params": "string"}\n'); //Invalid params
            socket.send('{"id":"good", "method":"reflect", "params": null}\n'); //Invalid params
            //TODO gross
            setTimeout(done, 100);
        });
    });
    lab.test('client.send', function (done) {

        //No callback
        client.send('reflect'); //Valid method
        client.send('nonexistant'); //Invalid method
        done();
    });
    lab.test('client hangups', function (done) {

        var clientA = JsonRpcWs.createClient();
        var clientB = JsonRpcWs.createClient();
        //With and without callbacks;
        clientA.connect('ws://localhost:8081', function () {

            clientA.disconnect(function () {

                clientB.connect('ws://localhost:8081', function () {

                    clientB.disconnect();
                    done();
                });
            });

        });
    });
    lab.test('server.start without callback', function (done) {

        var serverA = JsonRpcWs.createServer();
        serverA.start({ port: 8082 });
        serverA.server.once('listening', done);
    });
});
