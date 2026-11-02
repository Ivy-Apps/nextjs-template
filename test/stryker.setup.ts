import fc from "fast-check";

// `@fast-check/vitest` puts the seed in each property test's name. A random
// seed renames the test between Stryker's dry run and its mutant runs, which
// then select no such test and report what only a property kills as survived.
fc.configureGlobal({ seed: 1 });
