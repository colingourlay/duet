var extend = require('xtend/mutable');
var vdom = require('virtual-dom');
var hyperstyles = require('hyperstyles');
var hyperx = require('hyperx');

function domFor(styles) {
    return hyperx(hyperstyles(vdom.h, styles));
}

var dom = hyperx(vdom.h);

module.exports = extend(dom, {
    domFor: domFor
});
