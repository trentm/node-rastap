//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// Copyright (c) 2018, Joyent, Inc.
// Portions copyright (c) 2015, James Halliday (from node-tape).
//

var assert = require('assert-plus');
var EventEmitter = require('events').EventEmitter;
var exeunt = require('exeunt');
var stream = require('stream');
var util = require('util');
var vasync = require('vasync');
var VError = require('verror');

// ---- globals

var format = util.format;

// ---- internal support stuff

// Return the first given non-undefined item.
// From <https://github.com/substack/defined>
function defined() {
    for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] !== undefined) { return arguments[i]; }
    }
}

// From <https://github.com/joyent/node-jsprim#haskeyobj-key>
function has(obj, key) {
    return (Object.prototype.hasOwnProperty.call(obj, key));
}

// ---- results
//
// TODO: doc the results types and formats

function Results(opts) {
    assert.object(opts.harness, 'opts.harness');

    this._harness = opts.harness;
    this._started = false;

    stream.Readable.call(this, {objectMode: true});
}
util.inherits(Results, stream.Readable);

Results.prototype._read = function (_size) {
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

TapFromResults.prototype._transform = function _transform(res, encoding, next) {
    assert.object(res, 'res');
    assert.string(res.type, 'res.type');
    assert.func(next, 'next');

    switch (res.type) {
        case 'test':
            this.push('# ' + res.test.name + '\n');
            break;
        case 'diagnostic':
            // TODO more with diagnostic: non-str format as JSON? or YAML? multiline?
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
};


// ---- harness (a singleton)

var gHarness;

function Harness() {
    var self = this;

    this._tests = [];
    this._results = new Results({harness: this});
    this._tapResults = new TapFromResults();
    this._running = false;
    this._runningTest = null;

    this._results
        .pipe(this._tapResults)
        .pipe(process.stdout);
}

Harness.prototype.addTest = function addTest(t) {
    if (this._runningTest) {
        this._runningTest.push(t);
        throw new VError('TODO: subtests');
    } else {
        this._tests.push(t);
    }
};

Harness.prototype.run = function run() {
    var self = this;

    assert.ok(self._tests.length > 0);
    assert.ok(!self._running, 'Harness.run() called twice');

    this._running = true;
    this._runTests(self._tests, function doneRunningTests(err) {
        if (err) {
            throw new VError({cause: err}, 'TODO: handle _runTests err');
        }
        self._results.push(null);  // finished producing results

        if (self._tapResults.fail > 0) {
            // TODO: want hard exit instead?
            exeunt.softExit(1);
        }
    });
};

Harness.prototype._runTests = function _runTests(tests, cb) {
    var self = this;

    vasync.whilst(
        function stillHaveTestsToRun() {
            return (tests.length > 0);
        },
        function runNextTest(next) {
            self._runTest(tests.shift(), next);
        },
        function doneRunningTheseTests(err) {
            cb(err);
        }
    );
};

Harness.prototype._runTest = function _runTest(t, cb) {
    assert.object(t, 't');
    assert.func(cb, 'cb');
    var self = this;

    self._runningTest = t;

    t.on('assert', function onTestAssert(a) {
        self._results.push({type: 'assert', assert: a});
    });
    t.on('diagnostic', function onTestAssert(d) {
        self._results.push({type: 'diagnostic', diagnostic: d});
    });

    self._results.push({type: 'test', test: {name: t._name}});
    t._run(function doneRunningTest(err) {
        if (err) {
            cb(err);
        } else if (t._children.length > 0) {
            self._runTests(t._children, cb);
        } else {
            cb();
        }
    });
};

function getHarness() {
    if (!gHarness) {
        gHarness = new Harness();
    }
    return gHarness;
}

// ---- Test (a grouping of asserts, an possible sub-`Test`s)
//
// TODO: document events: assert, diagnostic, others?

function Test(name, opts, cb) {
    if (cb === undefined) {
        cb = opts;
        opts = {};
    }
    assert.string(name, 'name');
    assert.object(opts, 'opts');
    assert.func(cb, 'cb');

    this._name = name;
    this._opts = opts;
    this._cb = cb;
    this._children = [];
    this._ended = false;
}

util.inherits(Test, EventEmitter);

Test.prototype._run = function _run(endCb) {
    assert.func(endCb, 'endCb');
    this._endCb = endCb;
    this._cb(this);
};

Test.prototype.end = function end(err) {
    var self = this;
    if (err) {
        this.error(err);
    }

    if (this._ended) {
        // TODO: provide location details if possible
        this.fail('<Test>.end() called twice');
        return;
    }
    this._ended = true;

    // TODO: plan handling

    this._endCb();
};


Test.prototype._assert = function _assert(ok, opts) {
    var self = this;
    var extra = opts.extra || {};

    var res = {
        ok: Boolean(ok),
        skip: defined(extra.skip, opts.skip),
        name: defined(extra.message, opts.message, '(unnamed assert)'),
        operator: defined(extra.operator, opts.operator)
        // XXX
        // objectPrintDepth: self._objectPrintDepth
    };
    if (has(opts, 'actual') || has(extra, 'actual')) {
        res.actual = defined(extra.actual, opts.actual);
    }
    if (has(opts, 'expected') || has(extra, 'expected')) {
        res.expected = defined(extra.expected, opts.expected);
    }

    if (!ok) {
        // XXX VError
        res.error = defined(extra.error, opts.error, new Error(res.name));

        // TODO: tape adds stack info here, are those vars used by anything?
        //      If so, perhaps lift VError or Bunyan call stack inspection code.
    }

    self.emit('assert', res);

    // XXX plan handling?
};

Test.prototype.fail = function (msg, extra) {
    this._assert(false, {
        message: msg,
        operator: 'fail',
        extra: extra
    });
};

Test.prototype.pass = function (msg, extra) {
    this._assert(true, {
        message: msg,
        operator: 'pass',
        extra: extra
    });
};

// XXX break compat and change `extra` to be msg interpolation args a la VError and bunyan?
Test.prototype.equal = function equal(a, b, msg, extra) {
    this._assert(a === b, {
        message: defined(msg, 'should be equal'),
        operator: 'equal',
        actual: a,
        expected: b,
        extra: extra
    });
};


// ---- exports

function createTest(name, opts, cb) {
    var harness = getHarness();

    var t = new Test(name, opts, cb);
    harness.addTest(t);
}

module.exports = createTest; // For `var test = require('rastap');` usage.
module.exports.test = createTest;
