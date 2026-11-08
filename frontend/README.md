# React + TypeScript + Vite

## RooMatch routes

- `/` opens the homepage.
- `/studio` opens the room planning Studio for guests and signed-in users.
- `/studio/:layoutId` opens a saved layout and requires sign-in.
- `/dashboard` lists the signed-in user's saved layouts.
- `/login`, `/signup`, and the verification/recovery routes manage account access.
- Unknown paths show a page-not-found screen.

Navigation uses React Router without a full page reload. Vite's development and
preview servers support opening and refreshing `/studio` directly.

For deployment, configure the frontend host to serve `index.html` for application
paths that do not match a static file. For example, an Nginx frontend location can
use `try_files $uri $uri/ /index.html;`. Keep backend API paths handled separately.

Guests can arrange furniture and try recommendations before signing in. Save
prompts for sign-in or account creation, keeps the draft in the current tab during
authentication, and completes the save on return. Signing in from Studio's header
returns to the draft without saving it automatically.

New layout offers to save, discard, or keep editing when changes are unsaved.
Saving before starting a new layout preserves the current layout in My layouts.
Normal room edits remain in memory until saved; reloading or closing a room with
unsaved changes triggers a browser reminder. Uploaded photos are temporary.

For local development alongside roomatch_ref, run this frontend on port 5174 and
its backend on port 8001. Set VITE_API_BASE to http://127.0.0.1:8001/api in
frontend/.env.local and allow the frontend's origin through FRONTEND_ORIGINS in
backend/.env. The development API client aligns localhost and 127.0.0.1 with the
frontend's hostname so SameSite cookies accompany requests across ports.
FYP uses the roomatch_fyp_session cookie, keeping its login separate from Ref.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

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
