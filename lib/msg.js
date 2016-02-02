var console = require('console');

function msg(handleMessageType, logSource) {
    return function handleMessage(event) {
        if (logSource) {
            console.debug(logSource + '::' + event.data.type, event.data.data);
        }

        return handleMessageType(event.data.type, event.data.data);
    };
}

module.exports = msg;
