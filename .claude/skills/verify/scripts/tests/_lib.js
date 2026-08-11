/* Exposes run-load.js's runScreen() to the test files without duplicating it:
   run-load.js is a CLI (it runs its own case list on require), so the class
   body is sliced off before its `const cases = [` driver and evaluated here. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'run-load.js'), 'utf8');
const body = src.slice(0, src.indexOf('const cases = ['));
module.exports = new Function('require', '__dirname', body + '\nreturn { runScreen };')(require, path.join(__dirname, '..'));
