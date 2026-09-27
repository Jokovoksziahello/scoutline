# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

# TrackBack

Music release-year guessing game with solo mode, curated international and Hungarian hits, and realtime party rooms.

## Run locally

```bash
npm run dev:all
```

Open `http://localhost:5173/`. The Vite app runs on port `5173` and the realtime party server on port `8787`.

For another device on the same network, open the host computer's local IP on port `5173`. Make sure port `8787` is reachable too, because party rooms use WebSockets.

Checks:

```bash
npm run build
npm run lint
```
