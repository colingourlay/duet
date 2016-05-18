var extend = require('xtend/mutable');

function event(model, fn, customData) {
    return function handle(data) {
        fn(model, {
            event: data.eventData,
            form: data.formData,
            custom: customData
        });
    };
}

module.exports = event;
