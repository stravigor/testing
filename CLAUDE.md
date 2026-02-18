# @stravigor/testing

Testing utilities for the Strav framework. TestCase boots your app, provides HTTP helpers, and wraps each test in a rolled-back database transaction for full isolation.

## Dependencies
- @stravigor/kernel (peer)
- @stravigor/http (peer)
- @stravigor/database (peer)

## Commands
- bun test
- bun run build

## Architecture
- src/test_case.ts — base test case class with app boot and transaction wrapping
- src/factory.ts — model factories for test data generation
- src/index.ts — public API

## Conventions
- Tests extend TestCase for automatic app lifecycle and DB isolation
- Use factories for creating test data — don't insert records manually
- Each test runs in a transaction that is rolled back after completion
