'use strict';

const querystring = require('querystring');

/**
 * The editor handles any sort of modifying
 * of tapes
 * 
 * @todo adapt to a class that takes a config
 * @todo make masking pluggable
 * @todo should have xml handling
 */


/**
 * @param  {Object} data
 * @param  {String} contentType
 * @return {Object}
 */
function bodyToData(body, contentType) {

  if (!body) {return {};}
  if (body === '') {return {};}


  if (typeof body !== 'string') {
    return body;
  }

  if (contentType.indexOf('json') !== -1) {
    return JSON.parse(body);
  }
  
  if (contentType.indexOf('form') !== -1) {
    return querystring.parse(body);
  }

  return body;
}

module.exports.bodyToData = bodyToData;


/**
 * @param  {Object} data
 * @param  {String} contentType
 * @return {Object}
 */
function dataToBody(data, contentType) {
  if (!data) {
    return '';
  }

  if (typeof data === 'string') {
    return data;
  }

  if (Object.keys(data).length === 0) {
    return '';
  }

  if (contentType.indexOf('json') !== -1) {
    return JSON.stringify(data);
  }

  if (contentType.indexOf('form') !== -1) {
    return querystring.stringify(data);
  }

  return data;
}

module.exports.dataToBody = dataToBody;

/**
 * @param  {Object} data
 * @return {Object}
 */
function scrubHeaders(data) {
  if (!data.req && !data.req.headers) {
    return data;
  }

  delete data.req.headers['user-agent'];
  delete data.req.headers.origin;
  delete data.req.headers.referer;
  delete data.res.headers.date;
  delete data.res.headers['content-length'];
  delete data.res.headers['connection'];
  return data;
}

module.exports.scrubHeaders = scrubHeaders;


const SECRET_MASK = 'xxxxxxxxxxxx';

/**
 * @param  {Object} data
 * @param  {String} mask
 * @return {Object}
 */
function maskSecrets(data, mask) {
  mask = mask || SECRET_MASK;

  if (data.password) {
    data.password = mask;
  }

  if (data.secret) {
    data.secret = mask;
  }

  if (data.token) {
    data.token = mask;
  }

  return data;
}

module.exports.maskSecrets = maskSecrets;

/**
 * @param  {Object} data
 * @return {Object}
 */
function scrub(data) {
  const contentType = data.req.headers['content-type'] || 'json';
  const payload     = bodyToData(data.req.body, contentType);
  data.req.data     = maskSecrets(payload);
  data.req.body     = dataToBody(data.req.data, contentType);

  try {
    data.res.data = JSON.parse(data.res.body);
  } catch (e) {}
  
  data = scrubHeaders(data);

  return data;
}

module.exports.scrub = scrub;
