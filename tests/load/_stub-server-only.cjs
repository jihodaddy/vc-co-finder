/**
 * Preload module for Node/tsx that stubs `server-only` so the Phase 3 load
 * harness can import the same searchAdapter the RSC path uses without
 * triggering the runtime guard inside node_modules/server-only.
 *
 * Same effect vitest achieves via vitest.config.ts `resolve.alias`. We
 * duplicate the intent at Node's module-resolution layer because tsx has
 * no config-file entry point for `resolve.alias`.
 */
const Module = require('node:module');
const path = require('node:path');

// Synthesize a virtual module with empty exports, keyed by the absolute path
// of THIS preload file. Then rewire `server-only` requests to resolve here.
const VIRTUAL = path.resolve(__dirname, '_stub-server-only-empty.cjs');

// Prime require.cache for the virtual path with an empty module.
const stub = new Module(VIRTUAL);
stub.filename = VIRTUAL;
stub.exports = {};
stub.loaded = true;
require.cache[VIRTUAL] = stub;

const origResolve = Module._resolveFilename;
Module._resolveFilename = function patchedResolve(request, ...rest) {
  if (request === 'server-only') return VIRTUAL;
  return origResolve.call(this, request, ...rest);
};
