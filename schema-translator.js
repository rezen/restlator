'use strict';

const typeOf = require('typeof');

/**
 * Acceptable primitives for property types
 * @type {Array}
 */
const TYPE_PRIMITIVES = [
  'array', 
  'boolean', 
  'integer', 
  'number', 
  'object', 
  'string',
];

/**
 * Translation table keyed by data type
 * and correctly setting property attrs
 * @type {Object}
 */
const TYPE_TRANSLATION_MAP = {
  number: function(p, val, attr) {
    if (Number.isInteger(val)) {
      p.type = 'integer';
    } else {
      p.format = 'float';
    }
  },
  date: function(p, val, attr) {
    p.type = 'string';
    p.format = 'date';
  },
  regexp: function(p, val, attr) {
    p.type = 'string';
    p.pattern = val.toString();
  },
  buffer: function(p, val, attr ) {
    p.type = 'string';
    p.format = 'byte';
  }
};

/**
 * The translator takes an object and translates
 * to generates a json-schema
 */
class SchemaTranslator {

  /**
   * @param  {Array.<Function>} modifiers
   */
  constructor(modifiers) {
    this.modifiers = modifiers || [];
  }

  /**
   * @return {Object}
   */
  starter() {
    return {
      type       : 'object',
      properties : {},
      required   : []
    };
  }

  /**
   * Consume an object and read through it's attributes and
   * generate a schema from it's assessed attributes
   * 
   * @todo maybe arrays should not be translated?
   * 
   * @param  {Object|Array.<Object>} data - object to translate
   * @param  {Boolean} requireAll - to add all attributed to required
   * @return {Object}
   */
  translate(data, requireAll) {
    const self = this;
    const schema = this.starter();

    if (!data) {
      return schema;
    }

    if (Array.isArray(data)) {
      data = data[0] || {};
    }

    // data = data.data ? data.data : data;// @todo

    const attrs = Object.keys(data);
    
    attrs.sort();

    if (requireAll) {
      schema.required = attrs;
    }

    return attrs.reduce((aggr, attr) => {
      const val = data[attr] || '';
      aggr.properties[attr] = self.inferProperty(val, attr);
      return aggr;
    }, schema);
  }

  /**
   * Take a property value & attribute name and generate
   * a property object
   * 
  * @todo improve for nested objects
  * @todo improve for arrays
  * 
  * @param  {Mixed}  val
  * @param  {String} attr
  * @return {Object}
  */
  inferProperty(val, attr) {
    const prop = {
      type: typeOf(val)
    };

    if (attr.indexOf('is_') === 0) {
      prop.type = 'boolean';
    } else if (attr === 'password') {
      prop.format = 'password';
    }

    if (TYPE_TRANSLATION_MAP[prop.type]) {
      TYPE_TRANSLATION_MAP[prop.type](prop, val, attr);
    }

    if (TYPE_PRIMITIVES.indexOf(prop.type) === -1) {
      prop.type = 'string';
    }

    return this.modifyProperty(prop, val, attr);
  }

  /**
   * Runs a property, val, attr through the builtin
   * modifiers to allow tweaking the property object
   * @private
   * @param  {Object} property
   * @param  {Mixed}  val
   * @param  {String} attr
   * @return {Object}
   */
  modifyProperty(property, val, attr) {
    if (!Array.isArray(this.modifiers)) {
      return property;
    }

    return this.modifiers.reduce((aggr, fn) => {
      if (typeof fn !== 'function') {return aggr;}

      const modified = fn(aggr, val, attr);
      if (!modified) {return aggr;}
      if (!modified.type) {return aggr; }

      aggr = modified;
      return aggr;
    }, property);
  }

  /**
   * Sometimes you may want to merge schemas ...
   * @param  {Array} schemas
   * @return {Object}
   */
  merge(...schemas) {
    const merged = schemas.reduce((aggr, schema) => {
      if (schema.type && schema.type !== aggr.type) {
        aggr.type = schema.type;
      }

      const reqs      = [].concat(aggr.required, schema.required).filter(r => !!r);
      aggr.required   = Array.from(new Set(reqs));
      aggr.properties = Object.assign({}, aggr.properties, schema.properties || {});
      return aggr;
    }, this.starter());

    merged.required.sort();

    if (merged.required.length === 0) {
      delete merged.required;
    }

    return merged;
  }
}

module.exports = SchemaTranslator;
