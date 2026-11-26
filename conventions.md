# Conventions

How code in this repo is written. Read this before changing anything; match it rather than introducing new patterns. User-facing behaviour is in [README.md](README.md).

## Stack

- Vanilla ES modules, no build step, no dependencies, no npm. Everything is loaded as-is by the browser.
- Offline PWA. Anything that needs the network or a CDN is out of bounds.
- Must run over http(s), not `file://` (service worker and modules). See README → Run locally.

## Layout

Folders are layers, top to bottom. A module imports only from its own layer or the layers below it, never above, and never in a cycle.

| Layer | Path | Job |
|---|---|---|
| Shell | `js/app.js` | Entry point and router. Maps each view name from `parseRoute` to that view's `mount`. |
| | `js/routes.js` | Hash URL format: `routes.*` builders, `parseRoute`, `views`, `NEW_ID` for unsaved records, and `listMode`: the list's Live, Edit and Tools modes are routes (`routes.list(mode)`: `#/`, `#/edit`, `#/tools`), so a reload or app update keeps the mode, and Tools adds the Theory view, key and play mode as a query (`routes.list(listMode.tools, { view, key, play })`, parsed into `params.query`; `createCircleControl({ initial, onChange })` reads and reports it); the list keeps the URL in step with `history.replaceState`, and a bare `#/` on launch opens Live. Nothing else builds or parses `#/...` strings. |
| | `js/strings.js` | `strings`: UI text used in more than one place. |
| Views | `js/views/` | Routed screens only: `list`, `live`, `edit`, `setlist`, `shared` (opens a song link). Each exports `mount(root, params)`. |
| Components | `js/components/` | All UI that isn't a routed screen. Primitives: `modal.js` (`openModal`, `attachDialog`, `openPopover`, `attachPopover`, and `confirmDialog`, the one confirmation UI; never native `confirm()`), `toast.js`, `rows.js` (`modalRow` and the dialog rows built on it), `controls.js` (`segToggle`, `stepper`, `keyFace`, `textField`), `parts.js` (search box, song row, not-found screen), `sheet.js` (`renderSheet`), `share.js`. Widgets: `keybar.js`, `tuner.js`, `metronome.js`, `recorder.js` (the Recorder popover, wider via `popoverClass`: record, opt-in count-in, last take), `recordings.js` (the recordings lists, each row opening a take), `take.js` (`createTake`, the one take player: a view mode with waveform scrub, play, save, edit and delete, and an edit mode that renames and trims, then confirm replaces the stored audio), `chord-charts.js` (Live's chord-box strip and tap popover, and `shapePill`, the one Shape picker), `circle.js` (Theory tool: its controls and state, building its model with `theoryModel`; the key is `{ index, minor, flat }`, the wedge plus which enharmonic signature spells it), `theory-views.js` (Clock, Intervals aligned on each chord's root or on the key, Keys, Fretboard, Tab, Chart (vertical chord box of the Fretboard position), Clef and the Tonnetz entry, drawn from a model; `chordBox` is the one chord-box drawing, used by the Chart view and Live (`minRows` reserves height; the Theory tool passes `reserve` so the chart keeps `CHART_MAX_ROWS` from `fretboard`); `THEORY_VIEWS` is the one registry keyed by `visId`, and each entry declares its needs with `neck`, `show` and `labels` so callers have no per-view cases), `fifths.js` (the circle-of-fifths drawing, `createFifths`), `tonnetz.js` (the Tonnetz drawing, `renderTonnetz`), `theory-art.js` (the note markup, tone classes and tap attributes every Theory view and chart shares), `theory-player.js` (`attachPlayer`: hold-to-sound taps, press highlights and step-lit runs for any Theory view), `theory-embed.js` (a locked Theory view for a `{vis: …}` line in a song, built with `sequenceModel`). Views mark what a run lights with `data-step` (the run step indexes). Panels: `tools.js` (the list's Tools mode: Theory inline, plus `createUtilities` for the header tuner, metronome and recorder shared with Live; it hands the metronome's `countIn` to the recorder). Dialogs: `menu.js`, `settings.js`, `details.js`. |
| Domain | `js/sheet/` | Pure song logic with no DOM, storage or prefs: `chords` (also the one owner of note spelling and key tables: `keySpelling`, `spellingOf` (a key name's spelling), `intervalSpelling`, `keyOf(index, minor, flat)`, the key signatures `SIGNATURES` (7♯ to 7♭) with `signatureOf`, `signatureKey` and `nameSignature` (the Theory Key picker lists keys by name from `keyChoices` in `sheet/circle.js`, and Major | Minor uses `parallelKey`), `inlineChords`, `mapChord`; `flat` picks the flat spelling only where a wedge has two, and left out gives the usual one), `parse` (also `lineKinds`, the one line classifier), `lint` (editor warnings built on `lineKinds`), `tempo` (BPM range and parsing), `tuning` (a song's `Tuning:` to an instrument via `retune`, string names, nearest string), `charts` (a song's chords paired with their shapes, and chord boxes from `fretboard`), `infer`, `transpose`, `insert` (keybar chord chips and the text each key inserts), `circle` (circle of fifths: wedge labels, flat name first, the chords of a key including borrowed chords flagged `borrowed` with their source `scalePcs`, `keyScale`, wedge notes, degrees and voicings), `tonnetz` (lattice geometry, triangles and P/L/R neighbours), `fretboard` (instrument-agnostic fingering: an instrument is `{ strings, frets }`, `GUITAR` is the only preset; note places, chord voicings, scale fingerings as swappable strategies keyed by `fingeringId`, run fingerings, chord voicing groups (CAGED forms, closed and drop-2 stacks, triads, power and shell grips as interval templates placed by one function) keyed by `neckShapeId`, `fretLayout`, which picks the position shown and what it plays, and `chartLayout` for the chord-box window, nut, open/muted strings and barre), `staff` (staff notation layout from `keySpelling`: clef choice, accidentals and seconds), `vis-spec` (reads `{vis: …}` lines and owns their option ids, `fingeringId`, `alignId` and `neckShapeId` included), `theory-model` (the model every Theory view draws from: `theoryModel` for the tool, `sequenceModel` for song embeds; both take the key as `index`, `minor` and `flat` and carry its `spelling` and `names`, which `staff` and every view spell from). |
| | `js/audio/` | Web Audio: shared context, pitch detection, `mic.js` (`openMic`/`closeMic`, the one place the microphone is opened), mic input, `record.js` (MediaRecorder capture and its mime type; `startRecording(ready)` opens the mic, then waits on `ready`, such as a count-in, before capturing), `take.js` (decoding a take, its waveform peaks and `AudioBuffer` playback), `wav.js` (`encodeWav` for a take's permanent trim), metronome clicks (`countIn` plays one bar, or waits for the running metronome's next bar), `tone.js` (notes and chords held until released, and scale runs). |
| | `js/data/` | Persistence and settings. `db.js` (IndexedDB: `dbAll`, `dbGet`, `dbPut`, `dbDelete`); `recordings.js` (the Recorder's takes in their own store, never read by `backup.js`, `links.js` or `share.js`; `updateRecording` writes back the cached `peaks` and decoded `duration` or a rename, `replaceAudio` swaps in a trimmed blob, and `clampTrim`, `isTrimmed`, `splitName` and `renamed` are the pure edit helpers); `store.js`, `setlists.js` (in-memory caches over `db.js`: `load()` at start, then sync `all()` / `get(id)` and async writes); `prefs.js` (all preferences); `theme.js` (theme choice, applied on load); `group.js` (list grouping); `backup.js` (gzipped library export/import); `links.js` (compressed song share links). |
| Core | `js/core/` | App-agnostic engine. `dom.js` (tag builders including `optgroup`, buttons, `cls` with `entering` and `resizing`); `icons.js`; `svg.js` (`svg(tag, attrs, text)` for SVG elements); `events.js` (`evt`, `keys`); `math.js` (`clamp`, `mod12`, `OCTAVE`); `autosave.js` (`createAutosave`); `autoscroll.js` (page scroll engine, paging, touch/wheel sync); `compress.js` (`CompressionStream` and base64url); `files.js` (`saveFile` via share sheet or download, `safeFileName`); `time.js` (date and duration formatting); `wakelock.js`; `smooth-height.js` (`smoothHeight(box, content)` animates `box` to the measured height of `content`, returns dispose). |

- The shell's `routes.js` and `strings.js` are constants with no imports, so any layer except `core/` may import them.
- Domain folders may import each other (`audio/pitch.js` uses `sheet/chords.js`; `data/store.js` uses `sheet/parse.js`), but `sheet/` imports only `core/`.
- `core/` imports nothing outside `core/`. If it needs app knowledge, it doesn't belong in `core/`.
- Where a new file goes: a routed screen → `views/`; any other UI → `components/`; logic with no DOM → the domain folder it's about; persisted state → `data/`; reusable with no app knowledge → `core/`. Never a folder named after a screen.
- Components compose other components. Anything a component needs from a screen is passed in (`createMetronomeControl(tempo)`, `attachKeybar(textarea)`).

Other files: `css/app.css` (app chrome, tokens, components; `sheet.css` the song sheet; `keybar.css` the editor keybar), `sw.js` (service worker, cache-first), `test/` (browser test runner).

## Views

- A view exports `mount(root, params)` and returns a cleanup function. The router calls cleanup before the next mount.
- No magic strings for event names, keys or state classes:
  - Event names come from `evt` (`evt.click`, `evt.pointercancel`). `sw.js` is the exception; it is a classic worker and can't import modules.
  - Keys come from `keys` (`e.key === keys.escape`).
  - State classes toggled at runtime come from `cls` (`classList.toggle(cls.active, on)`).
  - Navigation uses `routes.*` (`location.hash = routes.live(id)`), never a hand-built `#/...` string.
  - Icon names come from `iconId` in `core/icons.js`.
  - Option ids come from the id map next to their option list: `controlId`, `utilityId`, `barId`, `tagId`, `modeId`, `pedalId`, `editorId`, `listOptionId`, `numberStyleId` in `prefs.js`, `groupId` in `group.js`, `themeId` in `theme.js`, `levelId` in `audio/click.js`, `visId`, `visControlId`, `stepKind`, `fingeringId`, `alignId` and `neckShapeId` in `sheet/vis-spec.js`, `lineKind` in `sheet/parse.js`, `plrId` in `sheet/tonnetz.js`, `chordChartId` in `prefs.js`, `NECK_SHAPES` (the Shape option list) next to `neckShapeId` in `sheet/vis-spec.js`, and the Theory play modes' `modeId` in `sheet/theory-model.js`. The list entries reference the map, so each id is written once.
  - Add a new entry to the frozen map rather than writing the literal. Structural class names passed to the `dom.js` builders stay as plain strings, as do CSS selectors.
- Handlers are named `const onX = () => ...` and added with `addEventListener`. Listeners on the view's own elements need no removal; they go when the router replaces the view. Listeners on anything that outlives the view (`window`, `document`, `visualViewport`) take `{ signal }` from one `AbortController`, and cleanup calls `abort()`. Cleanup also releases anything held (wake lock, rAF, timers, audio, media streams) and sets a `disposed` flag that async callbacks check.
- Build DOM with the tag builders in `core/dom.js`: `div(attrs, text)`, `span(…)`, `p(…)` and so on. `attrs` is a class string (`div('row-title', title)`), an attribute object (`input({ type: 'range', min: 1 })`), or `null`. Never call `document.createElement` or pass a tag name as a string; a tag the code needs that has no builder gets one in `dom.js`. Don't name a local after a builder you import (`headerEl`, not `header`). SVG elements come from `svg(tag, attrs, text)` in `core/svg.js`, the only place that calls `createElementNS`.
- Buttons always come from `dom.js`. The last argument is *extra* classes added to the base, never the full class list:
  - `button(text, title, extra)` → `.btn`; `iconButton(name, title, extra)` → `.btn.icon`. Both set `type="button"`, `title` and `aria-label`.
  - `labeledButton(icon, content, extra)` → `.btn` with a visible label (text or a node).
  - `iconLink(name, title, href, extra)` → an `<a>` styled `.btn.icon`.
  - `plainButton(content, className)` → a bare `type="button"` with no base class, for things not styled as buttons (keybar keys, toast action, setlist add-song row).
  - Toggled state is `.active` plus `aria-pressed`. Join class names with `classes(...)` from `dom.js`, which skips empty ones.
- Re-render by replacing children (`replaceChildren`) from state, in a `renderX()` function, not by patching nodes ad hoc.
- Live view keyboard and tap handlers ignore input while a `dialog[open]` exists; anything modal must be a `<dialog>`.

## Dialogs

- `openModal(title, ...rows)` from `components/modal.js` builds, shows and removes on close. Listen for `close` on the returned dialog for teardown.
- A button that opens a dialog and owns state across opens (tuner, metronome) uses `attachDialog(button, title, open)`; one that opens a small menu anchored to itself (recorder) uses `attachPopover(button, open)`. `open(close)` returns `{ rows, onClose }` (a popover may add `popoverClass` for its own width), and the returned function disposes it. Don't track the dialog by hand. Controls return `{ button, dispose }`. `open()` may also return a `header` element, which the dialog shows as the first row. Header utilities (tuner, metronome, recorder) are built together with `createUtilities({ tempo, song })` (song carries `id`, `title`, `artist`, `tuning`) from `components/tools.js`, which returns `{ buttons, show(ids), dispose }`; a new utility is one `UTILITIES` entry in `prefs.js` plus one factory in `tools.js`. Stack a label over a control with `labeledField(label, control)` from `rows.js`.
- Dialog rows come from `modalRow(label, ...controls)` in `components/rows.js` (a `div.modal-row` with a `span.modal-label` first; `null` label for none). Reuse its helpers: `choiceRow` (or `choiceToggle` for the bare toggle, to share a row with other controls), `accordionRow(title, ...rows)` for a collapsible group, and the settings groups `listSettingsRows`, `liveSettingsRows`, `editorSettingsRows`.
- Shared controls come from `components/controls.js`: `segToggle(...nodes)` for any `.seg-toggle`, `stepper({ center, downTitle, upTitle, min, max, onStep, pill })` for − value + controls (returns `{ el, set(value) }`; `set` disables the ends), `setPressed(node, on)` and `setTitle(node, title)` from `core/dom.js` for toggle state and title/`aria-label`, `keyFace(label, value)` for the small-label/value face on `.live-key` buttons, `textField(placeholder, extra, attrs)` for text inputs (the placeholder is also the `aria-label`), `selectPill(icon, title, options, value)` for a native picker shown as a pill (options may be `{ label, options }` groups, and an option's `short` replaces its label on the closed pill; returns `{ pill, select, set(id) }`) (the list's sort, inside the search bar via `searchBox(trailing)` in `parts.js`).
- Screen pieces built in more than one view (search box, song row title/subtitle, not-found screen) come from `components/parts.js`. A widget's non-UI logic goes in the domain folder it's about (as `sheet/insert.js` does for the keybar), not in the component.

## Live controls

- Live controls are listed in `CONTROLS` in `prefs.js`, each with a `bar` (`barId.top` header or `barId.bottom` bar). `liveSettingsRows(onSize)` in `components/rows.js` builds the shared Text size / Top bar / Numbers / Bottom bar / Page turner / Live tags rows, used by the Live settings accordion in Settings and by the Live ⋮ menu; Numbers is shown only while the Numbers control is on. `editorSettingsRows()` does the same for the Editor accordion.
- Shown controls are saved as `{ shown, known }`. A control missing from `known` was added after the user last saved and defaults to shown, so new controls appear without resetting anyone's choices.
- `live.js` `applyPrefs()` reads `getShownControls()` and sets `hidden` on each control, and hides the bottom bar when none of its controls are shown. A new control needs an entry in `CONTROLS` and a line in `applyPrefs`.
- Song tempo for Live comes from `rec.tempo`, already overridden by the setlist entry's tempo when playing a set.

## Preferences

- Only through `prefs.js`, for both localStorage and sessionStorage (`theme.js` owns the theme key). Keys are `tabs.<name>`. Values are JSON, except a few older keys stored as raw strings (`tabs.mode`, `tabs.group`, `tabs.q`) that keep their format so existing data still reads. Storage errors are swallowed.
- Option lists are exported arrays of `{ id, label, ... }` with a getter that validates the stored id and falls back to a default.

## Icons

- Font Awesome Free 6.7.2 **solid**, inlined in `js/core/icons.js` as `[iconId.name]: [viewBox, pathD]`.
- Refer to icons only through `iconId` (`iconButton(iconId.xmark, 'Close')`), never by name string. A new icon needs an `iconId` entry (camelCase key, Font Awesome name as value) and an `ICONS` entry.
- Copy the viewBox and path exactly from the Font Awesome 6.7.2 source. Never hand-write or approximate a path.
- When Font Awesome Free has no fitting icon, take the fill variant from Phosphor Icons 2.1.1 (MIT) and credit it in the header comment of `icons.js` (`metronome`, `piano-keys`, `music-note-simple`, `music-notes`).

## CSS

- Colours, radii, shadows and easing are tokens on `:root`; light theme overrides them on `:root[data-theme="light"]`. Use tokens, never raw colours, so both themes work.
- Reuse existing components: `.btn`, `.btn.icon`, `.active`, `.seg-toggle`, `.hdr`, `.live-hdr`, `.live-key`, `.bar`, `.badge`, `.chips`/`.chip`, `.slider`, `.modal-*`.
- A global `prefers-reduced-motion` rule already shortens animations; don't add per-component CSS overrides. A JS helper that sets sizes for an animation (like `smoothHeight`) checks `matchMedia` itself and skips the animation.

## Service worker

- `sw.js` caches an explicit `ASSETS` list. Adding, renaming or removing any file under `js/`, `css/` or `icons/` means updating `ASSETS` **and** bumping `CACHE` (`tabs-vN`). Bump `CACHE` for any shipped change, or installed apps keep the old files.

## Tests

- Open `/test/` on a local server. `test/harness.js` exports `test(name, fn)`, `eq(actual, expected, msg)` (JSON comparison) and `fixture(name)`.
- One `*.test.js` per logic module, importing from `../js/...`. Register new files in the `files` array in `test/run.js`.
- Test pure modules only; views and components aren't unit tested.

## Code style

- 2-space indent, single quotes, semicolons, trailing commas in multi-line literals.
- Named `function` declarations for module-level and inner functions; arrow functions for handlers and callbacks.
- Module constants in `UPPER_SNAKE` at the top of the file.
- Clamp numeric state with `clamp(n, min, max)` from `math.js`.
- Text that appears in more than one place goes in `strings.js`; one-off labels stay inline.
- A screen that edits a record saves through `createAutosave`, never its own timer and queue.
- A constant or helper used by more than one module lives in the module that owns its domain (for example `MAX_SHIFT` and `signed` in `sheet/transpose.js`), never copied.
- Comments are rare: only where code can't speak for itself (for example `// wake lock is best effort` in an empty `catch`). Never narrate history.
- Best-effort browser APIs (wake lock, storage, share) are wrapped in `try/catch` and degrade silently.
