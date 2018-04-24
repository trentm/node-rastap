// Take 5s to complete a test.
var test = require(process.env.RASTAP_TRY ? '../' : 'tape');

test('takes 5s', function (t) {
    var i = 5;
    var interval = setInterval(function () {
        t.pass('passed i=' + i);
        i--;
        if (i <= 0) {
            clearInterval(interval);
            t.end();
        }
    }, 1000);
});
