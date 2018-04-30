var test = require(process.env.RASTAP_TRY ? '../' : 'tape');

test('compare letters', function (t) {
    t.equal('a', 'b', 'the a\'s match');
    t.end();
});
