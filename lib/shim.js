function shim() {
    var shimmed = { worker: {} };

    shimmed.self = {postMessage: messenger(shimmed.worker)};
    shimmed.worker.postMessage = messenger(shimmed.self);

    return shimmed;
}

function messenger(destination) {
    return function postMessage(data) {
        setTimeout(function onTick() {
            if (typeof destination.onmessage === 'function') {
                destination.onmessage({data: data});
            }
        }, 0);
    }
}

module.exports = shim;
