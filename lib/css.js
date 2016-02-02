var extend = require('xtend/mutable');
var csjs = require('csjs');
var slice = Array.prototype.slice;

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
            post({type: 'CSS', data: queue.shift()});
        }
    }
}

function css() {
    var args, styles;

    args = slice.call(arguments);
    styles = csjs.apply(null, args);

    queue.push(csjs.getCss(styles));

    flush();

    return styles;
}

module.exports = extend(css, {
    init: init // [1]
});

// [1] TODO: These should not part of the public API
