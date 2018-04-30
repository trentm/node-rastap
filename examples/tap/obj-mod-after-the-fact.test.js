var test = require('tap').test;

test('test error summary of an object that changes after the test failure', function (t) {
    var obj = {a: 'b'};
    var expected = {a: 'c'};
    t.deepEqual(obj, expected, 'does obj match expected?');
    obj.a = 'b'; // change obj after the fact
    obj.d = 'e'; // change obj after the fact
    t.end();
});
