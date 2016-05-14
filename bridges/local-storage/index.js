var extend = require('xtend/mutable');

var nextHandlerKey = 0;
var handlers = {};
var queue = [];
var postMessageToAppThread;
var postMessageToUserThread;

function flush() {
    if (typeof postMessageToUserThread === 'function') {
        while (queue.length) {
            postMessageToUserThread({
                type: 'LOCAL_STORAGE::REQUEST',
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
    if (typeof valueOrFn === 'function') {
        getItem(key, valueOrCallback);
    } else {
        setItem(key, valueOrCallback);
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

function onRequest(data) {
    if (!data.value) {
        return postMessageToAppThread({
            type: 'LOCAL_STORAGE::RESPONSE',
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

function handleMessageType(type, data) {
    var wasHandled = false;

    switch (type) {
        case 'LOCAL_STORAGE::REQUEST':
            onRequest(data);
            break;
        case 'LOCAL_STORAGE::RESPONSE':
            onResponse(data);
            break;
        default:
            break;
    }

    return wasHandled;
}

module.exports = extend(getOrSet, {
    getItem: getItem,
    setItem: setItem,

    // TODO: These should not part of the public API
    _initAppThread: initAppThread,
    _initUserThread: initUserThread,
    _handleMessageType: handleMessageType
});
