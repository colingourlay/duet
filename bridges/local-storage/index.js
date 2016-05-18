var extend = require('xtend/mutable');

var nextHandlerKey = 0;
var handlers = {};
var queue = [];
var postMessageToAppThread;
var postMessageToUserThread;

function handleMessage(type, data) {
    switch (type) {
        case 'REQUEST':
            onRequest(data);
            break;
        case 'RESPONSE':
            onResponse(data);
            break;
        default:
            break;
    }
}

function initAppThread(_postMessage) {
    if (typeof postMessageToUserThread !== 'function') {
        postMessageToUserThread = _postMessage;
        flush();
    }
}

function initUserThread(_postMessage) {
    if (typeof postMessageToAppThread !== 'function') {
        postMessageToAppThread = _postMessage;
    }
}

function flush() {
    if (typeof postMessageToUserThread === 'function') {
        while (queue.length) {
            postMessageToUserThread({
                type: 'REQUEST',
                data: queue.shift()
            });
        }
    }
}

function getHandler(handlerKey) {
    return handlers[handlerKey];
}

function getItem(key, callback) {
    var handlerKey = nextHandlerKey++;

    handlers[handlerKey] = function handle(data) {
        callback(data.value);
    };

    queue.push({handlerKey: handlerKey, key: key});

    flush();
}

function setItem(key, value) {
    queue.push({key: key, value: value});

    flush();
}

function getOrSet(key, valueOrCallback) {
    if (typeof valueOrCallback === 'function') {
        getItem(key, valueOrCallback);
    } else {
        setItem(key, valueOrCallback);
    }
}

function onRequest(data) {
    if (!data.value) {
        return postMessageToAppThread({
            type: 'RESPONSE',
            data: {
                handlerKey: data.handlerKey,
                value: global.localStorage.getItem(data.key)
            }
        });
    }

    global.localStorage.setItem(data.key, data.value);
}

function onResponse(data) {
    var handler = getHandler(data.handlerKey);

    if (handler != null) {
        handler(data);
    }
}

module.exports = extend(getOrSet, {
    namespace: 'LOCAL_STORAGE',
    handleMessage: handleMessage,
    initAppThread: initAppThread,
    initUserThread: initUserThread,

    // API
    getItem: getItem,
    setItem: setItem
});
