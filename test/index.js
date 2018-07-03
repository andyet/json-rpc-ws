'use strict';

const Code = require('code');
const Lab = require('lab');
const WS = require('ws');
const JsonRpcWs = require('../');
const Browserify = require('browserify');
const Webdriver = require('selenium-webdriver');

const lab = exports.lab = Lab.script();
const { expect } = Code;
const { describe, it, after, before } = lab;

Code.settings.truncateMessages = false;

describe('json-rpc ws', () => {

  const server = JsonRpcWs.createServer();
  const client = JsonRpcWs.createClient();
  //const delayBuffer = [];

  before(() => {

    server.expose('reflect', function reflectReply(params, reply) {

      reply(null, params || 'empty');
    });
    server.expose('error', function errorReply(params, reply) {

      reply('error', null);
    });
    server.expose('browserClient', function browserReply(params, reply) {

      reply(null, this.id);
    });

    return new Promise((resolve) => {

      server.start({ host: 'localhost', port: 8081 }, function () {

        client.connect('ws://localhost:8081', resolve);
      });
    });
  });

  after(() => {

    return new Promise((resolve) => {

      client.disconnect(function () {

        server.stop();
        resolve();
      });
    });
  });

  it('client has an id', () => {

    expect(client.id).to.exist();
  });

  it('reflecting handler', () => {

    return Promise.all([
      new Promise((resolve) => {

        client.send('reflect', ['test one'], function (error1, reply1) {

          expect(error1).to.not.exist();
          expect(reply1).to.have.length(1);
          expect(reply1[0]).to.equal('test one');
          resolve();
        });
      }),
      new Promise((resolve) => {

        client.send('reflect', ['test two'], function (error2, reply2) {

          expect(error2).to.not.exist();
          expect(reply2).to.have.length(1);
          expect(reply2[0]).to.equal('test two');
          resolve();
        });
      }),
      new Promise((resolve) => {

        client.send('reflect', null, function (error3, reply3) {

          expect(error3).to.not.exist();
          expect(reply3).to.equal('empty');
          resolve();
        });
      }),
      new Promise((resolve) => {

        client.send('reflect', undefined, function (error4, reply4) {

          expect(error4).to.not.exist();
          expect(reply4).to.equal('empty');
          resolve();
        });
      })
    ]);
  });

  it('error reply', () => {

    return new Promise((resolve) => {

      client.send('error', null, function (error, reply) {

        expect(reply).to.not.exist();
        expect(error).to.equal('error');
        resolve();
      });
    });
  });

  it('cannot register duplicate handler', () => {

    const throws = () => {

      server.expose('reflect', function (params, reply) {

        reply();
      });
    };
    expect(throws).to.throw(Error);
  });

  it('hasHandler', () => {

    expect(server.hasHandler('reflect')).to.equal(true);
    expect(server.hasHandler('nonexistant')).to.equal(false);
  });


  it('connectionId', () => {

    let connectionId;
    server.expose('saveConnection', function saveConnectionReply(params, reply) {

      expect(this.id).to.exist();
      connectionId = this.id;
      reply(null, 'ok');
    });

    client.expose('info', function infoReply(params, reply) {

      expect(params).to.not.exist();
      reply(null, 'info ok');
    });
    return new Promise((resolve) => {

      client.send('saveConnection', null, function () {

        expect(connectionId).to.exist();
        expect(server.getConnection(connectionId)).to.exist();
        server.send(connectionId, 'info', null, function (err, result) {

          expect(err).to.not.exist();
          expect(result).to.equal('info ok');
          resolve();
        });
      });
    });
  });

  it('invalid connection id', () => {

    server.send(0, 'info', undefined); //No callback is ok
    return new Promise((resolve) => {

      server.send(0, 'info', undefined, function (err, result) {

        expect(result).to.not.exist();
        expect(err).to.include(['code', 'message']);
        expect(err.code).to.equal(-32000);
        resolve();
      });
    });
  });

  it('invalid payloads do not throw exceptions', () => {

    //This is for code coverage in the message handler to make sure rogue messages won't take the server down.;
    const socket = new WS('ws://localhost:8081');
    return new Promise((resolve) => {

      socket.on('open', function () {

        //TODO socket callbacks + socket.once('message') with response validation for each of these instead of this setTimeout nonsense
        socket.send('asdf\n');
        socket.send('{}\n');
        socket.send('{"jsonrpc":"2.0"}\n');
        socket.send('{"jsonrpc":"2.0", "method":"reflect"}\n');
        socket.send('{"jsonrpc":"2.0", "method":"reflect", "id":null}\n');
        socket.send('{"jsonrpc":"2.0", "method":"reflect", "id":"asdf"}\n');
        socket.send('{"jsonrpc":"2.0", "method":"reflect", "id":0}\n');
        socket.send('{"jsonrpc":"2.0", "method":"reflect", "id":[0]}\n');
        socket.send('{"jsonrpc":"2.0", "method":"reflect", "params":null}\n');
        socket.send('{"jsonrpc":"2.0", "method":"reflect", "id":null, "params":null}\n');
        socket.send('{"jsonrpc":"2.0", "error":{"code": -32000, "message":"Server error"}}\n');
        socket.send('{"jsonrpc":"2.0", "id":"asdf", "result":"test"}\n');
        socket.send('[{"jsonrpc":"2.0", "result":"test"},{"jsonrpc":"2.0", "result":"rest"}]');
        setTimeout(resolve, 100);
      });
    });
  });

  it('client.send', () => {

    //No callback
    const doesNotThrow = () => {

      client.send('reflect', null); //Valid method
      client.send('nonexistant', null); //Unexposed method
    };

    const throws = () => {

      client.send(1, null); //Invalid method
    };
    expect(throws).to.throw(Error);
    expect(doesNotThrow).to.not.throw();
  });

  it('client hangups', () => {

    const clientA = JsonRpcWs.createClient();
    const clientB = JsonRpcWs.createClient();
    return new Promise((resolve) => {

      clientA.connect('ws://localhost:8081', function () {

        clientA.disconnect(function () {

          clientB.connect('ws://localhost:8081', function () {

            clientB.disconnect();
            resolve();
          });
        });
      });
    });
  });

  it('server.start without callback', () => {

    const serverA = JsonRpcWs.createServer();
    serverA.start({ port: 8082 });
    return new Promise((resolve) => {

      serverA.server.once('listening', resolve);
    });
  });

  it('errors', () => {

    let payload;
    payload = JsonRpcWs.Errors('parseError');
    expect(payload.id).to.not.exist();
    expect(payload.error).to.include(['code', 'message']);
    expect(payload.error.data).to.not.exist();
    payload = JsonRpcWs.Errors('parseError', 'a');
    expect(payload.id).to.equal('a');
    expect(payload.error).to.include(['code', 'message']);
    expect(payload.error.data).to.not.exist();
    payload = JsonRpcWs.Errors('parseError', 'b', { extra: 'data' });
    expect(payload.id).to.equal('b');
    expect(payload.error).to.include(['code', 'message']);
    expect(payload.error.data).to.equal({ extra: 'data' });
  });

  describe('browser', () => {

    let script;
    before(() => {

      process.env.PATH = `${process.env.PATH}:./node_modules/.bin`;
      const b = Browserify();
      b.add('./browser_test.js');
      return new Promise((resolve) => {

        b.bundle((err, buf) => {

          expect(err).to.not.exist();
          script = buf.toString();
          expect(script).to.exist();
          resolve();
        });
      });
    });

    it('works in browser', () => {

      const driver = new Webdriver.Builder().forBrowser('phantomjs').build();
      return new Promise((resolve) => {

        let x = 0;
        driver.executeScript(script).then(function () {

          driver.executeAsyncScript(function () {

            var callback = arguments[arguments.length - 1];
            browserClient.connect('ws://localhost:8081', function connected() {

              browserClient.send('browserClient', ['browser', 'client'], function sendReply(err, reply) {

                callback([err, reply]);
              });
            });
          }).then((response) => {

            const err = response[0];
            const browserId = response[1];
            expect(browserId).to.not.not.exist();
            expect(err).to.equal(null);
            server.send(browserId, 'info', null, function (err, result) {

              expect(err).to.not.exist();
              expect(result).to.equal('browser');
              driver.quit();
              resolve();
            });
          });
        });
      });
    });

  });
});
