'use strict';

const assert    = require('assert');
const StubTrack = require('./stub-track');
const Editor    = require('../editor');

function deepCopy(d) {
  return Object.assign({}, JSON.parse(JSON.stringify(d)));
}

describe('Editor', () => {
  let track;

  beforeEach(() => {
    track = require('./stub-track');
  });

  describe('#scrub', () => {
    it('Patches up data', () => {
      const data = {lol: 'cat'};
      const record    = deepCopy(track);
      record.req.headers['content-type'] = 'json';
      record.req.data = {};
      record.req.body = JSON.stringify(data);

      Editor.scrub(record);
      assert.deepEqual(record.req.data, data);
      assert.deepEqual(record.req.body, JSON.stringify(data));
    });


    it('Remove secrets', () => {
      const data = {hey: 'cow', password: 'abc'};
      const record = deepCopy(track);
      record.req.headers['content-type'] = 'json';
      record.req.data = {};
      record.req.body = JSON.stringify(data);

      Editor.scrub(record);
      // Data is not the same
      assert.notDeepEqual(record.req.data, data);
      assert.notEqual(record.req.body, JSON.stringify(data));

      const masked = Editor.maskSecrets(deepCopy(data));

      // Data is same as secrets
      assert.deepEqual(record.req.data, masked);
      assert.deepEqual(record.req.body, JSON.stringify(masked));
    });
  });

  describe('#scrubHeaders', () => {
    it('Removes headers', () => {
      const preLength = Object.keys(track.res.headers).length;
      Editor.scrubHeaders(track);
      const postLength = Object.keys(track.res.headers).length;

      assert.notEqual(
        preLength, 
        postLength
      );
    });
  });


  describe('#maskSecrets', () => {
    it('Hides passwords', () => {
      const password = 'password1234';
      const data = {password};
      const masked = Editor.maskSecrets(deepCopy(data));
      assert.notEqual(masked.password, data.password);
    });

    it('Hides secrets', () => {
      const secret = 'sshhhh';
      const data = {secret, other: 'noise'};
      const masked = Editor.maskSecrets(deepCopy(data));

      assert.notEqual(masked.secret, data.secret, 'yay');
      assert.equal(masked.other, data.other);
    });

    it('Accepts custom masks as second arg', () => {
      let mask = '&&&&';
      let masked = {};
      const password = 'password1234';
      const data = {password};

      masked = Editor.maskSecrets(deepCopy(data), mask);
      assert.equal(masked.password, mask);

      mask = 'tr0lll0l00l0'
      masked = Editor.maskSecrets(deepCopy(data), mask);
      assert.equal(masked.password, mask);
    });
  });
});