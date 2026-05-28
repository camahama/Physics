# Handoff Summary for Next AI Agent

## Project: Stirling Web App (Image Rectification)

### Current Status
- The app is a React + Vite + TypeScript web app for measuring areas on a whiteboard/grid image.
- The workflow is: Upload image → Select four corners → Rectify image (perspective transform) → Calibrate/measure.
- The user selects four corners on the image; the app computes a homography to rectify the selected region.
- The UI overlays the selected quadrilateral for visual feedback.
- Debug logging is enabled for user corners, homography matrix, and mapped points.

### Outstanding Issues
- The rectified output image is still only a small fragment of the intended region, despite correct overlay and logging.
- The homography computation and mapping are being debugged; see recent console logs for details.
- The overlay polygon matches the user's selection, but the output is not as expected.

### Key Files
- `src/App.tsx`: Main workflow, UI, and overlay logic.
- `src/utils/normalizeImage.ts`: Image normalization, homography, and perspective transform logic.
- `src/styles.css`: App and preview image styling.

### Debugging Context
- The app logs user corners, the computed homography matrix, and the mapped output points to the browser console.
- The overlay polygon on the preview image matches the selected region.
- The output image is always a small fragment in the top-left, regardless of the selected region.

### Next Steps for the Next Agent
1. **Review the homography computation and application in `normalizeImage.ts`.**
   - Double-check the DLT implementation and the mapping of source to destination points.
   - Verify the pixel mapping in `warpPerspectiveFull`.
2. **Use the overlay and console logs to compare the selected region and the output mapping.**
3. **Consider using a well-tested library or reference implementation for homography if the bug persists.**
4. **Continue to provide visual and console feedback for debugging.**

### User Notes
- The user expects the rectified image to cover the full selected region, not just a small corner.
- The overlay and logging are in place to assist with debugging.

---
This file is intended as a handoff summary for the next AI agent or developer to continue debugging and improving the image rectification workflow.
