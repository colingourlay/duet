var vdom = require('virtual-dom');
var serialize = require('vdom-serialized-patch/serialize');
var pathnameMatch = require('pathname-match');
var hashMatch = require('hash-match');

var msg = require('./msg');
var domEvent = require('./domEvent');
var localStorage = require('./localStorage');

function appThread(self, app, options) {
    var currentVDOM, view, router, initialHREF;

    function render(state) {
        var nextVDOM, diff, patch;

        nextVDOM = view(state);
        diff = vdom.diff(currentVDOM, nextVDOM);
        patch = serialize(diff);
        currentVDOM = nextVDOM;

        domEvent.cycleHandlers();

        self.postMessage({
            type: 'DOM_PATCH',
            data: patch
        });
    }

    function init(_view, model, _router) {
        if (view) {
            throw new Error('tried to initialise app more than once');
        }

        view = _view;
        currentVDOM = vdom.h('div');
        render(model());
        model(render);

        router = _router;
        onLocation(initialHREF);
    }

    function onReady(data) {
        initialHREF = data;
        app(init);
    }

    function onLocation(data) {
        var route, splitLocation;

        if (typeof router !== 'function') {
            return;
        }

        if (!options.isHashRouter) {

            route = pathnameMatch(data);

            if (!route.length) {

                route = '/';
            }

        } else {

            splitLocation = data.split('#');

            if (splitLocation.length > 1) {

                splitLocation.shift();

                route = hashMatch('#'.concat(splitLocation.join('#')));
            }

        }

        if (route) {
            router(route);
        }

    }

    function onDomEvent(data) {
        var handler = domEvent.getHandler(data.handlerKey);

        if (handler != null) {
            handler(data);
        }
    }

    function onLocalStorage(data) {
        var handler = localStorage.getHandler(data.handlerKey);

        if (handler != null) {
            handler(data);
        }
    }

    function handleMessageType(type, data) {
        switch (type) {
            case 'READY':
                onReady(data);
                break;
            case 'LOCATION':
                onLocation(data);
                break;
            case 'DOM_EVENT':
                onDomEvent(data);
                break;
            case 'LOCAL_STORAGE':
                onLocalStorage(data);
                break;
            default:
                break;
        }
    }

    self.onmessage = msg(handleMessageType, options.isDebug && 'USER');

    return self.postMessage.bind(self);
}

module.exports = appThread;
