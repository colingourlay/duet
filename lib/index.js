var extend = require('xtend/mutable');
var initThread = require('./initThread');
var SingleThread = require('./SingleThread');

var WORKER_ENABLED = !!(global === global.window && global.URL && global.Worker);
var IN_WORKER_CONTEXT = !!(global === global.self && global.location);
var PATHNAME = WORKER_ENABLED && getPathname();

function duet(bridges, app, options) {
    var singleThread;

    bridges = (Array.isArray(bridges) && bridges) || [];

    if (typeof app !== 'function') {
        throw new Error('app is not a function');
    }

    options = (typeof options == 'object' && options !== null && options) || {};

    if (!options.forceSingleThread) {

        if (WORKER_ENABLED) {
            return initThread(new global.Worker(PATHNAME), bridges, null, options);
        }

        if (IN_WORKER_CONTEXT) {
            return initThread(global.self, bridges, app, options);
        }

    }

    singleThread = new SingleThread();
    initThread(singleThread.worker, bridges, null, options);
    initThread(singleThread.self, bridges, app, options);
}

function getPathname() {
    var scripts, script;

    scripts = global.document.getElementsByTagName('script');
    script = scripts[scripts.length - 1].src;

    return new global.URL(script).pathname;
}

module.exports = duet;
