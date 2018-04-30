var test = require('tap').test;

test('blarg', function (t) {
    throw new Error('me go boom');
    t.pass('this is fine');
    t.end();
});

