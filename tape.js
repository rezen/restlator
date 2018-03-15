'use strict';

const url          = require('url');
const zlib         = require("zlib");
const querystring  = require('querystring');
const EventEmitter = require('eventemitter2').EventEmitter2;

/**
 * If the schema of recordings change the
 * version will be changed as well
 * @type {String}
 */
const SCHEMA_VERSION = '1';

/**
 * A tape listens to a proxied request
 * and tracks the response and once the 
 * request is done passes itself to the 
 * recorder
 */
class Tape extends EventEmitter {

  /**
   * @param  {Emitter} proxied - proxied response, should emit events
   * @param  {Object} connxn   - contains the req, res
   * @param  {Recorder} recorder - persists the tape
   */
  constructor(proxied, connxn, recorder) {
    super({
      wildcard: true,
      newListener: false,
      maxListeners: 20
    });

    this.proxied     = proxied;
    this.req         = connxn.req;
    this.res         = connxn.res;
    this.recorder    = recorder;
    this.isRecording = false;
    this.data        = this.start(connxn.req, proxied);

    this.track(proxied);
  }

  /**
   * Use to hook into the proxied emitter
   * @param  {Emitter} proxy
   */
  track(proxied) {
    if (!proxied) {return;}
    if (typeof proxied.on !== 'function') {return;}

    const self = this;
    self.isRecording = true;
    const isZipped = (self.data.res.headers['content-encoding'] === 'gzip');
    
    if (isZipped) {
     let gunzip = zlib.createGunzip();
      proxied.pipe(gunzip);
      proxied = gunzip;
    }

    proxied.on('data', chunk => self.data.res.body += chunk);
    proxied.on('end', () => {
      self.recorder.save(self, function(err, ignored) {
        self.emit('recorded', err, ignored);
        self.isRecording = false;
      });
    });
  }

  /**
   * Public method to get the data of the request
   * @return {Object}
   */
  contents() {
    return this.data;
  }

  /**
   * Generates initial data structure which recorded data is stored in
   * @param  {Object} req
   * @param  {Object} proxied
   * @return {Object}
   */
  start(req, proxied) {
    if (!req) {
      return {};
    }

    const parts =  url.parse(req.url);

    return {
      schema: SCHEMA_VERSION,
      req:{
        method : req.method,
        url    : req.url,
        headers: req.headers,
        body   : req.body || '',
        q      : parts.query,
        data   : {},
        params : querystring.parse(parts.query || ''),
      },
      res: {
        statusCode: proxied.statusCode,
        headers   : proxied.headers,
        body      : '',
        data: {}
      }
    };
  }
}


Tape.SCHEMA_VERSION  = SCHEMA_VERSION;

module.exports = Tape;
