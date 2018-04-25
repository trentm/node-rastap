//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// Copyright (c) 2018, Joyent, Inc.
//
// Test results collection and TAP formatting.
//

var assert = require('assert-plus');
var stream = require('stream');
var util = require('util');
var VError = require('verror');

// ---- globals

var format = util.format;

// ---- Results class (test results readable stream)
//
// TODO: doc the results types and formats

function Results(opts) {
    assert.object(opts.harness, 'opts.harness');

    this._harness = opts.harness;
    this._started = false;

    stream.Readable.call(this, {objectMode: true});
}
util.inherits(Results, stream.Readable);

Results.prototype._read = function _read(_size) {
    if (!this._started) {
        this._started = true;
        this._harness.run();
    }
};


// ---- Rastap Results to TAP format stream

function TapFromResults() {
    stream.Transform.call(this, {objectMode: true});

    this.nasserts = 0;
    this.pass = 0;
    this.fail = 0;
    this.skip = 0;

    this.push('TAP version 13\n');
}
util.inherits(TapFromResults, stream.Transform);

TapFromResults.prototype._transform = function _transform(res, _enc, next) {
    assert.object(res, 'res');
    assert.string(res.type, 'res.type');
    assert.func(next, 'next');

    switch (res.type) {
        case 'test':
            this.push('# ' + res.test.name + '\n');
            break;
        case 'diagnostic':
            // TODO non-str format as JSON? or YAML? multiline?
            this.push('# ' + res.diagnostic + '\n');
            break;
        case 'assert':
            this._transformAssert(res.assert);
            break;
        default:
            throw new VError({
                info: {
                    result: res
                }
            }, 'unknown rastap result type: %j', res.type);
    }
    next();
};

TapFromResults.prototype._transformAssert = function _transformAssert(a) {
    var s;
    var bits = [];

    this.nasserts++;

    if (a.ok) {
        bits.push('ok');
        this.pass++;
    } else {
        bits.push('not ok');
        this.fail++;
    }
    bits.push(this.nasserts);
    bits.push(a.name);
    s = bits.join(' ') + '\n';

    if (!a.ok) {
        var errLines = [
            '    ---',
            '    TODO: error details',
            '    ...'
        ];
        s += errLines.join('\n') + '\n';
    }

    this.push(s);
};

TapFromResults.prototype._flush = function _flush(next) {
    this.push('\n');
    this.push(format('1..%d\n', this.nasserts));
    this.push(format('# tests %d\n', this.nasserts));
    this.push(format('# pass  %d\n', this.pass));
    this.push(format('# fail  %d\n', this.fail));
    this.push('\n');
    next();
};


// ---- exports

module.exports = {
    Results: Results,
    TapFromResults: TapFromResults
};
