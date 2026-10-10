# Parochie Sint-Niklaas Herfelingen

A training project: a website for the Sint-Niklaaskerk in Herfelingen (Pajottegem), showing Mass times, the history of the church and village, photos, a map and nearby churches. It is available in Dutch and French, with light and dark mode.

The chosen design is the **warm & traditional** style: parchment, burgundy and gold, serif headings, and an arched window frame. Two alternative designs (*modern* and *bold*) are kept on the `feature/parish-website` branch.

**Live site:** <https://wimsuenens.github.io/klodjan/>

## Run it

The pages load data with `fetch()` and JavaScript modules, which browsers block on `file://`. That means you need a small local web server:

```sh
python3 -m http.server 8000      # or: npm start
```

Then open <http://localhost:8000>. No `npm install` or build step is needed.

## Project structure

```
index.html            the page (layout and placeholders)
styles.css            the look: colours, fonts, layout
shared/
  data/churches.json  ALL content: churches, Mass schedule, history, photos, sources
  i18n/nl.json, fr.json   interface texts in Dutch and French
  js/                 the logic, shared by all styles (see below)
  css/base.css        reset, accessibility helpers, lightbox
  fonts/              self-hosted fonts (no Google tracking, GDPR-friendly)
  img/                photos from Wikimedia Commons (WebP)
tests/                automated tests: npm test
```

### How a page works

1. `index.html` contains empty placeholders like `<div data-slot="upcoming"></div>`.
2. `shared/js/main.js` loads `churches.json` and the language file.
3. `render.js` builds the content and puts it into each `data-slot`.
4. `styles.css` decides how it looks.

| Module | Job |
|---|---|
| `schedule.js` | Turns "every Sunday 10:45" + exceptions into real dates (pure logic, tested) |
| `ics.js` | Builds `.ics` calendar files (the standard every calendar app understands) |
| `i18n.js` | Language detection and switching (`data-i18n="key"` in the HTML) |
| `theme.js` | Light/dark toggle |
| `gallery.js` | Photo lightbox on the native `<dialog>` element |
| `dom.js` | Safe helper to create elements (no `innerHTML`, so no XSS) |
| `render.js` | Turns data into HTML |

## Editing content

**Changing the Mass schedule:** edit `schedule` in `shared/data/churches.json`.

```jsonc
"weekly": [
  { "weekday": 0, "time": "10:45", "durationMinutes": 60, "type": "eucharist" }  // 0 = Sunday … 6 = Saturday
],
"exceptions": [
  // cancel a regular Mass
  { "date": "2026-11-01", "cancel": true, "note": { "nl": "Viering in Herne", "fr": "Messe à Herne" } },
  // add an extra Mass
  { "date": "2026-12-24", "time": "23:00", "type": "eucharist", "note": { "nl": "Nachtmis", "fr": "Messe de minuit" } }
]
```

**Adding another church:** the 11 nearby churches are already in `churches.json` with a Kerknet link. To give one its own page, add `coords`, `address`, `schedule`, `history` and so on, as for Herfelingen. Then copy `index.html` (for example to `herne.html`) and set `<body data-church="herne">`.

**Adding a new text:** add the key to **both** `nl.json` and `fr.json`, then use `data-i18n="your.key"` in the HTML.

## Tests

```sh
npm test        # = node --test (Node's built-in test runner, no packages)
```

## Publishing on GitHub Pages

The site is published from the `main` branch (root folder). Every push to `main` updates the live site within a minute or two. You can find this setting under **Settings → Pages**.

## Modern web techniques used (things to learn)

- **CSS:** custom properties (design tokens), `light-dark()` for dark mode, `color-mix()`, cascade layers (`@layer`), container queries, `clamp()` for fluid type, logical properties, `text-wrap: balance`, scroll snapping
- **HTML:** semantic landmarks, native `<dialog>`, `<details>`, responsive images (`srcset`/`sizes`, WebP, `loading="lazy"`), structured data (JSON-LD `schema.org/Church`)
- **JavaScript:** ES modules, `fetch`, top-level `await`, `Intl.DateTimeFormat` / `Intl.RelativeTimeFormat` (dates in the right language), View Transitions API, the Blob download pattern
- **Accessibility:** skip link, visible focus, `aria-pressed` toggles, alt texts in both languages, `prefers-reduced-motion`
- **Privacy:** self-hosted fonts, no cookies, no trackers

## Sources & credits

- History: [Inventaris Onroerend Erfgoed 39639](https://inventaris.onroerenderfgoed.be/erfgoedobjecten/39639), [Wikipedia – Sint-Niklaaskerk (Herfelingen)](https://nl.wikipedia.org/wiki/Sint-Niklaaskerk_(Herfelingen)), [Wikipedia – Herfelingen](https://nl.wikipedia.org/wiki/Herfelingen)
- Mass times and nearby churches: [Kerknet](https://www.kerknet.be/kerk/sint-niklaas-kerk-herfelingen)
- Photos: Wikimedia Commons, by Hilke Arijs (CC BY-SA 4.0), Funkyxian and David Edgar (CC BY-SA 3.0), and Vlaamse Gemeenschap / Onroerend Erfgoed (CC BY 4.0). Each photo's caption links to its author and licence.
- Fonts: EB Garamond and Source Sans 3 (SIL Open Font License)
