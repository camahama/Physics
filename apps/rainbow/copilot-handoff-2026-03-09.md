# Copilot Handoff Summary (2026-03-09)

Use this file as context when starting a new chat for this project.

## Scope completed
- Fixed Python venv auto-activation behavior in workspace settings.
- Repaired path/resource issues after folder reorganization.
- Updated Git remote and resolved push transport issues.
- Refactored Python simulator into separated modules (physics/simulation/gui/app launcher).
- Added Python physics tests.
- Built new web app (`Vite + React + TypeScript`) under `src/trefas_web_app`.
- Implemented linked phasor + waveform visualization and interactive load controls.
- Centralized UI texts and added EN/SV language toggle with Swedish decimal comma formatting.
- Added GitHub Pages deployment workflow and base-path handling.
- Fixed image loading on GitHub Pages.

## Key architecture
### Python desktop app
- Legacy file kept: `src/trefas.py` (restored legacy behavior as requested).
- Modular package: `src/trefas_app/`
  - `physics.py`: pure, stateless three-phase calculator with complex impedance support.
  - `simulation.py`: stateful orchestration (loads/settings -> currents).
  - `gui.py`: pygame UI/drawing/input.
  - `app.py`: runtime loop/resource handling.
  - `launcher.py`: packaged entry point.
- PyInstaller entry updated: `TrefasSimulator.spec` points to `src/trefas_app/launcher.py`.

### Web app
- Folder: `src/trefas_web_app`.
- Core math: `src/trefas_web_app/src/core/physics.ts`.
- Main UI: `src/trefas_web_app/src/App.tsx`.
- Styles: `src/trefas_web_app/src/styles.css`.
- Public asset: `src/trefas_web_app/public/3fas.jpg`.

## Localization details
- Text dictionaries are in `src/trefas_web_app/src/App.tsx` via `UI_TEXT` with `en` and `sv`.
- Language toggle button is in hero card (top-right).
- Numeric locale formatting:
  - English: `en-US`
  - Swedish: `sv-SE` (decimal comma)

## GitHub Pages deployment
- Workflow file: `.github/workflows/deploy-pages.yml`.
- Trigger: push to `main` (and manual dispatch).
- Build dir: `src/trefas_web_app/dist`.
- Vite base path configured in `src/trefas_web_app/vite.config.ts`:
  - `base = process.env.VITE_BASE_PATH ?? "/"`
- Workflow sets:
  - `VITE_BASE_PATH: /${{ github.event.repository.name }}/`
- Image path fix in `App.tsx`:
  - `const IMAGE_URL = `${import.meta.env.BASE_URL}3fas.jpg`;`
- Vite env type declaration added:
  - `src/trefas_web_app/src/vite-env.d.ts`

## Validation status
- Latest local web build passed:
  - `cd src/trefas_web_app && npm run build`
- Physics tests were added and iterated in:
  - `tests/test_physics.py`

## Suggested next steps for bigger project reuse
1. Keep physics/domain code pure and stateless in a dedicated module.
2. Put orchestration/state in a separate simulation/service layer.
3. Keep UI and rendering independent from domain math.
4. Add one handoff markdown per major milestone in `docs/`.
5. Centralize all user-facing strings early for localization and non-dev editing.
6. Automate deployment with environment-aware base paths from day one.

## Notes
- User preference from memory: do not touch `tobbetest.py`.
