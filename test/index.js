/*eslint func-names: 0*/
var Code = require('code');
var Lab = require('lab');
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
});
