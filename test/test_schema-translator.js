'use strict';

const assert           = require('assert');
const sinon            = require('sinon');
const SchemaTranslator = require('../schema-translator');
 
describe('SchemaTranslator', () => {
  let translator;

  beforeEach(() => {
    translator = new SchemaTranslator();
  });

  describe('#starter', () => {
    it('Provides an empty schema to start with', () => {
      const schema = translator.starter();
      const attrs = Object.keys(schema);
      assert.equal(attrs.length, 3);
      assert.equal(schema.type, 'object');
      assert.deepEqual(attrs, ['type', 'properties', 'required']);
    });
  });

  describe('#translate', () => {
    it('Convert an object to a schema', () => {
      const schema = translator.translate({name: 'Bobby', age: 27});
      const attrs = Object.keys(schema);
      assert.equal(attrs.length, 3);
      assert.equal(schema.type, 'object');
      assert.deepEqual(attrs, ['type', 'properties', 'required']);
      assert.deepEqual(schema.properties, {
        age: {type: 'integer'}, 
        name: {type: 'string'}
      });
    });

    it('Convert an object to a schema and require all properties', () => {
      const data = {star: 'random-star-name', found: new Date()};
      const attrs = Object.keys(data);
      attrs.sort();
      const schema = translator.translate(data, true);
      assert.deepEqual(schema.required, attrs);

      assert.deepEqual(schema, {
        type: 'object',
        properties: {
          star:  {type: 'string'},
          found: {type: 'string', format: 'date'},
        },
        required: attrs
      });
    });

    it('Translate an object that has an array', () => {
      const data = {pets: ['Fluffy', 'Fido']};
      const schema = translator.translate(data);

      assert.deepEqual(schema, {
        type: 'object',
        properties: { pets: { type: 'array' } },
        required: []
      });
    });
  });

  describe('#inferProperty', () => {
    it('Infer string type', () => {
      const prop = translator.inferProperty('Fluffy', 'cats');
      assert.deepEqual(prop, {type: 'string'});
    });

    it('Infer float', () => {
      const prop = translator.inferProperty(1.01, 'low');
      assert.deepEqual(prop, {type: 'number', format: 'float'});
    });

    it('Infer integer', () => {
      const prop = translator.inferProperty(12, 'high');
      assert.deepEqual(prop, {type: 'integer'});
    });

    it('Infer regexp to a string with a pattern', () => {
      const prop = translator.inferProperty(new RegExp('[0-9]+'), 'pattern');
      assert.deepEqual(prop, {type: 'string', pattern: '/[0-9]+/'});
    });

    it('Infer array', () => {
      const prop = translator.inferProperty([], 'list');
      assert.deepEqual(prop, {type: 'array'});
    });

    it('Infer object', () => {
      const prop = translator.inferProperty({}, 'map');
      assert.deepEqual(prop, {type: 'object'});
    });

    it('Infer boolean', () => {
      const prop = translator.inferProperty(true, 'winner');
      assert.deepEqual(prop, {type: 'boolean'});
    });

    it('Infer date', () => {
      const prop = translator.inferProperty(new Date(), 'created_at');
      assert.deepEqual(prop, {type: 'string', format: 'date'});
    });

    it('Infer date', () => {
      const prop = translator.inferProperty(new Buffer('hey'), 'created_at');
      assert.deepEqual(prop, {type: 'string', format: 'byte'});
    });

    it('Infer password from attr name', () => {
      const prop = translator.inferProperty('password123', 'password');
      assert.deepEqual(prop, {type: 'string', format: 'password'});
    });

    it('Infer boolean off name', () => {
      const prop = translator.inferProperty('password123', 'is_cat');
      assert.deepEqual(prop, {type: 'boolean'});
    });

    it('Modifiers are applied to the property', () => {
      translator.modifiers = [function(prop, val, attr) {
        prop.cat = 'meow';
        return prop;
      }];

      const prop = translator.inferProperty('password123', 'is_cat');
      assert.deepEqual(prop, {type: 'boolean', cat: 'meow'});
    });


    it('All the modifiers are applied to the property', () => {
      translator.modifiers = [function(prop, val, attr) {
        prop.type = 'lizard';
        return prop;
      }, function(prop, val, attr) {
        prop.not_true = false;
        return prop;
      }];

      const prop = translator.inferProperty(true, 'dinosaur');
      assert.deepEqual(prop, {type: 'lizard', not_true: false});
    });


    it('Modifiers that return nothing are ignored', () => {
      translator.modifiers = [function(prop, val, attr) {
        return false;
      }];

      const prop = translator.inferProperty('Rex', 'dinosaur');
      assert.deepEqual(prop, {type: 'string'});
    });
  });

  describe('#merge', () => {
    it('Will merge empty objects', () => {
      const schema = translator.merge({}, {}, {});
      assert.deepEqual(schema, {type: 'object', properties: {}});
    });

    it('Later objects overwrite attrs', () => {
      const a = {
        properties: {
          age: {type: 'string'}
        },
        required: ['ducks']
      };

      const b = {
        properties: {
          age: {type: 'boolean'},
          dob: {type: 'string'}
        },
      };

      const schema = translator.merge(a, b);
      assert.deepEqual(schema, {
        type: 'object',
        properties: { 
          age: {type: 'boolean' }, 
          dob: {type: 'string' }
        },
        required: ['ducks'] 
      });
    });

    it('Will merge requireds', () => {
      const schemas = [
        {required: ['ice-cream'], type:'array'},
        {required: ['chocolate']},
        {required: ['snickers']}
      ];

      const schema = translator.merge(...schemas);

      assert.deepEqual(schema, {
        type: 'array',
        properties: {},
        required: ['chocolate', 'ice-cream', 'snickers'] 
      });
    });
  });
});