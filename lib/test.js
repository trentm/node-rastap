//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// Copyright (c) 2018, Joyent, Inc.
// Portions copyright (c) 2015, James Halliday (from node-tape).
//
// `Test` class used in user test code, this includes all asserts.
//

var assert = require('assert-plus');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var common = require('./common');

// ---- globals

var has = common.has;
var defined = common.defined;

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
        // TODO: objectPrintDepth: self._objectPrintDepth
    };
    // TODO: Why support extra.actual and extra.expected?
    if (has(opts, 'actual') || has(extra, 'actual')) {
        res.actual = defined(extra.actual, opts.actual);
    }
    if (has(opts, 'expected') || has(extra, 'expected')) {
        res.expected = defined(extra.expected, opts.expected);
    }

    // TODO: if !ok, tape adds stack info here. Are they used? tap mentions
    //      'at' and 'stack' at https://www.node-tap.org/asserts/
    // TODO: if !ok, tape adds `res.error` here. Is that used?

    self.emit('assert', res);
};

Test.prototype.fail = function fail(msg, extra) {
    this._assert(false, {
        message: msg,
        operator: 'fail',
        extra: extra
    });
};

Test.prototype.pass = function pass(msg, extra) {
    this._assert(true, {
        message: msg,
        operator: 'pass',
        extra: extra
    });
};

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

module.exports = {
    Test: Test
};
