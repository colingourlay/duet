var csjs      = require('csjs');
var insertCSS = require('insert-css');
var channel   = require('./channel');
var slice     = Array.prototype.slice;

function css() {
    var args, styles;

    args = slice.call(arguments);
    styles = csjs.apply(null, args);

    channel.postMessageToMain({
        type: 'STYLES',
        data: csjs.getCss(styles)
    });

    return styles;
}

function onStyles(data) {
    insertCSS(data);
}

channel.on('STYLES', onStyles);

module.exports = css;
