# Conventions

How code in this repo is written. Read this before changing anything; match it rather than introducing new patterns. User-facing behaviour is in [README.md](README.md).

## Stack

- Vanilla ES modules, no build step, no dependencies, no npm. Everything is loaded as-is by the browser.
- Offline PWA. Anything that needs the network or a CDN is out of bounds.
- Must run over http(s), not `file://` (service worker and modules). See README → Run locally.

## Layout

| Path | Job |
|---|---|
| `js/app.js` | Router. Maps each view name from `parseRoute` to that view's `mount`. |
| `js/routes.js` | Hash URL format: `routes.*` builders, `parseRoute`, `views`, and `NEW_ID` for unsaved records. Nothing else builds or parses `#/...` strings. |
| `js/views/*.js` | Routed screens only: `list`, `live`, `edit`, `setlist`. Each exports `mount(root, params)` for the router. UI only. |
| `js/components/*.js` | Everything UI that isn't a routed screen. Primitives: `modal.js` (`openModal`, `attachDialog`), `toast.js`, `icons.js`, `rows.js` (dialog rows), `parts.js` (search box, song row, not-found screen). Widgets: `keybar.js`, `tuner.js`, `metronome.js`. Dialogs: `menu.js`, `settings.js`, `details.js`. |
| `js/sheet/*.js` | Pure song logic: parse, infer, transpose, render. No storage, no prefs. |
| `js/edit/*.js` | Editor text logic with no DOM: `insert.js` (keybar chord chips and the text each key inserts). |
| `js/live/*.js` | Live-mode behaviour with no UI: `autoscroll.js` (scroll engine, paging, touch/wheel sync), `wakelock.js` (screen wake lock). `views/live.js` builds the screen and wires these together. |
| `js/db.js` | IndexedDB wrapper (`dbAll`, `dbPut`, `dbDelete`; stores `songs`, `setlists`). |
| `js/store.js`, `js/setlists.js` | In-memory caches over `db.js`; `load()` at start, then sync `all()` / `get(id)` and async writes. |
| `js/prefs.js` | All localStorage preferences. |
| `js/dom.js` | DOM builders: one function per tag (`div`, `span`, `p`, …), `button`, `iconButton`, `labeledButton`, and `cls`, the state class names. The only place `document.createElement` is called. |
| `js/events.js` | `evt` (DOM event names) and `keys` (`KeyboardEvent.key` values). |
| `js/autosave.js` | `createAutosave`: debounced, queued saves that also flush when the app is hidden. Used by every editing screen. |
| `js/math.js` | `clamp`, `mod12`. |
| `js/strings.js` | `strings`: UI text used in more than one place. |
| `js/theme.js` | Theme choice (`getTheme`, `setTheme`); applies the saved theme on load. |
| `js/audio/*.js` | Web Audio: shared context, pitch detection, mic input, metronome clicks. |
| `css/app.css` | App chrome, tokens, components. `sheet.css` is the song sheet; `keybar.css` the editor keybar. |
| `sw.js` | Service worker, cache-first. |
| `test/` | Browser test runner. |

New logic that isn't UI gets its own module outside `views/` and `components/` (as `sheet/` does), so it can be tested without the DOM.

## Views

- A view exports `mount(root, params)` and returns a cleanup function. The router calls cleanup before the next mount.
- No magic strings for event names, keys or state classes:
  - Event names come from `evt` (`evt.click`, `evt.pointercancel`). `sw.js` is the exception; it is a classic worker and can't import modules.
  - Keys come from `keys` (`e.key === keys.escape`).
  - State classes toggled at runtime come from `cls` (`classList.toggle(cls.active, on)`).
  - Navigation uses `routes.*` (`location.hash = routes.live(id)`), never a hand-built `#/...` string.
  - Option ids come from the id map next to their option list: `controlId`, `tagId`, `modeId`, `pedalId`, `editorId`, `featureId`, `numberStyleId` in `prefs.js`, and `groupId` in `group.js`. The list entries reference the map, so each id is written once.
  - Add a new entry to the frozen map rather than writing the literal. Structural class names passed to `create`/`el`/`button` stay as plain strings, as do CSS selectors.
- Handlers are named `const onX = () => ...` and added with `addEventListener`. Listeners on the view's own elements need no removal; they go when the router replaces the view. Listeners on anything that outlives the view (`window`, `document`, `visualViewport`) take `{ signal }` from one `AbortController`, and cleanup calls `abort()`. Cleanup also releases anything held (wake lock, rAF, timers, audio, media streams) and sets a `disposed` flag that async callbacks check.
- Build DOM with the tag builders in `js/dom.js`: `div(attrs, text)`, `span(…)`, `p(…)` and so on. `attrs` is a class string (`div('row-title', title)`), an attribute object (`input({ type: 'range', min: 1 })`), or `null`. Never call `document.createElement` or pass a tag name as a string; a tag the code needs that has no builder gets one in `dom.js`. Don't name a local after a builder you import (`headerEl`, not `header`). SVG is the exception (`components/icons.js`, `createElementNS`).
- Buttons always come from `dom.js`: `button(label, title, className)` or `iconButton(name, title, className)` (both set `type="button"`, `title` and `aria-label`), or `labeledButton(icon, text, className)` for a visible text label. `labeledButton` also takes a node as its content, for whole-row buttons (setlist's add-song row). Toggled state is `.active` plus `aria-pressed`.
- Re-render by replacing children (`replaceChildren`) from state, in a `renderX()` function, not by patching nodes ad hoc.
- Live view keyboard and tap handlers ignore input while a `dialog[open]` exists; anything modal must be a `<dialog>`.

## Dialogs

- `openModal(title, ...rows)` from `components/modal.js` builds, shows and removes on close. Listen for `close` on the returned dialog for teardown.
- A button that opens a dialog and owns state across opens (tuner, metronome) uses `attachDialog(button, title, open)`. `open()` returns `{ rows, onClose }`, and the returned function disposes it. Don't track the dialog by hand.
- Rows are `div.modal-row` with a `span.modal-label` first. Reuse `components/rows.js` helpers: `choiceRow`, `chipsRow`, `textSizeRow`.
- Screen pieces built in more than one view (search box, song row title/subtitle, not-found screen) come from `components/parts.js`. A self-contained UI piece (shared, or a widget that owns its own DOM and listeners) goes in `components/`; its non-UI logic goes in a plain module beside the code it serves (as `edit/insert.js` does for the keybar).
- Views compose components; components may compose other components. Dependencies point one way: views → components → infrastructure (`dom.js`, `events.js`, `routes.js`, `prefs.js`, `audio/`, `edit/`, `sheet/`, …). A component never imports a view, and components never import each other in a cycle. Anything a component needs from a screen is passed in (`createMetronomeControl(tempo)`, `attachKeybar(textarea)`).

## Live controls

- Header controls in Live are listed in `CONTROLS` in `prefs.js`. Users toggle them via Settings → Live controls and the ⋮ menu (`chipsRow`).
- `live.js` `applyPrefs()` reads `getShownControls()` and sets `hidden` on each control. A new control needs an entry in `CONTROLS` and a line in `applyPrefs`.
- Song tempo for Live comes from `rec.tempo`, already overridden by the setlist entry's tempo when playing a set.

## Preferences

- Only through `prefs.js`, for both localStorage and sessionStorage (`theme.js` owns the theme key). Keys are `tabs.<name>`. Values are JSON, except a few older keys stored as raw strings (`tabs.mode`, `tabs.group`, `tabs.q`) that keep their format so existing data still reads. Storage errors are swallowed.
- Option lists are exported arrays of `{ id, label, ... }` with a getter that validates the stored id and falls back to a default.

## Icons

- Font Awesome Free 6.7.2 **solid**, inlined in `js/components/icons.js` as `'name': [viewBox, pathD]`.
- Copy the viewBox and path exactly from the Font Awesome 6.7.2 source. Never hand-write or approximate a path.

## CSS

- Colours, radii, shadows and easing are tokens on `:root`; light theme overrides them on `:root[data-theme="light"]`. Use tokens, never raw colours, so both themes work.
- Reuse existing components: `.btn`, `.btn.icon`, `.active`, `.seg-toggle`, `.hdr`, `.live-hdr`, `.live-key`, `.bar`, `.badge`, `.chips`/`.chip`, `.slider`, `.modal-*`.
- A global `prefers-reduced-motion` rule already shortens animations; don't add per-component overrides.

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
