var delegator = require('./delegator');
var shim = require('./shim');

var WORKER_ENABLED = !!(global === global.window && global.URL && global.Worker);
var IN_WORKER_CONTEXT = !!(global === global.self && global.location);
var PATHNAME = WORKER_ENABLED && (function getPathname() {
    var scripts = global.document.getElementsByTagName('script');
    return new global.URL(scripts[scripts.length - 1].src).pathname;
})();

function duet(channels, callback, options) {
    var shimmed;

    if (typeof callback !== 'function') {
        throw new Error('duet callback is not a function');
    }

    channels = (Array.isArray(channels) && channels) || [];

    options = (typeof options == 'object' && options !== null && options) || {};

    if (!options.forceShim) {

        if (WORKER_ENABLED) {
            return delegator(new global.Worker(PATHNAME), channels, null, options);
        }

        if (IN_WORKER_CONTEXT) {
            return delegator(global.self, channels, callback, options);
        }

    }

    shimmed = shim();

    delegator(shimmed.worker, channels, null, options);
    delegator(shimmed.self, channels, callback, options);
}

module.exports = duet;
