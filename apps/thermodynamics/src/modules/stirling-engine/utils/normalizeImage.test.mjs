import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const compiled = ts.transpile(readFileSync(new URL('./normalizeImage.ts', import.meta.url), 'utf8'), {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022,
});
const { normalizeWhiteboardImage } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

function mockCanvas() {
  const canvases = [];
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      const canvas = {
        width: 0, height: 0,
        toDataURL() { return `data:image/png;${this.width}x${this.height}`; },
        getContext() {
          return {
            fillRect() {},
            drawImage(...args) { canvas.drawArgs = args; },
            getImageData() {
              const data = new Uint8ClampedArray(canvas.width * canvas.height * 4);
              for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                  const i = (y * canvas.width + x) * 4;
                  data[i] = x / 8; data[i + 1] = y / 4; data[i + 3] = 255;
                }
              }
              return { data };
            },
            createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
            putImageData(result) { canvas.pixels = result.data; },
          };
        },
      };
      canvases.push(canvas);
      return canvas;
    },
  };
  return canvases;
}

test('bounds large phone photographs while preserving landscape and portrait proportions', () => {
  for (const [width, height, expected] of [[8192, 4096, [2048, 1024]], [4096, 8192, [1024, 2048]], [800, 600, [800, 600]]]) {
    const canvases = mockCanvas();
    const image = { naturalWidth: width, naturalHeight: height };
    normalizeWhiteboardImage(image);
    assert.deepEqual([canvases[0].width, canvases[0].height], expected);
    assert.deepEqual(canvases[0].drawArgs, [image, 0, 0, ...expected]);
  }
});

test('perspective correction keeps selected photo coordinates after downsampling', () => {
  const canvases = mockCanvas();
  const result = normalizeWhiteboardImage({ naturalWidth: 8192, naturalHeight: 4096 }, [
    { x: 4096, y: 2048 }, { x: 6144, y: 2048 },
    { x: 6144, y: 3072 }, { x: 4096, y: 3072 },
  ]);
  assert.equal(result.normalizedDataUrl, 'data:image/png;600x600');
  const output = canvases[1];
  const center = (300 * 600 + 300) * 4;
  assert.ok(Math.abs(output.pixels[center] - 160) <= 1);
  assert.ok(Math.abs(output.pixels[center + 1] - 160) <= 1);
  assert.equal(output.pixels[center + 3], 255);
});
