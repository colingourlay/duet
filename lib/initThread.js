var msg = require('./msg');

function initThread(thread, bridges, app, options) {
    var bridgeInitFnName, handlers;

    function postMessage(namespace, message) {
        if (typeof message.type !== 'string') {
            return;
        }

        message.type = namespace + '::' + message.type;

        thread.postMessage(message);
    }

    function handleMessage(type, data) {
        var typeParts = type.split('::');

        if (typeParts.length !== 2) {
            return;
        }

        if (handlers[typeParts[0]] != null) {
            handlers[typeParts[0]](typeParts[1], data);
        }
    }

    handlers = {};
    bridgeInitFnName = (app === null) ? 'initUserThread' : 'initAppThread';

    bridges.forEach(function (bridge) {

        if (typeof bridge.namespace === 'string' &&
            typeof bridge.handleMessage === 'function') {
            handlers[bridge.namespace] = bridge.handleMessage;
        }

        if (typeof bridge[bridgeInitFnName] === 'function') {
            bridge[bridgeInitFnName](postMessage.bind(null, bridge.namespace));
        }

    });

    thread.onmessage = msg(handleMessage, options.isDebug);

    if (app !== null) {
        app();
    }
}

module.exports = initThread;
