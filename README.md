# duet

![duet logo](https://cldup.com/7VDXncDnbQ-2000x2000.png)

Write performant web apps that run inside web worker threads, without sacrificing easy access to main thread APIs such as the DOM.

```
$ npm install duet
```

## What?

A **duet** app runs concurrently in two threads, a main thread and a worker thread (playing a *duet*, if you pardon the pun).

Nearly all of your own code will be running inside a [web worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API), and the parts of your app that need to use APIs only accessible in the main thread (such as the `window` object or the DOM) are able to do so by using duet's communication **channels**.

Channels are provided by [separate modules](#modules-that-provide-channels), which define the types of messages that they will pass between threads, and provide functions you can call to listen to messages, or send them.

You initialise a duet app by letting it know about the channels you will be communicating on, and providing a callback function that will run inside your worker once all of the channels have been connected.

Here's a quick example app that uses the channel & API provided by [duet-virtual-dom](https://github.com/colingourlay/duet-virtual-dom) to render a button that updates its text whenever it's clicked:

```javascript
var duet    = require('duet');
var channel = require('duet-virtual-dom/channel');
var vdom    = require('duet-virtual-dom');
var h       = require('virtual-dom/h');

duet([channel], function () {
    var update = vdom('body');

    function view(state) {
        return h('button', {
            dataset: {click: render}
        }, state);
    }

    function render() {
        var state = (new Date()).toLocaleTimeString();

        update(view(state));
    }

    render();
});
```

## How?

A **duet** app is contained entirely inside a single JavaScript file, which is re-evaluated as a web worker. The magic happens when, depending on the environment, the script's execution forks, depending on the thread, and takes on its relevant responsibilities.

In browsers that don't support web workers, the worker thread and API is mocked, and the entire app will work inside the main thread, without your intervention.

## Example apps

* [duet example app](https://github.com/colingourlay/duet-example-app) - A basic counter app, using a virtual DOM, localStorage persistence and CSS Modules.
* [duet TodoMVC example app](https://github.com/colingourlay/todomvc/tree/master/examples/duet) - The MVC framework benchmark app, partially built with duet.

## Modules that provide channels

* [duet-virtual-dom](https://github.com/colingourlay/duet-virtual-dom) - Use a virtual DOM with duet by passing patches from the worker thread to the main thread, and expected DOM events back in.
* [duet-local-storage](https://github.com/colingourlay/duet-local-storage) - Use the browser's localStorage API with duet by reading and writing asynchronously across threads.
* [duet-location](https://github.com/colingourlay/duet-location) - Subscribe to in-app navigation & history state changes from duet' s worker thread.
* [duet-csjs](https://github.com/colingourlay/duet-csjs) - Use CSJS with duet by passing CSS Modules-enabled stylesheets from the worker thread to the main thread which are injected into the document's head.

If you want to build your own channel, [duet-channel](https://github.com/colingourlay/duet-channel) is what you're looking for.

