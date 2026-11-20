# Gemlight ✦

A calm match-3. No timer, no losing, no fail state — built for one person's slow evenings.

## Deploy to GitHub Pages
1. Create a repo and upload all files in this folder to the root.
2. Repo **Settings → Pages → Source: Deploy from a branch → main / root**.
3. Open `https://<you>.github.io/<repo>/` on her iPhone.
4. **Share → Add to Home Screen.** It now launches full-screen, works fully offline
   (service worker precaches everything after the first visit), and keeps her board,
   score, stats, and unlocked palettes in localStorage — forever, on that device.

## What's inside
- 8×8 (or cozy 7×7) swap match-3, 6 or 7 jewel types, cascades with a rising
  pentatonic chime ladder, Bloom / Comet / Prism special jewels.
- Comfort systems: unlimited hints + idle shimmer, free Stir, auto-reshuffle on
  deadlock, Pure Zen (hide score), auto-save after every move, welcome-back resume.
- Keepsakes: lifetime sparkles, favorite jewel, longest cascade, best session;
  palettes unlock at 300 / 1,200 / 3,000 lifetime jewels. Dusty Blue is default.
- All jewels, particles, and the home-screen icon are drawn in code. Zero assets,
  zero dependencies, zero network calls after load.

## What multiple files unlock (ideas)
- **Now:** `sw.js` + `manifest.webmanifest` → installable, guaranteed-offline PWA.
  A service worker cannot live inside a single HTML file; this is the big unlock.
- **Later, if wanted:**
  - `goals.js` — gentle quest mode ("clear 20 hearts", no limits, no fail).
  - `themes/` — swappable palette packs, or a theme editor she can use herself.
  - Save export/import — download progress as a JSON file, restore on a new phone.
  - Share card — render a pretty score card to PNG via the Web Share API.
  - Sampled audio file (music box / kalimba) for richer sound than synthesis.
  - `daily.js` — a seeded "calm puzzle of the day" (no streaks, no FOMO).

## Controls
Tap two neighbors or swipe a jewel. Keyboard: arrows + space, `H` hint, `M` mute.