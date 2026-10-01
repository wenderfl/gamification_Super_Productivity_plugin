# Gamification

A minimal study rewards plugin for Super Productivity, adapted from [sp-dashboard](https://github.com/ahanel13/sp-dashboard). Original MIT license preserved.

## Install or update

1. Open **Super Productivity → Settings → Plugins**.
2. Import **gamification.zip** from the project root.
3. Open **Gamification** and choose your study project in Settings.

Version 2.2.0 keeps the existing storage identity, `sp-study-rewards`, and the same data schema. Reimport the ZIP to update; do not delete plugin data. Existing reward names and history stay unchanged.

## Interface

- English labels, compact summaries and icon buttons.
- Rewards / History segmented navigation.
- Vertical **9:16** covers in grid, list and image preview.
- Search, categories, editable rewards, redemption confirmation and undo.
- Images from HTTP/HTTPS URLs or uploaded JPG, PNG, WebP and GIF files (10 MB max).
- Uploaded covers become JPEG thumbnails up to 480 px; GIFs become still images.
- Broken image URLs show a fallback. Use an upload if the host blocks a remote image.

## Balance

**Available = study hours recorded this week − this week's redemptions.**

Weeks run Monday to Sunday in the local timezone. Unused hours expire on Monday.
Choose a study project to exclude other activities. Changing the project does not remove spent hours.
Active and archived tasks are deduplicated; subtasks are not counted twice.
Deleting a reward preserves history. Undoing an older redemption does not credit the current week.

## Data

Settings, rewards and history use the official `loadSyncedData/persistDataSynced` APIs.
Writes update the UI after the API succeeds. Failed reads never overwrite saved data.
The payload has a conservative 900 KB limit; use URLs or remove covers if storage is full.
Sync follows the host configuration. The API does not offer atomic transactions between devices.
Refresh happens on host events, when returning to the view, and every 30 seconds.

## Development

```sh
npm ci
npm test
npm run check:syntax
make build
PLUGIN_HTML=build/gamification/index.html npm run test:browser
```

HTML, CSS and JavaScript are self-contained. Browser tests use a simulated host API and save desktop/mobile screenshots in `assets/`.
Explicit standalone `?demo=1` mode uses fictitious hours and separate browser storage.
