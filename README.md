# Lead Sheets

An offline lead sheet and tab viewer that installs to your phone's home screen. Live mode shows only chords and lyrics, with auto-scroll and PREV/NEXT. Edit mode has an Infer Format button that tidies pasted text.

- **Songs stay on the device.** They are stored in the browser's IndexedDB. This repository contains no songs.
- **Search:** the search box matches title, artist, album, genre and the `Meta:` line, which takes comma-separated values (`Meta: opener, slow, drop D`). Use `artist:`, `genre:` or `meta:` to narrow a search to one field.
- **Setlists:** pick By Setlist in the list. In Edit mode, tap + New setlist at the bottom, or the pen on a setlist, to name it, add songs, drag them into order and set each song's capo and tempo for that set. In Live mode, tapping a song plays the set in order with those settings. A song can be on any number of setlists. Setlists are included in Export and Import.
- **Tags:** header lines such as `Key:`, `Capo:`, `Tuning:` and `Notes:`. A `Notes:` line can also sit anywhere in the song and shows there as a note. A `*` after a chord (`A*`) is kept as a marker. A `Key change: A` line in the song marks a modulation; numbers restart from the new key. Settings → Live tags picks the tags shown above the sheet, and the info button in Live lists them all.
- **Key and capo:** `Key:` is the sounding key and the chords are the shapes you play, so `Key: D` with `Capo: 2` and C shapes shows C as 1.
- **Live controls:** transpose (−/+ in the header) moves the capo and keeps the shapes, and changes the shapes only when the capo would pass fret 0 or 7. Tap the capo to reset. Chord numbers (needs a `Key:`; Nashville or Roman, picked in Settings → Numbers) replace chords with numbers. Both change only what is shown, never the saved song. Settings → Live controls shows or hides these and the auto-scroll buttons, and Text size (in Settings, or the info button in Live) sets the sheet size.
- **Page turner:** Bluetooth pedals and keyboards work in Live. Page Down, ↓ and → go forward; Page Up, ↑ and ← go back. Settings → Page turner picks Page (scroll a screen, then turn to the next song at the end) or Song (always change song). Space plays or pauses auto-scroll.
- **Editor:** Preview saves and shows the song in Live with an Edit button. Settings → Editor → Fix Format On Preview runs Infer Format each time you tap Preview.
- **Sharing:** in the editor, Share sends the song's text to Messages or any other app. To add a song someone sent you, copy its text, then tap Paste in the list in Edit mode. Pasting a copied backup imports it.
- **Backup:** in the list, tap the gear and then Share library to save or send all songs and setlists as one `.json` file. Import restores that file, or adds a single `.md`/`.txt` song.
- **Install:** host the folder on GitHub Pages, open the URL on your phone, then Share → Add to Home Screen.
- **Run locally:** serve the folder with any static server and open the printed localhost URL. Do not open `index.html` as a `file://` URL, because the service worker and modules need http(s).
  - Python: `py -m http.server 8000` on Windows, `python3 -m http.server 8000` elsewhere → `http://localhost:8000/`
  - Node: `npx serve .` → `http://localhost:3000/`
  - Tests: open `/test/` on the same server.
- Icons: [Font Awesome Free](https://fontawesome.com) 6.7.2, CC BY 4.0, bundled in `js/icons.js` so the app works offline.
