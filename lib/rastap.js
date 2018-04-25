//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// Copyright (c) 2018, Joyent, Inc.
//

var getHarness = require('./harness').getHarness;
var Test = require('./test').Test;

function createTest(name, opts, cb) {
    var harness = getHarness();

    var t = new Test(name, opts, cb);
    harness.addTest(t);
}

module.exports = createTest; // For `var test = require('rastap');` usage.
module.exports.test = createTest;
