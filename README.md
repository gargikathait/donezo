# Donezo ♡ your little corner of the internet

A nostalgic personal homepage: daily tasks, a pink diary, moods, reminders, little wins, stickers, and a spinning vinyl player. Everything runs in your browser and stays on this device.

## Features

- Cute, scrapbook-inspired dashboard with light (strawberry milk) and dark (starry plum) themes
- Task list: add (button or Enter), complete, delete, All / Active / Done filters, live stats, optional category / priority / due date, clear completed
- Digital diary with prompts, save, edit, archive, and delete confirmation
- Daily mood tracker plus a rotating affirmation and “little thought”
- Reminders with date and time, optional task link, overdue styling, in-app toasts, and optional browser notifications
- Music corner: load local audio files, play / pause / seek / volume, previous / next, vinyl spin synced to playback
- Sticker tin and today’s little wins
- Responsive layout for desktop and phones
- Data saved in localStorage; malformed data is ignored instead of crashing the app

## Technologies

HTML, CSS, and vanilla JavaScript. No frameworks, servers, packages, or accounts.

## How to run locally

1. Open the project folder.
2. Double-click `index.html`, or use File → Open File in your browser.
3. You can also drag `index.html` into a browser window.

No install and no internet connection are required. Optional system fonts may look extra handwritten when available; fallbacks still work offline.
<img width="1408" height="881" alt="Screenshot 2026-10-12 at 12 48 18 AM" src="https://github.com/user-attachments/assets/816c93a0-7050-4c86-8e2d-f2a1191e1e01" />
<img width="1408" height="881" alt="Screenshot 2026-10-12 at 12 48 37 AM" src="https://github.com/user-attachments/assets/86f88a11-4ce2-43ff-a2d2-91706f570104" />


## How to use the extras

**Diary:** Write a title, date, and entry, then save. Open a page from the archive to edit it. Use **New page** before writing something new so you do not update the open entry. Delete asks for confirmation.

**Mood:** Tap a mood, optionally add a note, then save. One mood is stored per calendar day.

**Reminders:** Add a title, date, and time. While Donezo is open, due reminders show an in-app toast (and a browser notification only if you click **Enable browser notifications** and the browser allows it). Mark done, dismiss, or delete from the list.

**Music:** Choose local audio files (mp3, wav, etc.). Files are never uploaded. The record spins only while audio is actually playing. Pause, seek, and volume control the same files.

**Theme:** Use the moon/sun control in the header. The choice is remembered.
<img width="1408" height="881" alt="Screenshot 2026-10-12 at 12 48 22 AM" src="https://github.com/user-attachments/assets/6f58e997-0097-41e9-81ef-0c12bc29db46" />


**Stickers:** Click a sticker to pin or unpin it. Reset stickers clears the board.

## How data is stored

Each feature has its own localStorage key so one update does not wipe another:

- `donezo.tasks`
- `donezo.journal`
- `donezo.moods`
- `donezo.reminders`
- `donezo.theme`
- `donezo.stickers`
- `donezo.wins`
- `donezo.thoughtIndex`

Clearing site data for this page removes saved content.

## Reminder limitation

A static website cannot wake you after the tab is closed. Reminders and notifications only run while Donezo is open. Keep the page nearby if you need a nudge.
