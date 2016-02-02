var extend = require('xtend/mutable');
var struct = require('observ-struct');
var varhash = require('observ-varhash');
var value = require('observ');

var forModel = require('./domEvent').forModel;

var models = [];

function modelFor(state) {
    var model;

    if (state.__MODEL_REFERENCE__ == null) {
        throw new Error('__MODEL_REFERENCE__ not found on state');
    }

    model = models[state.__MODEL_REFERENCE__];

    if (model == null) {
        throw new Error('__MODEL_REFERENCE__ is invalid');
    }

    return model;
}


function model(state) {
    var model;

    state = typeof state === 'object' ? state : {};

    if (state.__MODEL_REFERENCE__ != null) {
        throw new Error('"__MODEL_REFERENCE__" is a reserved key');
    }

    state.__MODEL_REFERENCE__ = models.length;

    if (state.event != null) {
        throw new Error('"event" is a reserved key');
    }

    model = struct(state);

    model.event = forModel;
    model.ev = forModel; // alias

    models.push(model);

    return model;
}

module.exports = extend(model, {
    struct: struct,
    varhash: varhash,
    value: value,
    modelFor: modelFor
});
