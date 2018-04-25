//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// Copyright (c) 2018, Joyent, Inc.
//
// The singleton harness created per test file.
//

var assert = require('assert-plus');
var exeunt = require('exeunt');
var vasync = require('vasync');
var VError = require('verror');

var results = require('./results');

// ---- globals

var gHarness;


// ---- Harness class

function Harness() {
    this._tests = [];
    this._results = new results.Results({harness: this});
    this._tapResults = new results.TapFromResults();
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

// Get the singleton Harness object for this process.
function getHarness() {
    if (!gHarness) {
        gHarness = new Harness();
    }
    return gHarness;
}

// ---- exports

module.exports = {
    getHarness: getHarness
};
