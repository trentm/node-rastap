//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// Copyright (c) 2018, Joyent, Inc.
//
// Shared general functions.
//

// Return the first given non-undefined item.
// From <https://github.com/substack/defined>
function defined() {
    for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] !== undefined) {
            return arguments[i];
        }
    }
    return undefined;
}

// From <https://github.com/joyent/node-jsprim#haskeyobj-key>
function has(obj, key) {
    return (Object.prototype.hasOwnProperty.call(obj, key));
}


module.exports = {
    defined: defined,
    has: has
};
