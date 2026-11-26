# Lead Sheets

An offline lead sheet and tab viewer that installs to your phone's home screen. Songs are stored on the device (IndexedDB); this repository contains none.

- **Live** shows chords and lyrics with auto-scroll and Prev / Next.
- **Edit** is a plain-text editor with a wand (Infer Format) that tidies pasted text.
  - An orange ⚠ count in the header lists what Live can't read: chord-line words that aren't chords (`Hm`), `[bracket]` chords, `{vis: …}` problems, and `Key:`, `Capo:` (0–12), `Tempo:` (30–250), `Tuning:` or `Key change:` values. Tap a warning to select it in the text.
- **Tools** holds the tuner, metronome, recorder and Theory.

## Writing songs

- **Header tags:** `Key:`, `Capo:`, `Tempo:`, `Tuning:`, `Notes:` and `Meta:` (comma-separated, searchable: `Meta: opener, slow, drop D`).
- **Key and capo:** `Key:` is the sounding key; chords are the shapes you play. `Key: D` with `Capo: 2` and C shapes shows C as 1.
- **Tuning:** `Standard`, `Eb standard` (any note: `D standard`, `C# standard`), `Half step down`, `Whole step down`, `Drop D` (any note: `Drop C#`, `Drop C`), `Double drop D`, `DADGAD`, `Open G`, `Open D`, `Open E`, `Open C`, or the open strings low to high (`D A D G B E`, `DADGBE`, `C# G# C# F# A# D#`). The song's chord charts, `fretboard` / `tab` / `chart` views and Live's tuner use it; Theory in Tools stays in standard tuning.
- **In the body:** `Notes:` shows a note in place, `Key change: A` marks a modulation (numbers restart from the new key), and `A*` keeps a marker on a chord.
- **Theory views:** a line like `{vis: piano, seq: 1 2 3 5 8 1, controls: play}` shows a small locked Theory view in Live.
  - `vis`: `piano` (or `keys`), `fretboard` (or `guitar`), `tab`, `chart` (or `chord`, `diagram`), `clef` (or `staff`), `clock`, `intervals` (rows on each chord's root) or `notes` (the same grid lined up on the key), `fifths`, `tonnetz`.
  - `seq`: degrees of the key (`8` is the octave, `b3` / `#4` shift a semitone) and chord names (`G Em7 C/E`).
  - `key: G` sets the key; otherwise the song's key is used, in the same shapes as the chords.
  - `controls: play` adds a Play button that steps through the sequence.
  - On `fretboard`, `tab` and `chart`, `position: 2` fingers the sequence in that position of the key's scale, using `fingering: caged` (default), `3nps` or `string`, and `shape: caged`, `closed`, `triad`, `power` or `shell` plays chords in that shape (without it, chords take the most compact grip).
  - Only notes in the sequence respond to taps, chords follow Transpose, and anything unreadable is listed under the view.

## Live

- **Capo** (−/+) changes the key but keeps the shapes. **Transpose** (−/+) changes both. Tap either value to reset.
- **Numbers** replace chords with Nashville or Roman numerals (needs `Key:`).
- None of these change the saved song.
- **Chord charts:** Settings → Live settings → Chord charts picks Off, Strip, Tap (the default) or Both. Strip shows a box for each of the song's chords above the sheet, in order of first appearance, with a Shape choice (CAGED, Closed, Triad, Power, Shell, falling back as in Theory) kept for the song until the app closes. Tap opens a chord's box from the sheet, with ‹ › for other positions and the same Shape choice. Boxes follow Transpose, keep their shapes under Capo, show the chord shapes under Numbers and use the song's `Tuning:`. Hold a box to hear it. Chords that can't be voiced are left out of the strip and show No chart.
- **Settings → Live settings** picks the top bar controls, which utilities (tuner, metronome, recorder) the header shows under Utility Visibility, bottom bar, text size, number style, tags shown above the sheet, page turner mode and chord charts. The ⋮ menu in Live has the same settings plus Edit song and Share song.
- **Page turner:** Bluetooth pedals and keyboards work. Page Down / ↓ / → go forward, Page Up / ↑ / ← go back, Space plays or pauses. Page mode scrolls a screen at a time; Song mode always changes song.

## Tools

The tuner, metronome and recorder are buttons in the header, in Live and in Tools mode, and each opens in a popover. Theory fills the Tools page. **Settings → Tools → Utility Visibility** picks which of them the Tools header shows; Live has its own choice under Live settings.

- **Tuner:** chromatic, uses the mic only while open. A row of open-string notes lights the string nearest the note you play: the song's `Tuning:` in Live, standard tuning otherwise.
- **Metronome:** in Live, starts at the song's or setlist's tempo. Tap sets it; tap the Tempo or Beats number to type a value. Tap a beat's square to cycle primary, secondary and silent. Keeps clicking while its popover is closed (its icon pulses) and stops when you leave Live or Tools.
- **Recorder:** Record / Stop records from the mic, which is used only while recording. Keeps recording while its popover is closed (its icon pulses red); leaving Live or Tools, or Prev / Next in Live, stops and saves it. Recordings stay on this device. In Live a recording belongs to the open song and is named `Title - Artist - date time`; in Tools it is named `Recording - date time`. Count-in (off by default, remembered) plays one bar of the metronome's tempo and beats before recording starts, or waits for the next bar if the metronome is already running. The popover shows the last take for the song (or the last one without a song in Tools) once it stops. View recordings (with its count) lists the open song's, View all recordings lists every one grouped by song; tap one to open it. A take shows its waveform: tap or drag to scrub, with Play / Pause, Save, Edit and Delete under it. Save writes the stored file to the device (Share sheet where available, otherwise a download). Edit renames the file and shows blue handles to trim; ✓ makes the changes permanent (a trimmed take is re-encoded as a `.wav` and replaces the original), ✕ discards them. Delete asks first. Recordings live in the browser's storage for this site, not as files, until saved.
- **Theory:** pick a key on the circle of fifths, or from the Key signature row above any view, and explore its chords and scales. Everything plays while held.
  - **Key signature:** the picker lists the 15 signatures from 7♯ through none to 7♭, each with its major and relative minor (`3♭ · E♭ / Cm`); B (5♯) and C♭ (7♭), F♯ (6♯) and G♭ (6♭), C♯ (7♯) and D♭ (5♭) are separate choices, and the closed picker shows just the signature (`3♭`, `♮` for none). Major | Minor beside it switches between the signature's major and relative minor. Every view spells notes and chords from the chosen signature (C♭ in G♭ major, E♯ in F♯ major). The circle's wedges list the flat name first; tapping a wedge with two spellings picks the flat one, or keeps the current spelling when it's the selected key's wedge. On Fifths a minor key lights its inner-ring wedge and the hub reads minor.
  - **Views:** Fifths, Clock, Intervals (a row per chord; Align lines the rows up on each chord's Root or on the Key), Keys (piano; Settings → Tools → Piano octaves sets two or three), Guitar (a standard-tuned fretboard), Tab (what the Guitar position plays, as tablature), Chart (the same position as a chord box: low E on the left, × and ○ for muted and open strings, a bar for a barre and the starting fret beside it), Clef (staff notation in the key's signature, treble, bass or both as the notes need) and Tonnetz.
  - **Tonnetz:** a lattice of notes centred on the key's tonic, fifths running across and major and minor thirds on the diagonals, so every major triad is a triangle pointing up and every minor triad one pointing down. Tap a note or a triangle to hear it. Chord fills the triangles inside the chord (two for a seventh like Cmaj7) and outlines the chords one note away; Note lights every place the note sits and outlines the six triangles around it; Scale shades every triangle inside the scale, which for the key are its major and minor chords.
  - **Guitar:** shows one position at a time; ‹ › moves along the neck, and Neck shows every position faintly with the current one solid. Chords pick a Shape, each stepped lowest fret first with unused strings muted: CAGED (the five shapes moved to the chord's root, so C, A, G, E and D land on their open shapes; major, minor, 6, 7, m7, maj7 and sus), Closed (every chord tone once on neighbouring strings with none skipped, stacked close or with the second-highest note dropped an octave, like Fmaj7 xx3210 or Cmaj7 x3545x), Triad (three notes on neighbouring strings, for three-note chords), Power (root, fifth and octave from the 6th, 5th or 4th string, for chords with a perfect fifth) or Shell (root on the 6th or 5th string with the 3rd and 7th, or 6th, for chords that have one). A shape the chord can't take is greyed out and the view falls back to CAGED, then Closed, then Triad (then the most compact grip), keeping your choice for the next chord that has it; changing Shape goes back to position 1. A chord sounds exactly the shape shown, and Voicing keeps only shapes with that inversion's note in the bass (dropping the low strings of a CAGED shape until it is), so Power and Shell, always on the root, give way to an inversion. Scales step through fingerings (CAGED boxes, 3 per string or along one string) and play the position shown, and notes through each place the pitch sounds (Unison) or every octave (Octaves). Labels adds note names or degrees; tapping the neck shows the note.
  - **Play:** Note (scale degrees), Chord (the default) or Scale (seven modes plus major and minor pentatonic).
  - **Chords:** the ⋯ under a chord swaps its shape (Cmaj7, Csus2 …), grouped into In key and Outside the key. Voicing picks Root position or the 1st or 2nd inversion, and the 3rd for chords of four or more notes.
  - **Borrowed:** in Chord, the dashed vertical Borrowed tab that starts the second row of chords (› closed, ‹ open) adds chords from outside the key to the grid, in orange: iv, ♭III, ♭VI and ♭VII from the parallel minor in a major key (Fm, E♭, A♭, B♭ in C), and V, IV and the Neapolitan ♭II in a minor key (E, D, B♭ in A minor). They swap shapes, voice and play like the others, and while they're shown Fifths outlines their wedges in orange.
  - **Scales:** In key builds modes from the key's notes (D Dorian in C); On tonic starts each on the tonic (C Dorian). In Intervals each scale gets its own row for comparison. Tapping a scale plays it and lights each note.
  - **Colours:** the root is lime, notes outside the key are orange.
  - **Lock:** at the end of the Key signature row, whose picker and Major | Minor it disables while on. On Fifths it keeps the key while you tap other wedges; elsewhere only the shown notes respond.

## Library

- **Search** matches title, artist, album, genre and `Meta:`. Narrow with `artist:`, `genre:` or `meta:`.
- **Setlists:** pick By Setlist in the list. In Edit mode, + New setlist (or the pen on one) names it, adds and orders songs, and sets each song's capo and tempo. Tapping a song in Live plays the set in order.
- **Sharing:** long-press a song (or ⋮ → Share song in Live) to send a link. The song is compressed into the link; opening it adds the song, or finds an identical copy. Recordings are never included.
- **Backup:** ⋮ → App → Share library saves all songs and setlists as one `.json.gz`; recordings are not included (save them one by one from the recorder). Import restores it (or an older `.json`), or adds a single `.md` / `.txt` song.
- **Editor settings:** Settings → Editor can run Infer Format on every Preview and hide the wand.

## Run

- **Install:** host the folder (e.g. GitHub Pages), open it on your phone, then Share → Add to Home Screen.
- **Locally:** serve the folder over http (not `file://`; the service worker and modules need it):
  - `py -m http.server 8000` (Windows) or `python3 -m http.server 8000` → `http://localhost:8000/`
  - `npx serve .` → `http://localhost:3000/`
- **Tests:** open `/test/` on the same server.

Icons: [Font Awesome Free](https://fontawesome.com) 6.7.2 (CC BY 4.0) and [Phosphor Icons](https://phosphoricons.com) 2.1.1 (MIT), bundled in `js/core/icons.js`.
