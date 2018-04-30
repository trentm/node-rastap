var test = require('tap').test;

test('test 1', function (t) {
    t.pass('this is fine');
    t.fail('boom');
    t.pass('this is also fine');
    t.end();
});

test('test 2', function (t) {
    t.pass('this is fine');
    t.skip('whoa skip this one test for now');
    t.fail('boom, but skipped', {skip: true});
    t.pass('this is also fine');
    t.end();
});
