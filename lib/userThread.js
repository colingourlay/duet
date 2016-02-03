var insertCSS = require('insert-css');
var getFormData = require('form-data-set/element');
var patch = require('vdom-serialized-patch/patch');
var concat = Array.prototype.concat;
var slice = Array.prototype.slice;

var msg = require('./msg');
var domEventNames = require('./domEvent').domEventNames;

function userThread(worker, selector, options) {
    var container, target, domEventListeners;

    function domEventHandler(eventName, event) {
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

        handlerKey = event.target.dataset[eventName];

        if (typeof handlerKey === 'string') {

            eventData = Object.keys(event.constructor.prototype).reduce(propsReducer, {});

            formData = getFormData(event.target);

            if (!(new RegExp('\\b' + eventName + '\\b')).test(event.target.dataset['default'])) {
                event.preventDefault();
            }

            worker.postMessage({
                type: 'DOM_EVENT',
                data: {
                    handlerKey: handlerKey,
                    eventName: eventName,
                    eventData: eventData,
                    formData: formData
                }
            });
        }
    }

    function listenTo(domEventName) {
        domEventListeners[domEventName] = domEventHandler.bind(null, domEventName);
        target.addEventListener(domEventName, domEventListeners[domEventName]);
    }

    function unlistenTo(domEventName) {
        target.removeEventListener(domEventName, domEventListeners[domEventName]);
        delete domEventListeners[domEventName];
    }

    function updateDom(data) {
        var activeDomEventNames;

        function updateActiveDomEventsForDataAttributes(el) {
            Object.keys(el.dataset)
            .forEach(updateActiveDomEventsForDataAttribute);
        }

        function updateActiveDomEventsForDataAttribute(key) {
            if (domEventNames.indexOf(key) > -1 && activeDomEventNames.indexOf(key) < 0) {
                activeDomEventNames.push(key);
            }
        }

        function updateDomEventBinding(domEventName) {
            if (activeDomEventNames.indexOf(domEventName) > -1 && domEventListeners[domEventName] == null) {
                listenTo(domEventName);
            } else if (activeDomEventNames.indexOf(domEventName) < 0 && domEventListeners[domEventName] != null) {
                unlistenTo(domEventName);
            }
        }

        patch(target, data);

        activeDomEventNames = [];

        concat.apply(target, target.querySelectorAll('*'))
        .forEach(updateActiveDomEventsForDataAttributes);

        domEventNames.forEach(updateDomEventBinding);
    }

    function onDomPatch(data) {
        window.requestAnimationFrame(updateDom.bind(null, data));
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

    domEventListeners = {};

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
