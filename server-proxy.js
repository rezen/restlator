'use strict';

const fs          = require('fs');
const minimatch   = require('minimatch');
const httpProxy   = require('http-proxy');
const Tape        = require('./tape');
const Recorder    = require('./recorder');

/**
 * The proxy is the web server that handles the requests
 * for the api that you want to record tapes for
 */
class ServerProxy {

  /**
   * @param  {Object} config
   */
  constructor(config) {
    this.config   = this.configure(config);
    this.recorder = new Recorder(this.config);
    this.proxy    = httpProxy.createServer(this.config);
  }

  /**
   * @param  {EventEmitter} proxy
   */
  hooks(proxy) {
    const self = this;
    const CONFIG = this.config;

    proxy.on('error', this.onError);
    proxy.on('proxyReq', this.onProxyReq);
    proxy.on('close', self.onCloseProxy);
    proxy.on('proxyRes', function (proxyRes, req, res) {
      const request = ''.concat(req.method, ' ', req.url);
      const isIgnorable = CONFIG.ignore.some(pattern => minimatch(request, pattern));

      if (isIgnorable) {
        console.info('[i] Ignoring', req.url);
        return;
      }

      self.toTape(proxyRes, req, res);
    });
  }

  /**
   * @param  {Object} proxyRes
   * @param  {Object} req
   * @param  {Object} res
   * @return {Tape}
   */
  toTape(proxyRes, req, res) {
    const request = ''.concat(req.method, ' ', req.url);
    const tape = new Tape(proxyRes, {req, res}, this.recorder);

    tape.on('recorded', (err, ignored) => {
      if (err) {
          console.log('[!]', err);
        } else if (!ignored)  {
          console.log('[i] Recorded ', request);
        } else {
          console.log("[i] Didn't overwrite ", request);
        }
    });

    return tape;
  }

  /**
   * @param  {Object} config
   * @return {Object}
   */
  configure(config) {
    config.output = (config.output !== undefined) ? config.output : 'tapes';
    config.overwrite = (config.overwrite !== undefined) ? config.overwrite : true;

    if (!config.target) {
      console.error('A target must be specified');
      process.exit(1);
    }

    if (config.target.indexOf('https') !== -1 && !config.ssl) {
      console.error('The config for ssl must be specified for https traffic');
      process.exit(2);
    }

    if (config.ssl) {
      if (config.ssl.key) {
        config.ssl.key = fs.readFileSync(config.ssl.key, 'utf8');
      }

      if (config.ssl.cert) {
        config.ssl.cert = fs.readFileSync(config.ssl.cert, 'utf8');
      }
    }

    config.changeOrigin = true;
    config.autoRewrite = true;
    config.port = config.port || 8005;
    return config;
  }

  /**
   * @param  {EventEmitter} proxyReq
   * @param  {EventEmitter} req
   * @param  {EventEmitter} res
   * @param  {Object} options
   */
  onProxyReq(proxyReq, req, res, options) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => req.body = body);
  }

  /**
   * @param  {Error|Null} err
   * @param  {Object} req
   * @param  {Object} res
   */
  onError(err, req, res) {
    res.writeHead(500, {
      'Content-Type': 'application/json'
    })

    res.json({});
  }
 
  onCloseProxy() {
    console.log('Client disconnected');
    process.exit();
  }

  serve() {
    this.hooks(this.proxy);
    this.proxy.listen(this.config.port);
    console.log(`[i] Target is ${this.config.target}`);
    console.log('[i] Listening on ' + this.config.port);
  }
}

module.exports = ServerProxy;
