var test = require(process.env.RASTAP_TRY ? '../' : 'tape');

test('test 1 (no skips)', function (t) {
    t.pass('this is fine');
    t.end();
});

test.skip('test 2 (test.skip)', function (t) {
    t.pass('this is fine');
    t.end();
});

test('test 3 (test opts skip:true)', {skip: true}, function (t) {
    t.pass('this is fine');
    t.end();
});

test('test 4 (assert opts skip:true)', function (t) {
    t.pass('this is fine', {skip: true});
    t.end();
});

/*

tape does this:

    $ node skipping.test.js
    TAP version 13
    # test 1 (no skips)
    ok 1 this is fine
    # SKIP test 3 (test opts skip:true)
    # test 4 (assert opts skip:true)
    ok 2 this is fine # SKIP

    1..2
    # tests 2
    # pass  2

    # ok

Rastap *could* include an implicit assert for a skipped test:

    $ node skipping.test.js
    TAP version 13
    # test 1 (no skips)
    ok 1 this is fine
    # test 2 (test.skip)
    ok 2 # SKIP
    # test 3 (test opts skip:true)
    ok 3 # SKIP
    # test 4 (assert opts skip:true)
    ok 4 this is fine # SKIP

    1..4
    # tests 2
    # pass  2

    # ok

*/
