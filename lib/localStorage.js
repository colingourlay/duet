var extend = require('xtend/mutable');

var nextHandlerKey = 0;
var handlers = {};
var queue = [];
var post;

function init(_post) {
    if (typeof post !== 'function') {
        post = _post;
        flush();
    }
}

function flush() {
    if (typeof post === 'function') {
        while (queue.length) {
            post({type: 'LOCAL_STORAGE', data: queue.shift()});
        }
    }
}

function getHandler(handlerKey) {
    return handlers[handlerKey];
}

function localStorage(key, valueOrFn) {
    var handlerKey;

    if (typeof valueOrFn === 'function') {

        handlerKey = nextHandlerKey++;

        handlers[handlerKey] = function handle(data) {
            valueOrFn(data.value);
        };

        queue.push({handlerKey: handlerKey, key: key});

        flush();

        return handlerKey;

    }

    queue.push({key: key, value: valueOrFn});

    flush();
}


module.exports = extend(localStorage, {
    init: init, // [1]
    getHandler: getHandler // [1]
});

// [1] TODO: These should not part of the public API
