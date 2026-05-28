# Physics

Landing page for physics web apps at <https://physics.martinmagnusson.net>.

## Development

```sh
npm install
npm run dev
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
