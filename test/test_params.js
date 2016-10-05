'use strict';

const assert = require('assert');
const Params = require('../params');

describe('Params', () => {
  
  describe('#getParams', () => {
    it('Grabs params off the url pattern', () => {
      const params = Params.getParams('/path-name/34534/bugs/34534/56', {
        id: new RegExp('[0-9]+')
      });

      assert.deepEqual(params[0], { 
        idx: 2,
        param: 'id',
        val: '34534',
        prev: 'path-name',
        name: '{pathNameId}'
      });

      assert.deepEqual(params[2], { 
        idx: 5,
        param: 'id',
        val: '56',
        prev: 1, 
        name: '{id1}'
      });
    });
  });

  describe('#paramsReplace', () => {
    it('Automatically infers model name', () => {
      const replaced = Params.paramsReplace('/path-name/34534/bugs/34534/56', {
        id: new RegExp('[0-9]+')
      });

      assert.equal(replaced, '/path-name/{pathNameId}/bugs/{bugId}/{id1}');
    });

    it('Properly replaces and increments id name for repeated patterns', () => {
      const replaced = Params.paramsReplace('/1/3453/499/574/56', {
        id: new RegExp('[0-9]+')
      });

      assert.equal(replaced, '/{id}/{id1}/{id2}/{id3}/{id4}');
    });

    it('Replaces each instances of pattern', () => {
      const replaced =  Params.paramsReplace('/path-name/NOW-5656/bugs/BNM-454', {
        "{issueId}": new RegExp('[A-Z]+-[0-9]+')
      });

      assert.equal(replaced, '/path-name/{issueId}/bugs/{issueId}');
    });
  });
});