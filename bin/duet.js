#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var optimist = require('optimist');
var browserify = require('browserify');
var mkdirp = require('mkdirp');
var rmdirp = require('mkdirp');
var babelify = require('babelify');
var es2015 = require('babel-preset-es2015');
var uglifyify = require('uglifyify');

var argv = optimist
    .default({
        entry: 'src/index.js',
        out: 'public',
        title: 'Hyper',
        debug: false
    }).argv;

var entry = path.resolve(argv.entry);
var out = path.resolve(argv.out);

if (!fs.existsSync(entry)) {
    process.exit(0);
}

if (fs.existsSync(out)) {
    rmdirp.sync(out);
}
mkdirp.sync(out);

var html = `<!doctype html>
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no"/>
    <title>${argv.title}</title>
</head>
<body></body>
<script src="index.js"></script>`;

fs.writeFileSync(out + '/index.html', html);

var js = browserify(entry, {debug: !!argv.debug})
    .transform(babelify.configure({presets: [es2015]}));

if (!argv.debug) {
    js = js.transform(uglifyify, {global: true});
}

js.bundle()
    .pipe(fs.createWriteStream(out + '/index.js'));

