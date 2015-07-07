/*eslint func-names: 0*/
var Code = require('code');
var Lab = require('lab');
var JsonRpcWs = require('../');

var lab = exports.lab = Lab.script();

lab.experiment('json-rpc ws', function () {

    var server = JsonRpcWs.createServer();

    lab.before(function (done) {

        server.expose('reflect', function (params, reply) {

            reply(null, params);
        });
        server.start({ host: 'localhost', port: 8081 }, done);
    });

    lab.test('reflecting handler', function (done) {

        var client = JsonRpcWs.createClient();
        client.connect('ws://localhost:8081', function () {

            client.send('reflect', ['test one'], function (error, reply) {

                Code.expect(reply).to.have.length(1);
                Code.expect(reply[0]).to.equal('test one');
                Code.expect(error).to.be.null();
                done();
            });
        });
    });
});
