# How to run the tests

## Requirements

- Node.js 22 or 24

## Setup

```bash
npm install
```

## Run the tests

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

## Static checks

```bash
npm run lint
npm run typecheck
```

## Continuous integration

`.github/workflows/test.yml` runs install, lint, typecheck and tests on pushes to `main` and on pull requests.
