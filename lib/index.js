var console = require('console');
var extend = require('xtend/mutable');
var struct = require('observ-struct');
var varhash = require('observ-varhash');
var value = require('observ');
var csjs = require('csjs');
var insertCSS = require('insert-css');
var vdom = require('virtual-dom');
var getFormData = require('form-data-set/element');
var hyperstyles = require('hyperstyles');
var hyperx = require('hyperx');
var serialize = require('vdom-serialized-patch/serialize');
var patch = require('vdom-serialized-patch/patch');
var eventNames = require('./eventNames');
var SingleThread = require('./SingleThread');
var slice = Array.prototype.slice;

var WORKER_ENABLED = !!(global === global.window && global.URL && global.Worker);
var IN_WORKER_CONTEXT = !!(global === global.self && global.location);
var PATHNAME = WORKER_ENABLED && (function getPathname() {
    var scripts, script;

    scripts = global.document.getElementsByTagName('script');
    script = scripts[scripts.length - 1].src;

    return new global.URL(script).pathname;
})();

var activeThread;
var isSingleThreaded = !WORKER_ENABLED && !IN_WORKER_CONTEXT;
var models = [];
var nextEventHandlerKey = 0;
var currentEventHandlers = {};
var nextEventHandlers = {};
var nextLocalStorageHandlerKey = 0;
var localStorageHandlers = {};
var localStorageQueue = [];
var cssQueue = [];

function _model(state) {
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

    model.event = _modelEvent;
    model.ev = _modelEvent;

    models.push(model);

    return model;
}

function _modelFor(state) {
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

function _event(model, fn, customData) {
    var handlerKey;

    handlerKey = nextEventHandlerKey++;

    nextEventHandlers[handlerKey] = function handleEvent(data) {
        fn(model, {
            event: data.eventData,
            form: data.formData,
            custom: customData
        });
    };

    return handlerKey;
}

function _modelEvent(fn, customData) {
    return _event(this, fn, customData);
}


function _postLocalStorage(args) {

    if (typeof args === 'object' && args.key != null) {
        localStorageQueue.push(args);
    }

    if (!localStorageQueue.length) {
        return;
    }

    if (typeof duet.postMessageToUser === 'function') {

        while (localStorageQueue.length) {
            duet.postMessageToUser({type: 'LOCAL_STORAGE', data: localStorageQueue.shift()});
        }

    } else if (duet.postMessageToUser == null && activeThread !== 'user') {

        setTimeout(_postLocalStorage, 10);

    }
}

function _localStorage(key, valueOrFn) {
    var handlerKey;

    if (typeof valueOrFn === 'function') {

        handlerKey = nextLocalStorageHandlerKey++;

        localStorageHandlers[handlerKey] = function handleLocalStorage(data) {
            valueOrFn(data.value);
        };

        _postLocalStorage({handlerKey: handlerKey, key: key});

        return handlerKey;

    }

    _postLocalStorage({key: key, value: valueOrFn});
}

function _postCSS(css) {

    if (typeof css === 'string' && css.length) {
        cssQueue.push(css);
    }

    if (!cssQueue.length) {
        return;
    }

    if (typeof duet.postMessageToUser === 'function') {

        while (cssQueue.length) {
            duet.postMessageToUser({type: 'CSS', data: cssQueue.shift()});
        }

    } else if (duet.postMessageToUser == null && activeThread !== 'user') {

        setTimeout(_postCSS, 10);

    }
}

function _css() {
    var args, styles;

    args = slice.call(arguments);
    styles = csjs.apply(null, args);

    if (activeThread !== 'user') {
        _postCSS(csjs.getCss(styles));
    }

    return styles;
}

function _domFor(styles) {
    return hyperx(hyperstyles(vdom.h, styles));
}

function _msg(handleMessageType) {
    return function handleMessage(e) {
        return handleMessageType(e.data.type, e.data.data);
    };
}

function _userThread(worker, selector, options) {
    var container, appEl, sheets, styleEl;

    function eventHandler(eventType, event) {
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
                type: 'EVENT',
                data: {
                    handlerKey: handlerKey,
                    eventType: eventType,
                    eventData: eventData,
                    formData: formData
                }
            });
        }
    }

    function listenTo(eventName) {
        document.addEventListener(eventName, eventHandler.bind(null, eventName));
    }


    function onCSS(data) {
        insertCSS(data);
    }

    function onPatch(data) {
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

    function handleMessageType(type, data) {
        if (options.isDebug) {
            console.debug('APP::' + type, data);
        }

        switch (type) {
            case 'CSS':
                onCSS(data);
                break;
            case 'PATCH':
                onPatch(data);
                break;
            case 'LOCAL_STORAGE':
                onLocalStorage(data);
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

    eventNames.forEach(listenTo);

    duet.postMessageToApp = worker.postMessage.bind(worker); // Protect?
    worker.onmessage = _msg(handleMessageType);
    worker.postMessage({
        type: 'READY'
    });
}

function _appThread(self, app, options) {
    var currentVDOM, view;

    function render(state) {
        var nextVDOM, diff, patch;

        nextVDOM = view(state);
        diff = vdom.diff(currentVDOM, nextVDOM);
        patch = serialize(diff);
        currentVDOM = nextVDOM;

        currentEventHandlers = nextEventHandlers;
        nextEventHandlers = {};
        nextEventHandlerKey = 0;

        self.postMessage({
            type: 'PATCH',
            data: patch
        });
    }

    function init(_view, model) {
        if (view) {
            throw new Error('tried to initialise app more than once');
        }

        view = _view;
        currentVDOM = vdom.h('div');
        render(model());
        model(render);
    }

    function onReady(data) {
        app(init);
    }

    function onEvent(data) {
        if (currentEventHandlers[data.handlerKey] != null) {
            currentEventHandlers[data.handlerKey](data);
        }
    }

    function onLocalStorage(data) {
        if (localStorageHandlers[data.handlerKey] != null) {
            localStorageHandlers[data.handlerKey](data);
        }
    }

    function handleMessageType(type, data) {
        if (options.isDebug) {
            console.debug('USER::' + type, data);
        }

        switch (type) {
            case 'READY':
                onReady(data);
                break;
            case 'EVENT':
                onEvent(data);
                break;
            case 'LOCAL_STORAGE':
                onLocalStorage(data);
                break;
            default:
                break;
        }
    }

    duet.postMessageToUser = self.postMessage.bind(self); // Protect?
    self.onmessage = _msg(handleMessageType);
}

function _duet(app, selector, options) {
    var thread;

    options = (typeof options == 'object' && options !== null && options) || {};

    if (!options.forceSingleThread) {

        if (WORKER_ENABLED) {
            activeThread = 'user';
            return _userThread(new global.Worker(PATHNAME), selector, options);
        }

        if (IN_WORKER_CONTEXT) {
            activeThread = 'app';
            return _appThread(global.self, app, options);
        }

    }

    isSingleThreaded = true;

    thread = new SingleThread();

    setTimeout(function () {
        _appThread(thread.self, app, options);
        setTimeout(function () {
            _userThread(thread.worker, selector, options);
        }, 0);
    }, 0);
}

var duet = extend(_duet, {
    struct: struct,
    varhash: varhash,
    value: value,
    model: _model,
    modelFor: _modelFor,
    event: _event,
    ev: _event,
    localStorage: _localStorage,
    css: _css,
    dom: hyperx(vdom.h),
    domFor: _domFor,
});

module.exports = duet;
