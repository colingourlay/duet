var extend = require('xtend/mutable');

var userThread = require('./userThread');
var appThread = require('./appThread');
var SingleThread = require('./SingleThread');

var dom = require('./dom');
var domEvent = require('./domEvent');

var model = require('./model');
var localStorage = require('./localStorage');
var css = require('./css');
var router = require('./router');

var WORKER_ENABLED = !!(global === global.window && global.URL && global.Worker);
var IN_WORKER_CONTEXT = !!(global === global.self && global.location);
var PATHNAME = WORKER_ENABLED && (function getPathname() {
    var scripts, script;

    scripts = global.document.getElementsByTagName('script');
    script = scripts[scripts.length - 1].src;

    return new global.URL(script).pathname;
})();

function duet(app, selector, options) {
    var singleThread;

    function initAPI(postMessageToUser) {
        localStorage.init(postMessageToUser);
        css.init(postMessageToUser);
    }

    options = (typeof options == 'object' && options !== null && options) || {};

    if (!options.forceSingleThread) {

        if (WORKER_ENABLED) {
            return userThread(new global.Worker(PATHNAME), selector, options);
        }

        if (IN_WORKER_CONTEXT) {
            return initAPI(appThread(global.self, app, options));
        }

    }

    singleThread = new SingleThread();
    userThread(singleThread.worker, selector, options);
    initAPI(appThread(singleThread.self, app, options));
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

    localStorage: localStorage,

    css: css,

    router: router
});
