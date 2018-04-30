var test = require('tap').test;

test('skipping some stuff', function (t) {
    t.pass('this is fine');
    t.skip('whoa skip this one test for now');
    t.fail('boom, but skipped', {skip: true});
    t.pass('this is also fine');
    t.end();
});

/*

tap results in:

    $ node skipping.test.js
    TAP version 13
    ok 1 - this is fine
    ok 2 - whoa skip this one test for now # SKIP
    not ok 3 - boom, but skipped # SKIP
    ok 4 - this is also fine
    1..4
    # skip: 2
    # time=6.297ms
    $ echo $?
    0

*/