# Conventions

How code in this repo is written. Read this before changing anything; match it rather than introducing new patterns. User-facing behaviour is in [README.md](README.md).

## Stack

- Vanilla ES modules, no build step, no dependencies, no npm. Everything is loaded as-is by the browser.
- Offline PWA. Anything that needs the network or a CDN is out of bounds.
- Must run over http(s), not `file://` (service worker and modules). See README → Run locally.

## Layout

| Path | Job |
|---|---|
| `js/app.js` | Hash router. Maps `#/live/:id`, `#/preview/:id`, `#/set/:setId/:songId`, `#/edit/:id/...`, `#/setlist/:id` to a view's `mount`. |
| `js/views/*.js` | Screens and dialogs. UI only. |
| `js/sheet/*.js` | Pure song logic: parse, infer, transpose, render. No storage, no prefs. |
| `js/edit/*.js` | Editor helpers (keybar). |
| `js/db.js` | IndexedDB wrapper (`dbAll`, `dbPut`, `dbDelete`; stores `songs`, `setlists`). |
| `js/store.js`, `js/setlists.js` | In-memory caches over `db.js`; `load()` at start, then sync `all()` / `get(id)` and async writes. |
| `js/prefs.js` | All localStorage preferences. |
| `js/dom.js` | DOM builders: `create`, `el`, `button`, `iconButton`. |
| `js/modal.js`, `js/toast.js`, `js/icons.js`, `js/theme.js` | Shared UI primitives. |
| `js/audio/*.js` | Web Audio: shared context, pitch detection, mic input, metronome clicks. |
| `css/app.css` | App chrome, tokens, components. `sheet.css` is the song sheet; `keybar.css` the editor keybar. |
| `sw.js` | Service worker, cache-first. |
| `test/` | Browser test runner. |

New logic that isn't UI gets its own module outside `views/` (as `sheet/` does), so it can be tested without the DOM.

## Views

- A view exports `mount(root, params)` and returns a cleanup function. The router calls cleanup before the next mount.
- Handlers are named `const onX = () => ...` and added with `addEventListener`. Listeners on the view's own elements need no removal; they go when the router replaces the view. Listeners on anything that outlives the view (`window`, `document`, `visualViewport`) take `{ signal }` from one `AbortController`, and cleanup calls `abort()`. Cleanup also releases anything held (wake lock, rAF, timers, audio, media streams) and sets a `disposed` flag that async callbacks check.
- Build DOM imperatively with `js/dom.js`: `create(tag, attrs, text)` or `el(tag, className, text)`. Don't redefine these locally.
- Buttons: `button(label, title, className)` or `iconButton(name, title, className)` from `dom.js`; both set `type="button"`, `title` and `aria-label`. Toggled state is `.active` plus `aria-pressed`.
- Re-render by replacing children (`replaceChildren`) from state, in a `renderX()` function, not by patching nodes ad hoc.
- Live view keyboard and tap handlers ignore input while a `dialog[open]` exists; anything modal must be a `<dialog>`.

## Dialogs

- `openModal(title, ...rows)` from `modal.js` builds, shows and removes on close. Listen for `close` on the returned dialog for teardown.
- Rows are `div.modal-row` with a `span.modal-label` first. Reuse `views/rows.js` helpers: `labeledButton`, `choiceRow`, `chipsRow`, `textSizeRow`.

## Live controls

- Header controls in Live are listed in `CONTROLS` in `prefs.js`. Users toggle them via Settings → Live controls and the ⋮ menu (`chipsRow`).
- `live.js` `applyPrefs()` reads `getShownControls()` and sets `hidden` on each control. A new control needs an entry in `CONTROLS` and a line in `applyPrefs`.
- Song tempo for Live comes from `rec.tempo`, already overridden by the setlist entry's tempo when playing a set.

## Preferences

- Only through `prefs.js`, for both localStorage and sessionStorage (`theme.js` owns the theme key). Keys are `tabs.<name>`. Values are JSON, except a few older keys stored as raw strings (`tabs.mode`, `tabs.group`, `tabs.q`) that keep their format so existing data still reads. Storage errors are swallowed.
- Option lists are exported arrays of `{ id, label, ... }` with a getter that validates the stored id and falls back to a default.

## Icons

- Font Awesome Free 6.7.2 **solid**, inlined in `js/icons.js` as `'name': [viewBox, pathD]`.
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
- Test pure modules only; views aren't unit tested.

## Code style

- 2-space indent, single quotes, semicolons, trailing commas in multi-line literals.
- Named `function` declarations for module-level and inner functions; arrow functions for handlers and callbacks.
- Module constants in `UPPER_SNAKE` at the top of the file.
- Clamp numeric state with `Math.min(MAX, Math.max(MIN, n))`.
- A constant or helper used by more than one module lives in the module that owns its domain (for example `MAX_SHIFT` and `signed` in `sheet/transpose.js`), never copied.
- Comments are rare: only where code can't speak for itself (for example `// wake lock is best effort` in an empty `catch`). Never narrate history.
- Best-effort browser APIs (wake lock, storage, share) are wrapped in `try/catch` and degrade silently.
