# Tempo Pomodoro Timer

Tempo is a calm, offline-friendly Pomodoro timer for focused work. It combines a visual progress ring, session tasks, configurable work and break cycles, and lightweight gamification so each completed round feels like progress.

**Live app:** [pomodoro-timer.fluffy-teal-8680.chatgpt.site](https://pomodoro-timer.fluffy-teal-8680.chatgpt.site/)

## Features

- Configurable focus, short-break, and long-break lengths
- Start, pause, reset, and visual progress ring
- Current-session task list with estimated Pomodoros and completion progress
- Auto-advance between focus and break phases
- Long break after a configurable number of focus rounds (four by default)
- Standard, Deep Work, and Quick Sprint presets
- Daily history with focus minutes, completed rounds, and streaks
- XP, levels, badges, daily goals, and completion celebrations
- Optional completion sound and browser notifications
- Focus mode for a quieter timer view
- Keyboard shortcuts: `Space` start/pause, `R` reset, `N` new task
- JSON and CSV export plus JSON backup import
- Installable PWA with offline caching and an in-app install guide
- Responsive layout for desktop and mobile screens

## Run locally

The app is a static site. Python is enough to run it locally:

```bash
python3 -m http.server 8765 --directory dist
```

Open [http://127.0.0.1:8765](http://127.0.0.1:8765) in a browser. Opening `dist/index.html` directly also works for the timer, but a local server is recommended for service-worker and install testing.

## How to use

1. Choose a preset or set your own focus and break durations.
2. Add a task and set its estimated Pomodoro count.
3. Select the task, then start the focus round.
4. Pause or reset whenever needed. Tempo saves your settings, tasks, history, and XP in the browser.
5. Turn on auto-advance, notifications, sound, or Focus mode in Settings when useful.
6. Export a JSON backup or CSV history from the Data panel.

The in-app **How to use** button includes the same flow. See the full guide in [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md).

## Project structure

```text
dist/
  index.html              App markup and dialogs
  styles.css              Responsive visual design and layout
  app.js                  Timer state, persistence, tasks, history, and gamification
  manifest.webmanifest    PWA metadata
  sw.js                   Offline asset cache
  icon.svg                Source icon
  icon-192.png            PWA icon
  icon-512.png            PWA icon
.openai/hosting.json      Static-site deployment configuration
docs/
  USER_GUIDE.md           Feature and workflow guide
  DEVELOPMENT.md          Local development and release notes
```

## Data and privacy

Tempo has no application server or account system. Settings, tasks, history, and gamification progress stay in the browser's `localStorage`. Browser notifications require a permission grant from the browser. Use the JSON export when you want a portable backup.

## Browser support

Tempo works in current Chromium, Firefox, and Safari browsers. Notifications, PWA installation, and sound depend on the capabilities and permission settings of the browser. The install button opens a browser-specific guide when a native install prompt is unavailable.

## Documentation

- [User guide](docs/USER_GUIDE.md)
- [Development guide](docs/DEVELOPMENT.md)

