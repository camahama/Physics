# Sundial web module

This is a static web version of the macOS sundial app. It is designed to be copied or deployed as a module under the Physics site without a build step.

## Run locally

From the repository root:

```sh
python3 -m http.server 8000 --directory web
```

Then open <http://localhost:8000>.

## Included

- Horizontal and vertical sundials
- Analemma hour curves with equation-of-time and longitude correction
- Half-hour curves
- Custom plate size, location, UTC standard-time offset, wall/layout angle, gnomon settings, labels, monochrome mode, title text
- Browser geolocation
- Angle helper
- SVG download
- Browser print/PDF output
- Settings saved in browser local storage

## Skipped from the native app

- Native Apple MapKit location picker
- Native SceneKit 3D preview
- Native macOS file save panels

Those can be added later, but the important calculation and artwork pipeline is present.
