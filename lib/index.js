var extend = require('xtend/mutable');

var userThread = require('./userThread');
var appThread = require('./appThread');
var SingleThread = require('./SingleThread');

var dom = require('./dom');
var domEvent = require('./domEvent');

var model = require('./model');
var router = require('./router');

var WORKER_ENABLED = !!(global === global.window && global.URL && global.Worker);
var IN_WORKER_CONTEXT = !!(global === global.self && global.location);
var PATHNAME = WORKER_ENABLED && getPathname();

function duet(app, selector, options) {
    var singleThread;

    options = (typeof options == 'object' && options !== null && options) || {};
    options.bridges = (Array.isArray(options.bridges) && options.bridges) || [];

    if (!options.forceSingleThread) {

        if (WORKER_ENABLED) {
            return userThread(new global.Worker(PATHNAME), selector, options);
        }

        if (IN_WORKER_CONTEXT) {
            return appThread(global.self, app, options);
        }

    }

    singleThread = new SingleThread();
    userThread(singleThread.worker, selector, options);
    appThread(singleThread.self, app, options);
}

function getPathname() {
    var scripts, script;

    scripts = global.document.getElementsByTagName('script');
    script = scripts[scripts.length - 1].src;

    return new global.URL(script).pathname;
}

module.exports = extend(duet, {

    dom: dom,
    domFor: dom.domFor,

    domEvent: domEvent,
    event: domEvent, // alias
    ev: domEvent, // alias

    model: model,
    modelFor: model.modelFor,
    struct: model.struct,
    varhash: model.varhash,
    value: model.value,

    router: router
});
