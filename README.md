# Maple's Garden V3.2 — Calm Living Garden

A private little living memorial garden for Maple (Meeps), designed as an installable iPhone-friendly PWA.

## What changed in V3.2

V3.2 keeps the rich layered world from V3.1 — the fence, Maple tree, hideaway, pond, picnic blanket, toys, moving clouds, weather, seasons and Meeps interactions — while giving the garden much more breathing room.

The large rows of flowers have been replaced by three small, natural flower clusters. The carrot patch is smaller, there are fewer stepping stones, only one ambient bee is visible, and decorative grass has been reduced. The bench, sign, fence and hideaway are slightly quieter so Meeps remains the focal point.

The dynamic clouds remain, and the pond now has a subtle shimmer animation. Meeps keeps the V3.1 multi-hop movement, binkies, zoomies, grooming, flops, sleeping, feeding, notes and interactions with the duck, teddy, flowers, pond, blanket, carrots and hideaway.

Garden progression now stays intentionally subtle: memories, lanterns, the tree sparkle, pond visitor and wind chime add life without making the scene crowded.

## Files

- `index.html`
- `styles.css`
- `app.js`
- `manifest.json`
- `sw.js`
- `assets/icon.svg`
- `assets/apple-touch-icon.png`

## Local test

From this folder in PowerShell:

    py -m http.server 8000

Open `http://localhost:8000` in your browser.

## Deploy

This is a static PWA intended for GitHub Pages. It does not need Streamlit or a Python server in production.

Push these files to the existing Maple's Garden GitHub Pages repository. The existing public URL remains the same.

## Storage

V3.2 deliberately keeps the existing V3 storage keys, so visits, hearts, settings and memories remain compatible with V3.1. Counters/settings use localStorage and memories use IndexedDB. Photos are compressed locally and are not uploaded by the app.
