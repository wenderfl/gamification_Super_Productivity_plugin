# Project guidance — Gamification

This project adapts the original sp-dashboard into a study rewards plugin for Super Productivity.

## Commands

- npm test: Vitest regression tests for weekly balances, task deduplication and validation.
- npm run check:syntax: parse the embedded JavaScript with Acorn.
- npm run test:browser: Puppeteer end-to-end tests with a simulated PluginAPI and screenshots.
- make build: package self-contained plugin files into gamification.zip.
- PLUGIN_HTML=build/gamification/index.html npm run test:browser: verify the packaged HTML.
- CHROME_PATH: optional browser executable override for the browser tests.

Do not run make release unless explicitly asked to publish a release.

## Architecture

- gamification/index.html: self-contained HTML, CSS and JavaScript. No external runtime dependencies.
- gamification/plugin.js: host ACTION hook and optional persisted data hook, debounced messages to this plugin's iframe.
- gamification/manifest.json.template: plugin ID sp-study-rewards, displayed name Gamification.
- Version and description are taken from package.json during make build.
- The original MIT license and upstream Git history are preserved.

The UI uses PluginAPI.getTasks(), getArchivedTasks(), getAllProjects(), loadSyncedData() and persistDataSynced().
No direct access to host internals is needed. Only parent-window SP_STATE_CHANGED messages are accepted.
Reads refresh every 30 seconds, on return to the tab and after host notifications.

## Accounting

The week is Monday through Sunday in the local timezone.
Merge archived tasks first, then active tasks in an ID map; active data takes precedence.
Skip child tasks because parent timeSpentOnDay includes their time.
Ignore future dates, invalid and negative durations.
Filter eligible hours by the selected project. The week's redemptions are deducted regardless of the current project filter.
Balance does not roll into subsequent weeks. Deleting an item preserves ledger snapshots.
Undo marks a redemption as undone, without deleting its audit record.
Refresh hours and re-read persisted state before redemption. Reject insufficient balance.

## Persistence and validation

State schema version 1 contains rewards, redemptions and settings.
A missing state is a fresh installation; a malformed or incompatible state is an error, never an invitation to overwrite it.
mutate() serializes writes within this iframe, re-reads persisted data, and updates the visible state only after persistence succeeds.
This API does not offer atomic writes between devices; do not claim it does.
Keep a conservative 900 KB payload limit. Uploaded images are JPEG thumbnails up to 480 px.
Use textContent for all user and host strings. Never interpolate names or URLs into HTML.
Image URLs allow only HTTP/HTTPS without credentials; embedded image data allows only validated raster MIME types.
Full source image files are not retained, and filesystem paths are not stored.

Standalone mode must not fabricate study credits. Only explicit top-level ?demo=1 enables separate preview data.
Tests may mock PluginAPI, but the production UI starts empty and reads actual host data.

## Naming compatibility

Use Gamification for the product name, gamification for package and source directory, and gamification.zip for builds. Keep sp-study-rewards as the installed plugin ID so existing saved rewards and history survive upgrades. The old standalone preview key is read only as a migration fallback. Upstream repository URLs and license attribution remain unchanged.
