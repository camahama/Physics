# Physics

Landing page for physics web apps at <https://physics.martinmagnusson.net>.

## Structure

```text
apps/
  landing/
  electricity/
  mechanics/
  rainbow/
  stirling/
```

The root build assembles all app builds into one GitHub Pages artifact.

## Development

```sh
npm install
npm run dev
```

Run individual apps from the repo root:

```sh
npm run dev:landing
npm run dev:electricity
npm run dev:mechanics
npm run dev:rainbow
npm run dev:stirling
```

## Build

```sh
npm run build
```

Preview the complete site, including working module links:

```sh
npm run build
npm run preview
```

Open <http://127.0.0.1:5173/>. The landing-only development server does not
serve the other apps. Rebuild after changes to update the complete-site preview.

## Deployment shape

The root domain should deploy this landing page:

```text
https://physics.martinmagnusson.net/
```

Individual modules should be published as subdirectories of the same site:

```text
https://physics.martinmagnusson.net/electricity/
https://physics.martinmagnusson.net/mechanics/
https://physics.martinmagnusson.net/rainbow/
https://physics.martinmagnusson.net/stirling/
```

For GitHub Pages, that means the deployed `dist` folder for this repository
needs to contain each module at those paths, for example `dist/electricity`,
`dist/mechanics`, `dist/rainbow`, and `dist/stirling`.

## Language selection

Swedish is the default. The landing page, Electricity, Thermodynamics (including
Stirling), and Rainbow share the `physics-language` browser preference. Selecting
English in any of these apps keeps English on reload and when opening another
bilingual app on the same origin. Existing Electricity and Thermodynamics
preferences are used when no shared preference has been saved.

Add `?lang=en` or `?lang=sv` to explicitly select a language. The URL takes
precedence over the saved preference and becomes the new preference. Language
buttons update the URL, so copying the address includes the selected language.
Put the query **before** a module's hash route, for example:

- English phasor: <https://physics.martinmagnusson.net/electricity/?lang=en#/phasor-diagram>
- English Thermodynamics: <https://physics.martinmagnusson.net/thermodynamics/?lang=en>
- English Rainbow: <https://physics.martinmagnusson.net/rainbow/?lang=en>

Mechanics and Sundial currently contain Swedish-only text and do not yet have
English translations.
