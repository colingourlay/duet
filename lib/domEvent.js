var extend = require('xtend/mutable');

var domEventNames = require('./domEventNames');

var nextHandlerKey = 0;
var currentHandlers = {};
var nextHandlers = {};

function domEvent(model, fn, customData) {
    var handlerKey;

    handlerKey = nextHandlerKey++;

    nextHandlers[handlerKey] = function handle(data) {
        fn(model, {
            event: data.eventData,
            form: data.formData,
            custom: customData
        });
    };

    return handlerKey;
}

function forModel(fn, customData) {
    return domEvent(this, fn, customData);
}

function getHandler(handlerKey) {
    return currentHandlers[handlerKey];
}

function cycleHandlers() {
    currentHandlers = nextHandlers;
    nextHandlers = {};
    nextHandlerKey = 0;
}

module.exports = extend(domEvent, {
    domEventNames: domEventNames,
    forModel: forModel,
    getHandler: getHandler, // [1]
    cycleHandlers: cycleHandlers // [1]
});

// [1] TODO: These should not part of the public API
