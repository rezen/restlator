'use strict';

const path             = require('path');
const glob             = require('glob');
const minimatch        = require('minimatch');
const Yaml             = require('yamljs');
const _                = require('lodash');
const _s               = require('underscore.string');
const inflection       = require('inflection');
const typeOf           = require('typeof');
const Tools            = require('./tools');
const Params           = require('./params');
const statuses         = require('./statuses');
const SchemaTranslator = require('./schema-translator');

/**
 * Generate swagger yaml from recorded requests!
 */

// @todo modifiers should be a config you can pass
const PROP_MODIFIERS = [];

const translator = new SchemaTranslator(PROP_MODIFIERS);

/**
 * @param  {Object} config
 * @return {Object}
 */
function validateConfig(config) {
  if (!config) {
    console.error('[!] Will not run without config');
    process.exit(1);
  }

  if (Object.keys(config.params).length === 0) {
    console.error('[!] You need to provide param patterns in the config');
    process.exit(2);
  }

  config.patterns = {};

  for (let name in config.params) {
    config.patterns[name] = new RegExp(config.params[name].pattern, 'g');
  }

  const dir = config.data || 'tapes';

  if (!config.ignore) {
    config.ignore = [];
  }

  if (!config.ignoreForDefs) {
    config.ignoreForDefs = [];
  }

  config.data = path.resolve(process.cwd(), dir);
  return config;
}

/**
 * @param  {Array.<String>} files
 * @return {Array.<Object>}
 */
function filesRequests(files, config) {
  files.sort();

  return files.map(file => {
    const d = {url: '', data: {}};
    const params = Params.getParams(file, config.patterns);

    d.file     = file;
    d.pattern  = Params.paramsReplace(file, config.patterns, params);
    d.params   = _.uniq(params.map(p => p.name));
    d.parts    = d.pattern.split('/');
    d.filename = d.parts.pop();

    d.entity = d.parts.filter(p => p.charAt(0) !== '{').pop();
    d.entity = _s.classify(inflection.singularize(d.entity || ''));

    try {
      d.data  = require(config.data + '/' +  file);
    } catch (e) {
      console.log(e);
    }

    d.method = d.filename
       .split('.')
       .map(p => p.split('_'))
       .reduce((aggr, d) => aggr.concat(d), [])
       .shift();

    if (d.pattern === d.filename) {
      d.url = '/';
    } else {
      d.url = d.pattern.replace('/' + d.filename, '');
    }
    return d;
  });
}

/**
 * @param  {Object}      data
 * @param  {String|Null} part
 * @param  {Object}      headers
 */
function generateParams(data, part, headers) {
  if (!data) {
    return [];
  }

  if (!part && headers && headers['content-type']) {
    if (headers['content-type'].indexOf('form')) {
      part = 'formData';
    }
  }

  const attrs = Object.keys(data);
  
  attrs.sort();

  return attrs.reduce((aggr, attr) => {
    const val = (data[attr] !== undefined) ? data[attr] :  '';
    aggr.push({
      in          :  part || 'body',
      name        : attr,
      description : `@todo description for ${attr}`,
      type        : typeOf(val),
      required    : (part !== 'query'),
    });
    return aggr;
  }, []);
}

/**
 * @param  {Array.<Object>} routes
 * @return {Object}
 */
function routesToDefinition(routes) {
  const definition = routes.reduce((aggr, request) => {
    const req = request.data.req;
    const res = request.data.res;

    // @todo sort out query
    const schemaRes = translator.translate(res.data, true); // @todo hacked data.data
    const schemaReq = translator.translate(req.data, true);

    aggr = translator.merge(aggr, schemaRes, schemaReq);
    return aggr;
  }, translator.starter());

  definition.properties = Tools.sortAttrs(definition.properties);
  return definition;
}

/**
 * @param  {Array.<Object>} requests
 * @return {Object}
 */
function generateSpecDefs(requests) {
  const grouped = _.groupBy(requests, 'entity');
  const entities = Object.keys(grouped).filter(e => e !== '');

  entities.sort();

  return entities.reduce((aggr, entity) => {
    aggr[entity] = routesToDefinition(grouped[entity]);
    return aggr;
  }, {});
}

function requestPathStub(method, entity) {
  method = method || 'get';
  entity = entity || '';

  return {
    summary: `@todo Summary stub for ${method} ${entity}`,
    description: '@todo',
    consumes: null,
    parameters: [],
    responses: {
      '200': {
        description: `@todo ${Tools.methodLabel(method)} ${entity}`,
      },
      default: {
        description: 'Unexpected error'
      }
    }
  };
}

/**
 * @todo  cleanup 
 * 
 * @param  {Object} req
 * @param  {Object} definitions
 * @return {Object}
 */
function patchDef(request, definitions) {
   const entity    = request.entity;
  const hasTag    = (entity && entity !== '');
  const hasEntity = (hasTag && definitions[entity]);
  const method    = request.method.toLowerCase();
  const isRead    = (method === 'get');
  const statusCode = '' + request.data.res.statusCode;

  const stub = requestPathStub(request.method, request.entity);

  if (request.params.length > 0){
    stub.parameters = request.params.map(name => {
      return {
        in          : 'path',
        name        : name.slice(1, name.length - 1),
        description : `@todo ID of ${entity}`,
        required    : true,
        type        : 'string' // @todo figured out patern
      }
    });
  }

  if (isRead) {
    stub.parameters = [].concat(
      stub.parameters,
      generateParams(request.data.req.data, 'query'),
      generateParams(request.data.req.params, 'query')
    );
  }

  if (!isRead) {
    if (request.data.req.headers['content-type']) {
      stub.consumes = [
        request.data.req.headers['content-type'].split(';').shift()
      ];
    }

    // @todo clean up
    if (!hasEntity) {
      if (Object.keys(request.data.req.data).length > 0) {
        stub.parameters = [].concat(
          stub.parameters,
          generateParams(request.data.req.data, false, request.data.req.headers)
        );
      }
    } else if (method !== 'delete') {
      stub.parameters.push({
        in: 'body',
        name: 'body',
        description: `@todo Updated ${entity}`,
        required: true,
        schema: {$ref: '#/definitions/' + entity}
      });
    }
  }

  if (hasTag) {
    stub.tags = [entity];
  }

  if (!stub.responses[statusCode]) {
    stub.responses[statusCode] = {description: statuses.description(statusCode)};
  }

  if (hasEntity && method !== 'delete' && statusCode.indexOf('2') === 0) {
    if (Array.isArray(request.data.res.data)) {
      stub.responses[statusCode].schema = {
        type: 'array',
        items: {
          $ref: '#/definitions/' + entity
        }
      };
    } else {
      stub.responses[statusCode].schema = {$ref: '#/definitions/' + entity};
    }
  } else {
    // @todo
    // generateDefinition(req.data.res.data, req.method);
  }

  if (!stub.consumes) {
    delete stub.consumes;
  }

  if (stub.parameters.length === 0) {
    delete stub.parameters;
  }

  return stub;
}

/**
 * @param  {Array.<Object>}  requests
 * @param  {Object} definitions
 * @return {Object}
 */
function generateSpecPaths(requests, definitions) {
  let paths = {};
  const grouped = _.groupBy(requests, 'url');
  const urls    = Object.keys(grouped);

  return urls.reduce((paths, url) => {
    // @todo extract out
    if (url === '/') {
      return paths;
    }

    const key = url.charAt(0) === '/' ? url : `/${url}`;

    return grouped[url].reduce((aggr, req) => {
      const method = req.method.toLowerCase();
  
      if (!aggr[key]) {aggr[key] = {};}

      const def = patchDef(req, definitions);

      if (!def) { return aggr;}

      aggr[key][method] = def;

      return aggr;
    }, paths);
  }, {});
}

module.exports.generateSpecPaths = generateSpecPaths;

function getSpecTemplate() {
  return {
    swagger: '2.0',
    info: {
      title       : '@todo',
      description : `@todo open-api config generated ${(new Date()).toLocaleString()}`,
      version     : '1.0.0',
    },
    host     : '@todo',
    schemes  : ['https'],
    produces : ['@todo'],
    basePath : '/@todo',
    paths    : {}, 
    definitions: {}
  };
}

module.exports.getSpecTemplate = getSpecTemplate;

if (require.main !== module) {
  return {};
}


// @todo a way to feed the config
const conf   = path.resolve(process.cwd(), process.argv[2] || './config-gen');
const CONFIG = validateConfig(require(conf));

glob('**/**.json', {
  cwd: CONFIG.data 
}, (err, files) => {

  // 302/304s aren't helpful for generating a spec
  const REGEX_3XX = /30[0-9]\.json/;

  // Filter paths you do not want
  files = files.filter(file => {
    return !CONFIG.ignore.some(pattern => minimatch(file, pattern));
  }).filter(file => {
    return !REGEX_3XX.test(file)
  });

  const spec     = getSpecTemplate();
  const requests = filesRequests(files, CONFIG);
  
  spec.definitions = generateSpecDefs(requests.filter(req => {
    return !CONFIG.ignoreDefs.some(pattern => {
      return minimatch(req.url, pattern)
    });
  }));

  spec.paths = generateSpecPaths(requests, spec.definitions);

  console.log(Yaml.stringify(spec, 20, 2));
});
