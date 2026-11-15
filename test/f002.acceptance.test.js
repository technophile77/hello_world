'use strict';
// F-002 acceptance tests, written from spec v11 only. Runner: node:test.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PROGRAM = path.join(ROOT, 'src', 'hello.js');
const EXPECTED = Buffer.from('48656c6c6f2c20776f726c64210a', 'hex'); // "Hello, world!\n"
const ARG_MARKER = 'F002-ARG-MARKER-7f3a';
const ENV_MARKER = 'F002-ENV-MARKER-9c1d';
const LIMIT_MS = 5000;

// Every run made by this file is recorded here so AC-8 can check them all.
const runs = [];

function run({ args = [], env = {}, input } = {}) {
  const started = Date.now();
  const r = spawnSync(process.execPath, [PROGRAM, ...args], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    input,
    timeout: LIMIT_MS,
    killSignal: 'SIGKILL',
  });
  const rec = {
    label: `${args.join(' ') || '(no args)'}`,
    stdout: r.stdout || Buffer.alloc(0),
    stderr: r.stderr || Buffer.alloc(0),
    status: r.status,
    timedOut: !!(r.error && r.error.code === 'ETIMEDOUT'),
    error: r.error,
    ms: Date.now() - started,
  };
  runs.push(rec);
  return rec;
}

function assertClean(r, label) {
  assert.equal(r.error, undefined, `${label}: spawn error ${r.error}`);
  assert.deepEqual(r.stdout, EXPECTED, `${label}: stdout bytes differ: ${JSON.stringify(r.stdout.toString('latin1'))}`);
  assert.equal(r.stderr.length, 0, `${label}: stderr not empty: ${r.stderr.toString()}`);
  assert.equal(r.status, 0, `${label}: exit status ${r.status}`);
}

test('AC-1 stdout is exactly "Hello, world!\\n" (14 bytes)', () => {
  const r = run();
  assert.equal(r.error, undefined);
  assert.equal(r.stdout.length, 14);
  assert.deepEqual(r.stdout, EXPECTED);
});

test('AC-1 stdout has no CR and a single trailing LF', () => {
  const r = run();
  assert.ok(!r.stdout.includes(0x0d), 'contains CR');
  assert.equal(r.stdout.filter((b) => b === 0x0a).length, 1);
  assert.equal(r.stdout[r.stdout.length - 1], 0x0a);
});

test('AC-2 stderr is empty (zero bytes)', () => {
  const r = run();
  assert.equal(r.error, undefined);
  assert.equal(r.stderr.length, 0, r.stderr.toString());
});

test('AC-3 exit status is 0', () => {
  const r = run();
  assert.equal(r.error, undefined);
  assert.equal(r.status, 0);
});

test('AC-4 five consecutive runs each pass AC-1, AC-2, AC-3', () => {
  for (let i = 1; i <= 5; i++) assertClean(run(), `run ${i}`);
});

test('AC-5 argument text appears in neither stdout nor stderr', () => {
  const r = run({ args: [ARG_MARKER] });
  assert.equal(r.error, undefined);
  assert.ok(!r.stdout.toString('latin1').includes(ARG_MARKER), 'marker in stdout');
  assert.ok(!r.stderr.toString('latin1').includes(ARG_MARKER), 'marker in stderr');
});

test('AC-6 env and stdin markers are not echoed; stdout still exact', () => {
  const r = run({ env: { F002_ENV_MARKER: ENV_MARKER }, input: `${ENV_MARKER}\n` });
  assert.equal(r.error, undefined);
  assert.ok(!r.stdout.toString('latin1').includes(ENV_MARKER), 'marker in stdout');
  assert.ok(!r.stderr.toString('latin1').includes(ENV_MARKER), 'marker in stderr');
  assert.deepEqual(r.stdout, EXPECTED);
});

test('AC-7 stderr of the AC-5 run is empty or leaks no internals', () => {
  const r = run({ args: [ARG_MARKER] });
  assert.equal(r.error, undefined);
  const err = r.stderr.toString('utf8');
  if (err.length === 0) return;
  const bad = [];
  if (/\/[A-Za-z0-9_.-]*\/[A-Za-z0-9_.-]+/.test(err)) bad.push('absolute path');
  if (/[A-Za-z0-9_.-]+:[0-9]+/.test(err)) bad.push('file:line');
  const fwd = (p) => p.replace(/\\/g, '/');
  const lit = [
    ['repository root', ROOT], ['repository root', fwd(ROOT)],
    ['source file name', 'hello.js'], ['source path', PROGRAM],
    ['interpreter path', process.execPath], ['interpreter path', fwd(process.execPath)],
    // generic stack-trace markers
    ['Traceback', 'Traceback'], ['File "', 'File "'], ['goroutine ', 'goroutine '],
    ['panic:', 'panic:'], ['Exception in thread', 'Exception in thread'],
    // Node-specific markers (docs/adr/0001-runtime.md)
    ['node:internal', 'node:internal'], ['Node.js v', 'Node.js v'],
    ['Error:', 'Error:'], ['Error [ERR_', 'Error [ERR_'],
    ['TypeError', 'TypeError'], ['ReferenceError', 'ReferenceError'],
    ['SyntaxError', 'SyntaxError'], ['RangeError', 'RangeError'],
    ['Uncaught', 'Uncaught'],
  ];
  for (const [name, s] of lit) if (err.includes(s)) bad.push(name);
  if (/^[ \t]+at /m.test(err)) bad.push('stack frame line');
  assert.deepEqual(bad, [], `stderr leaks internals: ${err}`);
});

test('AC-8 every run in this suite exited within 5 seconds (not killed)', () => {
  // Exercise the AC-1..AC-7 run shapes, then check every recorded run.
  run();
  run({ args: [ARG_MARKER] });
  run({ env: { F002_ENV_MARKER: ENV_MARKER }, input: `${ENV_MARKER}\n` });
  assert.ok(runs.length >= 3);
  for (const r of runs) {
    assert.equal(r.timedOut, false, `run "${r.label}" still running after ${LIMIT_MS} ms`);
    assert.ok(r.ms < LIMIT_MS, `run "${r.label}" took ${r.ms} ms`);
  }
});
