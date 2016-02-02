function SingleThread() {
    this.worker = {};
    this.self = {postMessage: messenger(this.worker)};
    this.worker.postMessage = messenger(this.self);
}

function messenger(destination) {
    return function postMessage(data) {
        setTimeout(function tick() {
            if (typeof destination.onmessage === 'function') {
                destination.onmessage({data: data});
            }
        }, 0);
    }
}

module.exports = SingleThread;
