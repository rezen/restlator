'use strict';

const assert       = require('assert');
const sinon        = require('sinon');
const EventEmitter = require('eventemitter2').EventEmitter2;
const StubTrack    = require('./stub-track');
const Tape         = require('../Tape');
 
describe('Tape', () => {
  let track;

  beforeEach(() => {
    track = require('./stub-track');
  });

  describe('#start', () => {
    it('Formats request data', () => {
      const req = {
        method :'GET',
        url    : '/ice-cream?flavors=^vanilla',
        headers: {},
        body   : '{"abnormal": "req"}',
      };

      const proxied = {
        statusCode: 200,
        headers: {},
      };

      const tape = new Tape(null, {req: null, res: null});
      const data = tape.start(req, proxied);
      assert.equal(data.res.statusCode, proxied.statusCode);
      assert.equal(data.schema, Tape.SCHEMA_VERSION);
      assert(data.req.params['flavors']); // attribute exists
    });
  });

  describe('#contents', () => {
    it('Returns request data', () => {
      let tape;
      const req = {
        method :'GET',
        url    : '/cats',
        headers: {},
        body   : '',
      };

      tape = new Tape({}, {req, res: null});
      const data = tape.start(req, {});
      assert.deepEqual(tape.contents(), data);
      tape = new Tape({}, {req, res: null});
      assert.equal(tape.contents().req.method, req.method);
    });
  });

  describe('#track', () => {
    it('Make sure it hooks into proxy emitter', () => {
      const proxied = {on: sinon.spy()};
      const tape = new Tape({}, {req: {url: '/cats'}, res: {}});

      tape.track(proxied);
      assert(proxied.on.calledTwice);
      assert(!proxied.on.calledThrice);

      const onData = proxied.on.getCall(0);
      const onEnd  = proxied.on.getCall(1);

      assert.equal(onData.args[0], 'data');
      assert.equal(onEnd.args[0], 'end');
    });

    it('Modified data with on.data', () => {
      let data      = {};
      const res     = 'lol';
      const tape    = new Tape({}, {req: {url: '/cats'}, res: {}});
      const emitter = new EventEmitter();
      tape.track(emitter);

      emitter.emit('data', res);
      data = tape.contents();
      assert.equal(data.res.body, res);
      emitter.emit('data', res);
      data = tape.contents();
      assert.equal(data.res.body, res.repeat(2));
    });

    it('Sends tape to recorder on.end', () => {
      const recorder = {save: sinon.spy(function(d, callback) {
        callback(null, 'zing');
      })};

      const tapeEmit = sinon.spy();

      const tape    = new Tape({}, {req: {url: '/cats'}, res: {}}, recorder);
      const emitter = new EventEmitter();
      tape.track(emitter);
      assert(tape.isRecording);
      emitter.emit('data', '1');
      emitter.emit('data', '2');
      emitter.emit('data', '3');
      tape.emit = tapeEmit;

      emitter.emit('end');
      assert(recorder.save.called);
      const args = recorder.save.getCall(0).args;
      assert.equal(args[0], tape);
      assert(!tape.isRecording);
      assert( tapeEmit.called);
    });
  });
});