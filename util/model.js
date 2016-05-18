var extend = require('xtend/mutable');
var struct = require('observ-struct');
var varhash = require('observ-varhash');
var value = require('observ');
var event = require('../bridges/virtual-dom/event');

var models = [];

function eventForModel(fn, customData) {
    return event(this, fn, customData);
}

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

    model.event = eventForModel;
    model.ev = eventForModel; // alias

    models.push(model);

    return model;
}

module.exports = extend(model, {
    struct: struct,
    varhash: varhash,
    value: value,
    model: model,
    modelFor: modelFor
});
