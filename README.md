# rastap

A server-side node.js code test framework. Yes, another one. I'm sorry.

Effectively this is an alternative to node-tape, which I love. The original
intent is to add support for parallel running of test files (for faster
test runs where it makes sense) and running test files in separate processes
(for isolation).

## status

Currently this is still an experiment, incomplete, and generally unusable.
Also **I'm not currently developing this further**. See [RFD
139](https://github.com/joyent/rfd/blob/master/rfd/0139/README.md) for why.

## goals

- a node.js server-side code test framework
- small API (i.e. it doesn't take long to learn how to use it)
- a rastap-using JS file can be run on its own, e.g. `node test/foo.test.js`
- a `rastap` CLI for more conveniently running multiple rastap-using test
  files, e.g. `rastap test/*.test.js`
- [TAP](https://testanything.org/tap-version-13-specification.html) output
- parallel running of test files (Of course, running test files in parallel
  implies that they cannot get a TTY, and that TAP output cannot be streamed
  out while a particular file is running.)
- test files are run in separate processes for isolation
- reasonably small install footprint

Non-goals:

- browser JS support
- pluggable assert frameworks
- pluggable output formats
- DWIM-y features


TODO: Clarify which from https://github.com/tapjs/node-tap#why-tap are goals
here. It is a good list.

Why:
- Tape incorrectly handles skips (see examples/**/skipping.test.js). Node-tap
  gets it right.
- ...


## compatibility with node-tape

Incomplete. I *may* attempt to make rastap be as compatible as possible to
tape to assist with migrating the test suites I work with to rastap.

## name

Why "rastap"?  It started as a joke play on "rastest" from
[rastrent](https://www.youtube.com/watch?v=TcK0MYgnHjo). I wanted "tap" or
"tape" in the name.

## usage

TODO: usage guide


## Reference

TODO: reference docs


## dev notes

### ideas

- option to show timestamps in test lines
- require explicit option to allow lazy plan number to elide `t.end()`? !dwim
- a `t.log` or something to emit output related to the test that will
  perhaps properly make it indented YAML per TAP spec?
  There is already `t.comment` but not sure if appropriate.
- ensure `t.comment` supports multiline
- runner support to fail fast (i.e. bail on first test failure)
- clarity on subtests and what the promises are for them: affects output?
  affects lifetime? t.plan? etc.
- something for special "Bail out!" from TAP spec?
  (https://testanything.org/tap-specification.html)
- app-specific plugins for adding assert methods to `t.`? Perhaps that should
  just be explicitly mixin handling at the top of a test file?
- custom type diffing output for the YAML? I know NAPI had something here
- node-tap has a `# time=26.792ms` diagnostic

### concerns

- getting into spawning processing might bring all sorts of ugly surprises
    - what's the exit/cleanup/zombie story on crash of any of these processes?
      e.g. of the top-level manager process?
      What about ^C of the top-level manager process? Need it kill and wait
      for all children?
    - forget Windows (I don't want to support complexity there)
    - vague recollection that node causes problems with stdio handles. not sure

### TAP terminology

https://testanything.org/tap-specification.html
https://testanything.org/tap-version-13-specification.html

    TAP version 13                  <--- "version"
    1..N                            <--- the "plan", optional, must appear once, can be at beginning or end of all test lines
    ok 1 Description # Directive    <--- a "test line"
                                    <--- Description "should" not begin with a digit, to no confuse with optional test number
                                    <--- only directives are TODO and SKIP
      ---                           <--- TAP v13 adds the "YAML block", btwn '---' and '...', after a test line
      message: 'Failure message'
      severity: fail
      data:
        got:
          - 1
          - 3
          - 2
        expect:
          - 1
          - 2
          - 3
      ...
    # Diagnostic                    <--- "diagnostic"
    ....
    ok 47 Description
    blah                            <--- "unknown" line
    ok 48 Description
    <more tests...>

Rastap output will always put the 'plan' line at the end, because it could
be multiple files, it could be multiple `test` invocations, or `t.plan`
might not be called. It just doesn't know.

Rastap will also include summary diagnostic lines, somewhat a la tape, e.g.:

    # tests 5
    # pass  4
    # fail  1

tape example:

    TAP version 13
    # simple nums
    ok 1 the ones match
    ok 2 the twos match
    # simple letters
    ok 3 a match
    # timing test
    ok 4 should be equal
    not ok 5 should be equal
      ---
        operator: equal
        expected: 100
        actual:   102
        at: null._onTimeout (/Users/trentm/tm/rastap/examples/tape-example.test.js:11:11)
        stack: |-
          Error: should be equal
              at Test.assert [as _assert] (/Users/trentm/src/tape/lib/test.js:225:54)
              at Test.bound [as _assert] (/Users/trentm/src/tape/lib/test.js:77:32)
              at Test.equal.Test.equals.Test.isEqual.Test.is.Test.strictEqual.Test.strictEquals (/Users/trentm/src/tape/lib/test.js:388:10)
              at Test.bound (/Users/trentm/src/tape/lib/test.js:77:32)
              at null._onTimeout (/Users/trentm/tm/rastap/examples/tape-example.test.js:11:11)
              at Timer.listOnTimeout (timers.js:92:15)
      ...

    1..5
    # tests 5
    # pass  4
    # fail  1


### Mainline

- gather the files to run
- create results stream obj
- test runner queue (with given concurrency `rastap -j 10`, defaults to a guess
  at processors?)
- spawn test runner for each file
  TODO: read https://github.com/davepacheco/node-spawn-async
        Note sure this is necessary for a *test* runner.
  Do we need this to inherit std handles by default?
  node-spawn-async is execFile rather than "spawn". Is that sufficient for
  buffering test output?
  Perhaps want child_process.fork for the comm channel:
    https://nodejs.org/docs/latest/api/child_process.html#child_process_child_process_fork_modulepath_args_options
- on `test` invocation:
    - same lazy load as tape to have a singleton harness
    - ...
