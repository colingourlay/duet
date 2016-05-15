var vdom = require('virtual-dom');
var serialize = require('vdom-serialized-patch/serialize');
var pathnameMatch = require('pathname-match');
var hashMatch = require('hash-match');

var msg = require('./msg');
var domEvent = require('./domEvent');

function appThread(self, app, options) {
    var bridgeMessageHandlers, currentVDOM, view, router, initialHREF;

    function render(state) {
        var nextVDOM, diff, patch;

        nextVDOM = view(state);
        diff = vdom.diff(currentVDOM, nextVDOM);
        patch = serialize(diff);
        currentVDOM = nextVDOM;

        domEvent.cycleHandlers();

        self.postMessage({
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

    function bridgesHandleMessage(type, data) {
        var typeParts = type.split('::');

        if (typeParts.length !== 2) {
            return;
        }

        if (bridgeMessageHandlers[typeParts[0]] != null) {
            bridgeMessageHandlers[typeParts[0]](typeParts[1], data);
        }
    }

    function handleMessage(type, data) {
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
                bridgesHandleMessage(type, data);
                break;
        }
    }

    function postMessageFromBridge(namespace, message) {
        if (typeof message.type !== 'string') {
            return;
        }

        message.type = namespace + '::' + message.type;

        self.postMessage(message);
    }

    self.onmessage = msg(handleMessage, options.isDebug);

    bridgeMessageHandlers = {};

    options.bridges.forEach(function (bridge) {

        if (typeof bridge.namespace === 'string' &&
            typeof bridge.handleMessage === 'function') {

            bridgeMessageHandlers[bridge.namespace] = bridge.handleMessage;

        }

        if (typeof bridge.initAppThread === 'function') {

            bridge.initAppThread(postMessageFromBridge.bind(null, bridge.namespace));

        }

    });
}

module.exports = appThread;
