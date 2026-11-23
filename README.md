# Lead Sheets

An offline lead sheet and tab viewer that installs to your phone's home screen. Songs are stored on the device (IndexedDB); this repository contains none.

- **Live** shows chords and lyrics with auto-scroll and Prev / Next.
- **Edit** is a plain-text editor with a wand (Infer Format) that tidies pasted text.
- **Tools** holds the tuner, metronome and Theory.

## Writing songs

- **Header tags:** `Key:`, `Capo:`, `Tempo:`, `Tuning:`, `Notes:` and `Meta:` (comma-separated, searchable: `Meta: opener, slow, drop D`).
- **Key and capo:** `Key:` is the sounding key; chords are the shapes you play. `Key: D` with `Capo: 2` and C shapes shows C as 1.
- **In the body:** `Notes:` shows a note in place, `Key change: A` marks a modulation (numbers restart from the new key), and `A*` keeps a marker on a chord.
- **Theory views:** a line like `{vis: piano, seq: 1 2 3 5 8 1, controls: play}` shows a small locked Theory view in Live.
  - `vis`: `piano` (or `keys`), `fretboard` (or `guitar`), `tab`, `clef` (or `staff`), `clock`, `intervals` (rows on each chord's root) or `notes` (the same grid lined up on the key), `fifths`.
  - `seq`: degrees of the key (`8` is the octave, `b3` / `#4` shift a semitone) and chord names (`G Em7 C/E`).
  - `key: G` sets the key; otherwise the song's key is used, in the same shapes as the chords.
  - `controls: play` adds a Play button that steps through the sequence.
  - On `fretboard` and `tab`, `position: 2` fingers the sequence in that position of the key's scale, using `fingering: caged` (default), `3nps` or `string`.
  - Only notes in the sequence respond to taps, chords follow Transpose, and anything unreadable is listed under the view.

## Live

- **Capo** (−/+) changes the key but keeps the shapes. **Transpose** (−/+) changes both. Tap either value to reset.
- **Numbers** replace chords with Nashville or Roman numerals (needs `Key:`).
- None of these change the saved song.
- **Settings → Live settings** picks the top bar controls, which utilities (tuner, metronome) the header shows under Utility Visibility, bottom bar, text size, number style, tags shown above the sheet and page turner mode. The ⋮ menu in Live has the same settings plus Edit song and Share song.
- **Page turner:** Bluetooth pedals and keyboards work. Page Down / ↓ / → go forward, Page Up / ↑ / ← go back, Space plays or pauses. Page mode scrolls a screen at a time; Song mode always changes song.

## Tools

The tuner and metronome are buttons in the header, in Live and in Tools mode, and each opens in a popover. Theory fills the Tools page. **Settings → Tools → Utility Visibility** picks which of them the Tools header shows; Live has its own choice under Live settings.

- **Tuner:** chromatic, uses the mic only while open.
- **Metronome:** in Live, starts at the song's or setlist's tempo. Tap sets it; tap the Tempo or Beats number to type a value. Tap a beat's square to cycle primary, secondary and silent. Keeps clicking while its popover is closed (its icon pulses) and stops when you leave Live or Tools.
- **Theory:** pick a key on the circle of fifths and explore its chords and scales. Everything plays while held.
  - **Views:** Fifths, Clock, Intervals (a row per chord; Align lines the rows up on each chord's Root or on the Key), Keys (piano; Settings → Tools → Piano octaves sets two or three), Guitar (a standard-tuned fretboard), Tab (what the Guitar position plays, as tablature) and Clef (staff notation in the key's signature, treble, bass or both as the notes need).
  - **Guitar:** shows one position at a time; ‹ › moves along the neck, and Neck shows every position faintly with the current one solid. Chords step through the five CAGED shapes moved to the chord's root, lowest fret first (so C, A, G, E and D land on their open shapes), then smaller voicings on neighbouring strings, with unused strings muted; major, minor, 6, 7, m7, maj7 and sus shapes get CAGED shapes, other swaps only the neighbouring-string ones. A chord sounds exactly the shape shown, and Voicing keeps only shapes with that inversion's note in the bass (dropping the low strings of a CAGED shape until it is). Scales step through fingerings (CAGED boxes, 3 per string or along one string) and play the position shown, and notes through each place the pitch sounds (Unison) or every octave (Octaves). Labels adds note names or degrees; tapping the neck shows the note.
  - **Play:** Note (scale degrees), Chord (the default) or Scale (seven modes plus major and minor pentatonic).
  - **Chords:** the ⋯ under a chord swaps its shape (Cmaj7, Csus2 …), grouped into In key and Outside the key. Voicing picks Root position or the 1st or 2nd inversion, and the 3rd for chords of four or more notes.
  - **Scales:** In key builds modes from the key's notes (D Dorian in C); On tonic starts each on the tonic (C Dorian). In Intervals each scale gets its own row for comparison. Tapping a scale plays it and lights each note.
  - **Colours:** the root is lime, notes outside the key are orange.
  - **Lock:** on Fifths it keeps the key while you tap other wedges; elsewhere only the shown notes respond.

## Library

- **Search** matches title, artist, album, genre and `Meta:`. Narrow with `artist:`, `genre:` or `meta:`.
- **Setlists:** pick By Setlist in the list. In Edit mode, + New setlist (or the pen on one) names it, adds and orders songs, and sets each song's capo and tempo. Tapping a song in Live plays the set in order.
- **Sharing:** long-press a song (or ⋮ → Share song in Live) to send a link. The song is compressed into the link; opening it adds the song, or finds an identical copy.
- **Backup:** ⋮ → App → Share library saves all songs and setlists as one `.json.gz`. Import restores it (or an older `.json`), or adds a single `.md` / `.txt` song.
- **Editor settings:** Settings → Editor can run Infer Format on every Preview and hide the wand.

## Run

- **Install:** host the folder (e.g. GitHub Pages), open it on your phone, then Share → Add to Home Screen.
- **Locally:** serve the folder over http (not `file://`; the service worker and modules need it):
  - `py -m http.server 8000` (Windows) or `python3 -m http.server 8000` → `http://localhost:8000/`
  - `npx serve .` → `http://localhost:3000/`
- **Tests:** open `/test/` on the same server.

Icons: [Font Awesome Free](https://fontawesome.com) 6.7.2 (CC BY 4.0) and [Phosphor Icons](https://phosphoricons.com) 2.1.1 (MIT), bundled in `js/core/icons.js`.
