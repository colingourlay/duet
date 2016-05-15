var csjs = require('csjs');
var extend = require('xtend/mutable');
var insertCSS = require('insert-css');
var slice = Array.prototype.slice;

var queue = [];
var postMessageToUserThread;

function flush() {
    if (typeof postMessageToUserThread === 'function') {
        while (queue.length) {
            postMessageToUserThread({
                type: 'STYLES',
                data: queue.shift()
            });
        }
    }
}

function handleMessage(type, data) {
    switch (type) {
        case 'STYLES':
            insertCSS(data.value);
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

function css() {
    var args, styles;

    args = slice.call(arguments);
    styles = csjs.apply(null, args);

    queue.push({
        value: csjs.getCss(styles)
    });

    flush();

    return styles;
}

module.exports = extend(css, {
    namespace: 'CSJS',
    handleMessage: handleMessage,
    initAppThread: initAppThread,

    // API
    css: css
});
