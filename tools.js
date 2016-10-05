'use strict';

/**
 * Assumes pojo aka {}, not a custom constructor
 * @param  {Object}   data
 * @param  {Null|Function} fn
 * @return {Object}
 */
function sortAttrs(data, fn) {
  const attrs = Object.keys(data);

  if (typeof fn === 'function') {
    attrs.sort(fn);
  } else {
    attrs.sort(fn);
  }

  return attrs.reduce((aggr, attr) => {
    aggr[attr] = data[attr];
    return aggr;
  }, {});
}

module.exports.sortAttrs = sortAttrs;

/**
 * Take a http method and describe it
 * @param  {String} method
 * @return {String}
 */
function methodLabel(method) {
  method = method.toLowerCase();

  switch (method) {
    case 'put':
      return 'Created';
    case 'delete':
      return 'Deleted';
    case 'post':
      return 'Updated'
  }

  return 'Fetched';
}

module.exports.methodLabel = methodLabel;
