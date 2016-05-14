var getFormData = require('form-data-set/element');
var patch = require('vdom-serialized-patch/patch');
var concat = Array.prototype.concat;

var msg = require('./msg');
var domEventNames = require('./domEvent').domEventNames;

function userThread(worker, selector, options) {
    var postMessageToAppThread, container, target, domEventListeners;

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

            postMessageToAppThread({
                type: 'DOM::EVENT',
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
        var activeDomEventNames, activeElement;

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

        // 1) Patch DOM

        patch(target, data);

        setTimeout(function () {

            // 2) Update DOM event bindings

            activeDomEventNames = [];

            concat.apply(target, target.querySelectorAll('*'))
            .forEach(updateActiveDomEventsForDataAttributes);

            domEventNames.forEach(updateDomEventBinding);

            // 3) Focus element if needed

            activeElement = target.querySelector('[autofocus]');

            if (activeElement != null && document.activeElement !== activeElement) {
                activeElement.focus();
            }

        }, 0);
    }

    function onDomPatch(data) {
        window.requestAnimationFrame(updateDom.bind(null, data));
    }

    function bridgesHandleMessageType(type, data) {
        options.bridges.some(function bridgeHandleMessageType(bridge) {
            if (typeof bridge._handleMessageType === 'function') {
                return bridge._handleMessageType(type, data);
            }
        });
    }

    function handleMessageType(type, data) {
        switch (type) {
            case 'DOM::PATCH':
                onDomPatch(data);
                break;
            default:
                bridgesHandleMessageType(type, data);
                break;
        }
    }

    postMessageToAppThread = worker.postMessage.bind(worker);

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

        postMessageToAppThread({
            type: 'LOCATION',
            data: event.target.href
        });

        window.history.pushState({}, null, event.target.href)
    }

    window.onpopstate = function onPopState() {
        postMessageToAppThread({
            type: 'LOCATION',
            data: document.location.href
        });
    }

    worker.onmessage = msg(handleMessageType, options.isDebug);

    options.bridges.forEach(function (bridge) {
        if (typeof bridge._initUserThread === 'function') {
            bridge._initUserThread(postMessageToAppThread);
        }
    });

    postMessageToAppThread({
        type: 'INIT',
        data: document.location.href
    });
}

module.exports = userThread;
