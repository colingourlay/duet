var console = require('console');

function msg(handleMessageType, isDebug) {
    return function handleMessage(event) {
        if (isDebug) {
            console.debug(event.data.type, event.data.data);
        }

        return handleMessageType(event.data.type, event.data.data);
    };
}

module.exports = msg;
