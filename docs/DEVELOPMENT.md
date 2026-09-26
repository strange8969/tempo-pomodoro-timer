# Tempo development guide

## Runtime model

Tempo is a dependency-free static web app. The browser loads `dist/index.html`, `dist/styles.css`, and `dist/app.js`; there is no build step or backend service.

`app.js` owns the timer state, phase transitions, task progress, daily history, XP, badges, notifications, sound, keyboard shortcuts, import/export, and PWA install flow. State is normalized when it is loaded and persisted in `localStorage` under the app's storage key.

## Local development

Start a static server from the repository root:

```bash
python3 -m http.server 8765 --directory dist
```

Then open `http://127.0.0.1:8765/`. A static server is useful when testing service-worker registration, browser notifications, and installation behavior.

## Layout conventions

- `.app-shell` controls the centered page gutter.
- `.workspace` holds the two balanced desktop columns.
- `.timer-column` contains the timer, tasks, and data panels.
- `.side-column` contains session stats, XP, history, and settings.
- The responsive breakpoint stacks the columns and keeps a small mobile page inset.

When changing the layout, check both 1280px desktop and 390px mobile widths. Keep the timer card usable in the first viewport even when the side panels grow.

## PWA files

- `manifest.webmanifest` defines the app name, icons, colors, and standalone display mode.
- `sw.js` caches the static app shell and serves it offline after the first load.
- `icon.svg`, `icon-192.png`, and `icon-512.png` provide install icons.

The install button supports both `beforeinstallprompt` and a browser-specific fallback guide, so it remains useful when a browser does not expose a native prompt.

## Verification checklist

Before publishing a change:

1. Start the local server and confirm the page loads without an overlay or console errors.
2. Check the timer start, pause, reset, and phase transition flow.
3. Add a task, select it, complete a round, and confirm task progress, history, XP, and badges update.
4. Check presets, Auto-advance, long-break settings, notifications, sound, Focus mode, import, and export.
5. Verify the layout at desktop and mobile widths.
6. Confirm the manifest, service worker, and install guide still load.

## Static hosting

Deploy the `dist/` directory as the site root. The existing Sites configuration is stored in `.openai/hosting.json`. Keep the deployment archive aligned with the exact source commit being published.

