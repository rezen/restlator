'use strict';

const inflection = require('inflection');
const _s         = require('underscore.string');

/**
 * This module contains any logic for grabbing
 * params from url paths with provided patterns.
 * A patterns objects have a name and explicit regex
 * for exact matches
 * 
 * @examples
 * id: ^[0-9]$
 * uid: ^[a-f\d]{24}$
 */

/**
 * Takes the param name such as {authorName} or id 
 * in conjunction with the last segment of the 
 * path or integer for which how many times the 
 * param name has already been used
 * 
 * @todo needs love eg. path-name should translate {pathName} not {pathname}
 * 
 * @param  {String} param
 * @param  {String|Integer} prev
 * @return {String}
 */
function paramName(param, prev) {
  if (param.charAt(0) === '{') {
    return param;
  }

  if (typeof prev === 'string') {
    prev = prev.replace(/[0-9]/g, '');

    if (prev === '') {
      return `{${param}}`;
    }

    return ''.concat(
      '{',
      _s.camelize(inflection.singularize(prev)),
      inflection.capitalize(param),
      '}'
    );
  }
  
  return `{${param}${prev}}`
}


/**
 * @param  {Array|String} parts
 * @param  {Object} patterns
 * @return {Array}
 */
function getParams(parts, patterns) {
  if (!Array.isArray(parts)) {
    parts = parts.split('/');
  }

  const values   = [];
  const params   = Object.keys(patterns);
  const counters = {};

  return parts.reduce((aggr, part, idx) => {
    // Used to generate name for param
    const previous = parts[idx - 1] || '';

    params.map(param => {
      const regex = patterns[param];
      const match = regex.exec(part);

      if (!match) {return;}

      if (!counters[param]) {
        counters[param] = 0;
      }

      const prevUnused = (values.indexOf(previous) === -1);

      if (!prevUnused) {
        counters[param]++;
      }

      /**
       * If the previous segment is a param value
       * we don't want to use it for the param naming 
       * but rather an integer for the number of times
       * the param name has already been used without a 
       * previous segment
       */
      const prev = prevUnused ? previous : counters[param];
      const name = paramName(param, prev);

      aggr.push({
        idx,
        param,
        val: part,
        prev: prev,
        name
      });

      values.push(part);
    });

    return aggr;
  }, []);
}

/**
 * Digest a url and patterns and replace the param
 * patterns in the url with the param name
 * 
 * @todo use actual entity as second param
 * 
 * @param  {String} str
 * @param  {Object} patterns
 * @param  {Array.<Object>} params - optional
 * @return {String}
 */
function paramsReplace(resource, patterns, params) {
  const parts = resource.split('/');
  params      = params || getParams(parts, patterns);

  return params.reduce((aggr, match) => {
    aggr[match.idx] = match.name;
    return aggr;
  }, parts).join('/');
}


/*
// Original version for reference
function paramsReplace2(filename, patterns, entity) {
  const params = [];
  console.log(filename);
  for (let name in patterns) {
    // @todo ensure pattern has 1 match group
    const regx = patterns[name];

    filename =  filename.replace(regx, function (match, m1, offset, str) {
      console.log()
      let tag = name;
      const entity = str.slice(0, offset).split('/').pop();

      if (name[0] !== '{') {
        tag = '{' + inflection.singularize(entity) + inflection.capitalize(name) + '}';
      }

      params.push(tag);
      return '/' + tag;
    });
  }

  return [filename, params];
}
*/

module.exports = {paramsReplace, getParams};
