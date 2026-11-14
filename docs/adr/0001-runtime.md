# ADR 0001: Runtime for hello_world

- **Status:** Accepted
- **Decided by:** the owner, 2026-11-14 (decision card)
- **Feature:** F-002

## Decision

- **Language and runtime:** JavaScript on Node.js, pinned to **24.22.3**, the
  latest security release in the 24.x line. Until the owner updates Node on the
  PC, it runs 24.15.0, and the F-002 trial goes ahead on that version on
  2026-11-14.
- **Program:** `src/hello.js`, run as `node src/hello.js`.
- **Dependencies:** Node's standard library only. No third-party packages; if a
  `package.json` exists, it lists no dependencies.
- **Tests:** Node's built-in test runner (`node:test`), run with
  `node --test --test-reporter=junit --test-reporter-destination=test-results/junit.xml`.
  It writes JUnit XML to `test-results/junit.xml`, which is git-ignored.

## Why

Node.js is already on the owner's PC, and its built-in test runner can write
JUnit XML, so building and testing need no third-party tools. A one-file program
that writes a fixed string needs nothing outside the standard library.

## Security review and CVE check

- **Surface:** the program writes one fixed line to standard output and exits.
  It does not read arguments, environment variables or standard input. It opens
  no files and makes no network connections.
- **Supply chain:** no third-party packages for either the program or the tests.
- **Known CVEs (checked 2026-11-14):** 24.22.3 is the latest 24.x security
  release (2026-11-10). The PC's current 24.15.0 (2026-04-15) predates four
  security releases: 24.17.0, 24.18.1, 24.22.1 and 24.22.3. Their fixes cover
  TLS, DNS, HTTP, Brotli decompression and the permission model. This program
  uses none of those, so running on 24.15.0 for the trial is low risk. The PC
  moves to 24.22.3 when the owner updates it.
- **Ongoing:** repeat the CVE check for the pinned version on every change and
  before each promotion.

## Error output markers (F-002 AC-7)

When stderr must not leak internals, a test should also fail on these
Node-specific markers:

- `node:internal`
- `Node.js v` (the version line Node prints after an uncaught error)
- `Error:` and `Error [ERR_`
- `TypeError`, `ReferenceError`, `SyntaxError`, `RangeError`
- `Uncaught`
- any line that starts with whitespace followed by `at ` (stack frames)
