# Donezo ♡ your little corner of the internet

A nostalgic personal homepage: daily tasks, a pink diary, moods, reminders, little wins, stickers, a spinning vinyl player, a strawberry-themed photobooth, and a persistent scrapbook wall. Everything runs in your browser and stays on this device.

## Features

- Cute, scrapbook-inspired dashboard with light (strawberry milk) and dark (starry plum) themes
- Task list: add (button or Enter), complete, delete, All / Active / Done filters, live stats, optional category / priority / due date, clear completed
- Digital diary with prompts, save, edit, archive, and delete confirmation
- Daily mood tracker plus a rotating affirmation and “little thought”
- Reminders with date and time, optional task link, overdue styling, in-app toasts, and optional browser notifications
- **Strawberry Photobooth 🍓**:
  - Upload multiple photos or start with one-click retro demo illustrations
  - Drag and reposition photos freely with mouse or touch
  - Multiple layout modes:
    - **Large Strawberry Frame**: photos arranged and clipped inside a plump strawberry silhouette with leaves, stem, and golden seeds
    - **Retro Photo Strip**: classic 3-photo vertical strip with vintage photobooth headers, date stamp, and caption
    - **Scrapbook Collage**: polaroid-style photos with cute washi tape corners
  - Customizable retro border themes: Strawberry Milk (cream dots), Berry Gingham (picnic check), Ruby Sweet (rich rose), Starry Plum (dark berry), and Vintage Polaroid
  - Draggable photobooth stickers (🍓, 🍰, 🎀, 🌸, 🍒, 🧋, 🪞, 🧸, 💌, etc.)
  - In-place micro controls to zoom, tilt/rotate, reorder layers, and delete photos
  - High-resolution client-side Canvas export to download as PNG
- **Persistent Scrapbook Wall ♡**:
  - Pin finished collages directly to your persistent scrapbook wall
  - Rendered with cute washi tape, strawberry pushpins, and authentic memory tilts
  - Click to view full-size in a modal dialog, download again anytime, or unpin
  - Stored safely in localStorage (`donezo.scrapbook`)
- **Music Corner (Vinyl & Spotify)**:
  - **Vinyl Player**: load local audio files (mp3, wav), play/pause, seek, volume, spinning vinyl synced to playback, tonearm animation, and OS `MediaSession` integration (macOS media keys & Control Center support)
  - **Spotify Corner**: embed any Spotify track, playlist, or album by pasting a link or URI, plus one-click cozy presets (Strawberry Lofi, Pink Bedroom Pop, Cozy Study)
- Sticker tin and today’s little wins
- Responsive layout for desktop, tablets, and phones
- Data saved in localStorage; malformed data is ignored instead of crashing the app

## Technologies

HTML, CSS, SVG, HTML5 Canvas, and vanilla JavaScript. No external frameworks, build tools, backend servers, or accounts required.

## How to run locally

1. Open the project folder.
2. Double-click `index.html`, or use File → Open File in your browser.
3. You can also drag `index.html` into a browser window.

No install and no internet connection are required (except for Spotify iframe embeds which fetch audio from Spotify's servers).

## How to use the features

**Strawberry Photobooth:**
1. Click **Add photos** to select image files from your computer, or click **Try demo photos** for instant berry art. You can also drag & drop images directly onto the photobooth stage.
2. Switch between **Strawberry frame**, **Photo strip**, and **Scrapbook collage** using the mode pills at the top.
3. Click and drag photos with your mouse or finger to position them.
4. When a photo is selected, use the floating control bar to zoom in/out (`🔍+` / `🔍−`), tilt (`↺` / `↻`), bring forward/back (`▲` / `▼`), or delete (`✕`).
5. Tap stickers in the sticker drawer to place them onto the stage; placed stickers are also draggable!
6. Click **Download photo** to save a high-resolution PNG, or click **Pin to scrapbook** to keep it on your scrapbook wall.

**Scrapbook Wall:**
- Pinned memories appear on the wall with washi tape and strawberry pins.
- Click any pinned memory to view it in full resolution.
- Download or unpin memories anytime. Data persists across browser sessions.

**Music Corner:**
- **Vinyl Player:** Click *Choose local songs* to select audio files on your device. Audio never leaves your computer. When playing, the vinyl spins and macOS / system media keys can control playback via the Media Session API.
- **Spotify Corner:** Click the *Spotify corner 🍓* tab. Paste any Spotify track, playlist, or album URL and click *Load*, or tap one of the cozy preset playlists.

**Diary:** Write a title, date, and entry, then save. Open a page from the archive to edit it. Use **New page** before writing something new so you do not update the open entry. Delete asks for confirmation.

**Mood:** Tap a mood, optionally add a note, then save. One mood is stored per calendar day.

**Reminders:** Add a title, date, and time. While Donezo is open, due reminders show an in-app toast (and an optional browser notification). Mark done, dismiss, or delete from the list.

**Theme:** Use the moon/sun control in the header. The choice is remembered and applies across all widgets including the photobooth.

## Technical Investigation: Spotify Integration & Device Music Detection in Browser-Only Apps

### Can a browser-only app detect currently playing device music?
**No.** Web browsers operate inside a strict security sandbox. There is **no Web API** that allows a web page to observe, sniff, or inspect audio output from other applications on the operating system (e.g., Spotify desktop, Apple Music, YouTube in another app, or OS audio mixers).

- **Why this limitation exists:** Privacy and security. If arbitrary websites could inspect what audio is playing on your computer, malicious sites could snoop on private phone calls, video streams, or media habits.
- **Why `navigator.mediaSession` cannot detect device music:** The Media Session API is strictly a **publishing/write API** for the active tab to announce its own metadata and action handlers to the operating system (for lock screens and keyboard media keys). A web page cannot query or receive updates about what other apps or tabs are broadcasting.
- **Why `getDisplayMedia` is not a music detector:** While `navigator.mediaDevices.getDisplayMedia({ audio: true })` can prompt the user to capture system audio, it requires explicit screen-sharing permissions, displays prominent OS recording banners, and only provides raw PCM audio waveforms without song titles, artist metadata, or player state.

### Can a static, browser-only app connect to Spotify via the Spotify Web API?
The official Spotify Web API (`https://api.spotify.com/v1/me/player/currently-playing`) requires:
1. **OAuth 2.0 User Authentication**: Users must sign in with Spotify and grant authorization scopes.
2. **Developer Application & Client ID**: Requires registering an application in the Spotify Developer Dashboard.
3. **Redirect URI Restrictions**: Spotify’s OAuth specification strictly requires `https://` or `http://localhost` redirect URIs and **forbids `file://` URLs**. Because Donezo is designed to run offline and locally via `file://`, an OAuth redirect flow cannot complete without running a local web server or proxy.
4. **Spotify Premium**: Playback control via the Web Playback SDK requires an active Spotify Premium subscription.

### The Working, Realistic Solution Implemented in Donezo
1. **Spotify Interactive Embed Player**:
   - Donezo includes an official Spotify Embed widget that supports any Spotify track, playlist, or album link or URI (`open.spotify.com/...` or `spotify:...`).
   - Works 100% client-side without API keys, developer registrations, or OAuth redirects.
   - Works locally over `file://` and `http://`.
   - Remembers the user's selected playlist in `localStorage.getItem("donezo.spotifyEmbed")`.
   - Includes curated one-click cozy playlists (Strawberry Lofi, Pink Bedroom Pop, Cozy Study).
2. **Web Media Session API for Donezo's Local Audio Player**:
   - Donezo's built-in Vinyl player registers with `navigator.mediaSession` so the operating system (macOS Control Center, Touch Bar, keyboard Play/Pause/Skip keys) recognizes Donezo's local playback!

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
- `donezo.scrapbook`
- `donezo.spotifyEmbed`

Clearing site data for this page removes saved content.

## Reminder limitation

A static website cannot wake you after the tab is closed. Reminders and notifications only run while Donezo is open. Keep the page nearby if you need a nudge.

