var extend = require('xtend/mutable');
var virtualHyperscript = require('virtual-dom/h');
var hyperstyles = require('hyperstyles');
var hyperx = require('hyperx');

var x = hyperx(virtualHyperscript);

function styledH(styles) {
    return hyperstyles(virtualHyperscript, styles);
}

function styledX(styles) {
    return hyperx(hyperstyles(virtualHyperscript, styles));
}

module.exports = extend(x, {
    h: virtualHyperscript,
    x: x,
    styled: styledX,
    styledH: styledH,
    styledX: styledX
});
