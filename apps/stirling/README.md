# Stirling

TypeScript web app (React + Vite) for estimating figure area from whiteboard images and running follow-up calculations.

## Current Scope

- Upload image and preview
- Estimate figure area in pixels using threshold-based segmentation
- Optional calibration to convert area to cm2
- Swedish as default UI language
- English UI prepared
- All UI text centralized in one file for easy editing

## Localization

- Default locale: Swedish (`sv`)
- Secondary locale: English (`en`)
- UI text location: `src/i18n/messages.ts`

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## GitHub Pages

Deployment workflow is configured in `.github/workflows/deploy.yml`.

Current Vite base path is set for this repository name in `vite.config.ts`.
