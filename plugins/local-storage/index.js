var channel = require('./channel');

var nextHandlerKey = 0;
var handlers = {};

function getItem(key, callback) {
    var handlerKey = nextHandlerKey++;

    handlers[handlerKey] = function (data) {
        callback(data.value);
    };

    channel.postMessageToMain({
        type: 'REQUEST',
        data: {
            key: key,
            handlerKey: handlerKey
        }
    });
}

function setItem(key, value) {
    channel.postMessageToMain({
        type: 'REQUEST',
        data: {
            key: key,
            value: value
        }
    });
}

function getOrSetItem(key, valueOrCallback) {
    if (typeof valueOrCallback === 'function') {
        getItem(key, valueOrCallback);
    } else {
        setItem(key, valueOrCallback);
    }
}

function onRequest(data) {
    if (!data.value) {
        return channel.postMessageToWorker({
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
    var handler = handlers[data.handlerKey];

    if (handler != null) {
        handler(data);
    }

    delete handlers[data.handlerKey];
}

channel.on('REQUEST', onRequest);
channel.on('RESPONSE', onResponse);

module.exports = getOrSetItem;
module.exports.getItem = getItem;
module.exports.setItem = setItem;
