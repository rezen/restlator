'use strict';


const codes = {
  'Successful':   /^2/,
  'Not there':    /^3/ ,
  'Forbidden':    /^4/,
  'Broke server': /^5/
};

module.exports.description = function(code) {
  if (code instanceof Number) {
    code = '' + code;
  }

  for (let descriptor in codes) {
    let pattern = codes[descriptor];
    if (pattern.test(code)) {
      return descriptor;
    }
  }

  return '';
};
