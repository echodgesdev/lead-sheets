# Lead Sheets

An offline lead sheet and tab viewer that installs to your phone's home screen. Live mode shows only chords and lyrics, with auto-scroll and PREV/NEXT. Edit mode has an Infer Format button that tidies pasted text.

- **Songs stay on the device.** They are stored in the browser's IndexedDB. This repository contains no songs.
- **Search:** the search box matches title, artist, album, genre and the `Meta:` and `Setlist:` lines. Both take comma-separated values (`Meta: opener, slow, drop D`, `Setlist: Fri gig, Sat gig`), and a song can be on several setlists. Use `artist:`, `genre:`, `meta:` or `setlist:` to narrow a search to one field.
- **Tags:** header lines such as `Key:`, `Capo:`, `Tuning:` and `Notes:`. A `Notes:` line can also sit anywhere in the song and shows there as a note. A `*` after a chord (`A*`) is kept as a marker. Settings → Show in Live picks the tags shown above the sheet, and the info button in Live lists them all.
- **Backup:** in the list, tap the gear and then Export to save all songs as one `.json` file. Import restores that file, or adds a single `.md`/`.txt` song.
- **Install:** host the folder on GitHub Pages, open the URL on your phone, then Share → Add to Home Screen.
- **Run locally:** serve the folder with any static server and open the printed localhost URL. Do not open `index.html` as a `file://` URL, because the service worker and modules need http(s).
  - Python: `py -m http.server 8000` on Windows, `python3 -m http.server 8000` elsewhere → `http://localhost:8000/`
  - Node: `npx serve .` → `http://localhost:3000/`
  - Tests: open `/test/` on the same server.
- Icons: [Font Awesome Free](https://fontawesome.com) 6.7.2, CC BY 4.0, bundled in `js/icons.js` so the app works offline.
