var insertCSS = require('insert-css');
var getFormData = require('form-data-set/element');
var patch = require('vdom-serialized-patch/patch');

var msg = require('./msg');
var domEventNames = require('./domEvent').domEventNames;

function userThread(worker, selector, options) {
    var container, appEl, sheets, styleEl;

    function domEventHandler(eventType, event) {
        var handlerKey, eventData, formData;

        function propsReducer(props, key) {
            var value = event[key];

            if (key.charAt(0) === key.charAt(0).toLowerCase() && (
                typeof value === 'number' ||
                typeof value === 'string' ||
                typeof value === 'boolean')) {

                props[key] = value;
            }

            return props;
        }

        handlerKey = event.target['data-' + eventType];

        if (typeof handlerKey === 'string') {

            eventData = Object.keys(event.constructor.prototype).reduce(propsReducer, {});

            formData = getFormData(event.target);

            if (!(new RegExp('\\b' + eventType + '\\b')).test(event.target['data-default'])) {
                event.preventDefault();
            }

            worker.postMessage({
                type: 'DOM_EVENT',
                data: {
                    handlerKey: handlerKey,
                    eventType: eventType,
                    eventData: eventData,
                    formData: formData
                }
            });
        }
    }

    function listenTo(domEventName) {
        document.addEventListener(domEventName, domEventHandler.bind(null, domEventName));
    }


    function onDomPatch(data) {
        window.requestAnimationFrame(function onAnimationFrame() {
            patch(target, data);
        });
    }

    function onLocalStorage(data) {
        if (!data.value) {
            return worker.postMessage({
                type: 'LOCAL_STORAGE',
                data: {
                    handlerKey: data.handlerKey,
                    value: localStorage.getItem(data.key)
                }
            });
        }

        localStorage.setItem(data.key, data.value);
    }

    function onCSS(data) {
        insertCSS(data);
    }

    function handleMessageType(type, data) {
        switch (type) {
            case 'DOM_PATCH':
                onDomPatch(data);
                break;
            case 'LOCAL_STORAGE':
                onLocalStorage(data);
                break;
            case 'CSS':
                onCSS(data);
                break;
            default:
                break;
        }
    }

    container = document.querySelector(selector);

    if (container == null) {
        throw new Error('selector did not match an element');
    }

    target = document.createElement('div');
    container.insertBefore(target, container.firstChild);

    domEventNames.forEach(listenTo);

    window.onclick = function onClick(event) {
        if (event.target.localName !== 'a' ||
            event.target.href === undefined ||
            window.location.host !== event.target.host) {
            return;
        }

        event.preventDefault();

        worker.postMessage({
            type: 'LOCATION',
            data: event.target.href
        });

        window.history.pushState({}, null, event.target.href)
    }

    window.onpopstate = function onPopState() {
        worker.postMessage({
            type: 'LOCATION',
            data: document.location.href
        });
    }

    worker.onmessage = msg(handleMessageType, options.isDebug && 'APP');

    worker.postMessage({
        type: 'READY',
        data: document.location.href
    });
}

module.exports = userThread;
