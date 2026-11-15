'use strict';

// F-002: print a fixed greeting. By design (SR-1) this program never reads
// command-line arguments, environment variables or standard input.

// If stdout is closed early (e.g. EPIPE), fail quietly: an uncaught error would
// print a stack trace and file paths to stderr, which SR-1/AC-7 forbid.
process.stdout.on('error', () => {
  process.exitCode = 1;
});

// exitCode instead of process.exit() so a piped write is flushed before exit.
process.stdout.write('Hello, world!\n');
process.exitCode = 0;
