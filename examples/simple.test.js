var test = require(process.env.RASTAP_TRY ? '../' : 'tape');

test('simple nums', function (t) {
    var one = 1;
    t.equal(one, 1, 'the ones match');
    t.equal(2, 2.0, 'the twos match');
    t.end();
});

test('simple letters', function (t) {
    t.equal('a', 'a', 'the a\'s match');
    t.end();
});
