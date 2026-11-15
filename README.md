# hello_world

A command-line program that prints `Hello, world!` (F-002).

## Requirements

Node.js 24.22.3 (see [ADR 0001](docs/adr/0001-runtime.md)). No third-party
packages.

## Run

```sh
node src/hello.js
```

It writes `Hello, world!` and a line feed to standard output, writes nothing to
standard error, and exits with status 0. It ignores command-line arguments,
environment variables and standard input, and opens no files or network
connections.

## Test

```sh
node --test --test-reporter=junit --test-reporter-destination=test-results/junit.xml
```

Results are written to `test-results/junit.xml` (git-ignored).
