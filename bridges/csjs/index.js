var csjs = require('csjs');
var extend = require('xtend/mutable');
var insertCSS = require('insert-css');
var slice = Array.prototype.slice;

var queue = [];
var postMessageToUserThread;

function flush() {
    if (typeof postMessageToUserThread === 'function') {
        while (queue.length) {
            postMessageToUserThread({type: 'CSJS::STYLES', data: queue.shift()});
        }
    }
}

function handleMessageType(type, data) {
    var wasHandled = false;

    switch (type) {
        case 'CSJS::STYLES':
            insertCSS(data.value);
            break;
        default:
            break;
    }

    return wasHandled;
}

function css() {
    var args, styles;

    args = slice.call(arguments);
    styles = csjs.apply(null, args);

    queue.push({value: csjs.getCss(styles)});

    flush();

    return styles;
}

function initAppThread(_postMessage) {
    if (typeof postMessageToUserThread !== 'function') {
        postMessageToUserThread = _postMessage;
        flush();
    }
}

module.exports = extend(css, {
    css: css,

    // TODO: These should not part of the public API
    _initAppThread: initAppThread,
    _handleMessageType: handleMessageType
});

// [1] TODO: These should not part of the public API
