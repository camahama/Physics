# Physics

Landing page for physics web apps at <https://physics.martinmagnusson.net>.

## Structure

```text
apps/
  landing/
  electricity/
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
npm run dev:rainbow
npm run dev:stirling
```

## Build

```sh
npm run build
```

## Deployment shape

The root domain should deploy this landing page:

```text
https://physics.martinmagnusson.net/
```

Individual modules should be published as subdirectories of the same site:

```text
https://physics.martinmagnusson.net/electricity/
https://physics.martinmagnusson.net/rainbow/
https://physics.martinmagnusson.net/stirling/
```

For GitHub Pages, that means the deployed `dist` folder for this repository
needs to contain each module at those paths, for example `dist/electricity`,
`dist/rainbow`, and `dist/stirling`.
