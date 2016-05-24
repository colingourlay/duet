function delegator(counterpart, channels, callback, options) {
    var connectFnName, messageHandlers;

    function postMessage(namespace, message) {
        if (typeof message.type !== 'string') {
            return;
        }

        message.type = namespace + '::' + message.type;
        counterpart.postMessage(message);
    }

    function connectChannel(channel) {
        if (typeof channel.namespace === 'string' &&
            typeof channel.handleMessage === 'function') {
            messageHandlers[channel.namespace] = channel.handleMessage;
        }

        if (typeof channel[connectFnName] === 'function') {
            channel[connectFnName](postMessage.bind(null, channel.namespace));
        }
    }

    function handleMessage(type, data) {
        var namespaced = type.split('::');

        if (namespaced.length !== 2) {
            return;
        }

        if (messageHandlers[namespaced[0]] != null) {
            messageHandlers[namespaced[0]](namespaced[1], data);
        }
    }

    function onmessage(event) {
        if (typeof options.logger === 'function') {
            options.logger(event.data.type, event.data.data);
        }

        return handleMessage(event.data.type, event.data.data);
    }

    connectFnName = (typeof callback === 'function') ? 'connectWorker' : 'connectMain';
    messageHandlers = {};
    channels.forEach(connectChannel);
    counterpart.onmessage = onmessage;

    if (typeof callback === 'function') {
        callback();
    }
}

module.exports = delegator;
