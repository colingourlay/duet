var vdom = require('virtual-dom');
var serialize = require('vdom-serialized-patch/serialize');
var pathnameMatch = require('pathname-match');
var hashMatch = require('hash-match');

var msg = require('./msg');
var domEvent = require('./domEvent');

function appThread(self, app, options) {
    var postMessageToUserThread, currentVDOM, view, router, initialHREF;

    function render(state) {
        var nextVDOM, diff, patch;

        nextVDOM = view(state);
        diff = vdom.diff(currentVDOM, nextVDOM);
        patch = serialize(diff);
        currentVDOM = nextVDOM;

        domEvent.cycleHandlers();

        postMessageToUserThread({
            type: 'DOM::PATCH',
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

    function onInit(data) {
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

    function bridgesHandleMessageType(type, data) {
        options.bridges.some(function bridgeHandleMessageType(bridge) {
            if (typeof bridge._handleMessageType === 'function')

            return bridge._handleMessageType(type, data);
        });
    }

    function handleMessageType(type, data) {
        switch (type) {
            case 'INIT':
                onInit(data);
                break;
            case 'LOCATION':
                onLocation(data);
                break;
            case 'DOM::EVENT':
                onDomEvent(data);
                break;
            default:
                bridgesHandleMessageType(type, data);
                break;
        }
    }

    postMessageToUserThread = self.postMessage.bind(self);

    self.onmessage = msg(handleMessageType, options.isDebug);

    options.bridges.forEach(function (bridge) {
        if (typeof bridge._initAppThread === 'function') {
            bridge._initAppThread(postMessageToUserThread);
        }
    });
}

module.exports = appThread;
