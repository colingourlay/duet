var extend = require('xtend/mutable');
var walk = require('tree-walk');
var VirtualNode = require('virtual-dom/vnode/vnode');
var diff = require('virtual-dom/diff');
var serialize = require('vdom-serialized-patch/serialize');
var patch = require('vdom-serialized-patch/patch');
var getFormData = require('form-data-set/element');
var eventNames = require('./eventNames');
var concat = Array.prototype.concat;

var nextStoreKey = 0;
var store = {};

var postMessageToAppThread;
var postMessageToUserThread;

function handleMessage(type, data) {
    switch (type) {
        case 'CREATE':
            onCreate(data);
            break;
        case 'PATCH':
            onPatch(data);
            break;
        case 'EVENT':
            onEvent(data);
            break;
        default:
            break;
    }
}

function initAppThread(_postMessage) {
    if (typeof postMessageToUserThread !== 'function') {
        postMessageToUserThread = _postMessage;
    }
}

function initUserThread(_postMessage) {
    if (typeof postMessageToAppThread !== 'function') {
        postMessageToAppThread = _postMessage;
    }
}

function vdom(selector, tree) {
    var key = nextStoreKey++;

    store[key] = {
        tree: new VirtualNode('div'),
        eventHandlers: []
    };

    postMessageToUserThread({
        type: 'CREATE',
        data: {
            key: key,
            selector: selector
        }
    });

    if (tree) {
        update(key, tree);
    }

    return update.bind(null, key);
}

function update(key, tree) {
    var stored, serializedDiff;

    stored = store[key];

    stored.eventHandlers.length = 0;

    walk.preorder(tree, function (value, key, parent) {
        if (eventNames.indexOf(key) > -1) {
            parent[key] = stored.eventHandlers.length;
            stored.eventHandlers.push(value);
        }
    });

    serializedDiff = serialize(diff(stored.tree, tree));

    stored.tree = tree;

    postMessageToUserThread({
        type: 'PATCH',
        data: {
            key: key,
            diff: serializedDiff
        }
    });

}

function primitivePropsReducer(obj, atObj, props, key) {
    var value;

    try {
        value = obj[key];
    } catch (e) {
        return props;
    }

    if (key.charAt(0) === key.charAt(0).toLowerCase() && (
        typeof value === 'number' ||
        typeof value === 'string' ||
        typeof value === 'boolean')) {

        props[key] = value;
    }

    return props;
}

function getPrimitiveProps(obj, atObj) {
    var props = {};

    if (atObj) {
        return Object.keys(atObj).reduce(primitivePropsReducer.bind(null, obj, atObj), props);
    }

    for (key in obj) {
        props = primitivePropsReducer(obj, obj, props, key);
    }

    return props;
}

function eventListener(key, eventName, event) {
    var handlerKey, eventData, valueData;

    handlerKey = event.target.dataset[eventName];

    if (typeof handlerKey === 'string') {

        setTimeout(function () {
            eventData = getPrimitiveProps(event, event.constructor.prototype);
            eventData.target = getPrimitiveProps(event.target, Element);
            valueData = getFormData(event.target);

            if (!(new RegExp('\\b' + eventName + '\\b')).test(event.target.dataset.preventDefault)) {
                event.preventDefault();
            }

            postMessageToAppThread({
                type: 'EVENT',
                data: {
                    key: key,
                    handlerKey: handlerKey,
                    eventData: eventData,
                    valueData: valueData
                }
            });
        }, 0);

    }
}

function updateDom(data) {
    var stored, activeEventNames, activeElement;

    function updateActiveEventsForDataAttributes(el) {
        Object.keys(el.dataset)
        .forEach(updateActiveEventsForDataAttribute);
    }

    function updateActiveEventsForDataAttribute(propName) {
        if (eventNames.indexOf(propName) > -1 && activeEventNames.indexOf(propName) < 0) {
            activeEventNames.push(propName);
        }
    }

    function listenTo(eventName) {
        stored.eventListeners[eventName] = eventListener.bind(null, data.key, eventName);
        stored.target.addEventListener(eventName, stored.eventListeners[eventName]);
    }

    function unlistenTo(eventName) {
        stored.target.removeEventListener(eventName, stored.eventListeners[eventName]);
        delete stored.eventListeners[eventName];
    }

    function updateEventBinding(eventName) {
        if (activeEventNames.indexOf(eventName) > -1 && stored.eventListeners[eventName] == null) {
            listenTo(eventName);
        } else if (activeEventNames.indexOf(eventName) < 0 && stored.eventListeners[eventName] != null) {
            unlistenTo(eventName);
        }
    }

    stored = store[data.key];

    // 1) Patch DOM

    stored.target = patch(stored.target, data.diff);

    // 2) Update DOM event bindings

    activeEventNames = [];

    concat.apply(stored.target, stored.target.getElementsByTagName('*'))
    .forEach(updateActiveEventsForDataAttributes);

    eventNames.forEach(updateEventBinding);

    // 3) Focus element if needed

    activeElement = stored.target.querySelector('[autofocus]');

    if (activeElement != null && document.activeElement !== activeElement) {
        activeElement.focus();
    }
}

function onCreate(data) {
    var container, stored;

    container = document.querySelector(data.selector);

    if (container == null) {
        throw new Error('selector did not match an element');
    }

    stored = store[data.key];

    // When not single threaded
    if (stored == null) {
        store[data.key] = {};
        stored = store[data.key];
    }

    stored.target = document.createElement('div');
    container.insertBefore(stored.target, container.firstChild);

    stored.eventListeners = {};
}

function onPatch(data) {
    window.requestAnimationFrame(updateDom.bind(null, data));
}

function onEvent(data) {
    var handler = store[data.key].eventHandlers[data.handlerKey];

    if (handler != null) {
        handler(data.eventData, data.valueData);
    }
}

module.exports = extend(vdom, {
    namespace: 'VIRTUAL_DOM',
    handleMessage: handleMessage,
    initAppThread: initAppThread,
    initUserThread: initUserThread,

    // API
    vdom: vdom
});
