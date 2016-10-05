'use strict';

const fs     = require('fs');
const url    = require('url');
const async  = require('async');
const mkdirp = require('mkdirp');
const Editor = require('./editor');

/**
 * The recorder saves request tapes recorded from
 * the proxy do the disk. The recorder also mixes
 * in the editor to mask values that shouldn't be
 * saved
 */
class Recorder {

  /**
   * @param  {Object} config
   */
  constructor(config) {
    this.config = config;
    this.mkdirp = mkdirp;
    this.editor = Editor;
  }

  /**
   * @todo should include status code in name
   * @param  {Object} data
   * @return {Array.<String>}
   */
  location(data) {
    const parsed = url.parse(data.req.url);
    const folder = this.config.output + parsed.pathname;

    const file = ''.concat(
      [data.req.method, data.req.q || '', data.res.statusCode]
        .filter(p => p && p !== '')
        .join('_'), 
      '.json'
    ).replace(':', '_');

    return [file, folder];
  }

  /**
   * Save a tape to the filesystem
   * @param  {Tape}   tape
   * @param  {Function} callback
   */
  save(tape, callback) {
    const self     = this;
    const parts    = self.location(tape.contents());
    const file     = parts[0];
    const folder   = parts[1];
    const filepath = folder + '/' + file;
    const config   = self.config;

    async.waterfall([
      function (callback) {
        self.mkdirp(folder, callback);
      },
      function (_d, callback) {
        if (config.overwrite) {
          return callback(null, false);
        }

        fs.stat(filepath, (err, stats) => {
          callback(null, (err === null) ? true : false);
        });    
      },
      function(exists, callback) {
        if (exists && !config.overwrite) {
          return callback(null, true);
        }

        const opts = {encoding: 'utf8'};
        const edited = self.editor.scrub(tape.contents());
        fs.writeFile(filepath, JSON.stringify(edited, true, 2), opts, callback);
      }], callback);
  }
}

module.exports = Recorder;
