var extend = require('xtend/mutable');
var hashMatch = require('hash-match');
var pathnameMatch = require('pathname-match');

var subscribers = [];
var postMessageToAppThread;
var postMessageToUserThread;

function handleMessage(type, data) {
    switch (type) {
        case 'SUBSCRIBER':
            onSubscriber(data);
            break;
        case 'INITIAL':
            onInitial(data);
            break;
        case 'CHANGE':
            onChange(data);
            break;
        default:
            break;
    }
}

function initAppThread(_postMessage) {
    if (typeof postMessageToUserThread !== 'function') {
        postMessageToUserThread = _postMessage;
    }
}

function initUserThread(_postMessage) {
    if (typeof postMessageToAppThread !== 'function') {
        postMessageToAppThread = _postMessage;
    }

    window.onclick = function onClick(event) {
        if (event.target.localName !== 'a' ||
            event.target.href === undefined ||
            window.location.host !== event.target.host) {
            return;
        }

        event.preventDefault();

        postMessageToAppThread({
            type: 'CHANGE',
            data: event.target.href
        });

        window.history.pushState({}, null, event.target.href)
    }

    window.onpopstate = function onPopState() {
        postMessageToAppThread({
            type: 'CHANGE',
            data: document.location.href
        });
    }
}

function subscribe(subscriber, isHashSubscriber) {
    if (typeof subscriber !== 'function') {
        return;
    }

    subscribers.push({
        callback: subscriber,
        isHashSubscriber: !!isHashSubscriber
    })

    postMessageToUserThread({
        type: 'SUBSCRIBER',
        data: subscribers.length - 1
    });
}

function parseLocation(href) {
    var path, hash, splitHREF;

    path = pathnameMatch(href);

    if (!path.length) {
        path = '/';
    }

    hash = '';
    splitHREF = href.split('#');

    if (splitHREF.length > 1) {
        hash = hashMatch('#'.concat(splitHREF.slice(1).join('#')));
    }

    return {
        path: path,
        hash: hash
    }
}

function notify(subscriber, location) {
    if (!subscriber.isHashSubscriber) {
        subscribers.callback(location.path);
    } else if (location.hash) {
        subscriber.callback(location.hash);
    }
}

function notifyAll(location) {
    subscribers.forEach(function (subscriber) {
        notify(subscriber, location);
    });
}

function onSubscriber(data) {
    postMessageToAppThread({
        type: 'INITIAL',
        data: {
            subscriberKey: data,
            href: document.location.href
        }
    });
}

function onInitial(data) {
    notify(subscribers[data.subscriberKey], parseLocation(data.href));
}

function onChange(data) {
    if (subscribers.length > 0) {
        notifyAll(parseLocation(data));
    }
}

module.exports = extend(subscribe, {
    namespace: 'LOCATION',
    handleMessage: handleMessage,
    initAppThread: initAppThread,
    initUserThread: initUserThread,

    // API
    subscribe: subscribe
});
