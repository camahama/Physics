import assert from "node:assert/strict";
import test from "node:test";
import { formatQuantity, parseQuantity, refineSteps } from "./quantity.js";

test("parses arbitrary SI quantities in control units", () => {
  assert.ok(Math.abs(parseQuantity("45.2 pF", "µF")! - 0.0000452) < 1e-15);
  assert.equal(parseQuantity("2.5 kΩ", "Ω"), 2500);
  assert.equal(parseQuantity("2M", "Ω"), 2e6);
  assert.equal(parseQuantity("0,25 H", "mH"), 250);
  assert.equal(parseQuantity("3 uH", "mH"), 0.003);
  assert.equal(parseQuantity("1e-3 V", "V"), 0.001);
  assert.equal(parseQuantity("4 GHz", "Hz"), 4e9);
  assert.equal(parseQuantity("45.2", "µF"), 45.2);
  assert.equal(parseQuantity("∞ µF", "µF"), Infinity);
});

test("rejects invalid quantities and nonphysical values", () => {
  for (const text of ["", "hello", "2 V", "-1 F", "1e999 F"]) {
    assert.equal(parseQuantity(text, "µF"), null);
  }
  assert.equal(parseQuantity("0 Hz", "Hz"), null);
  assert.equal(parseQuantity("Infinity V", "V"), null);
  assert.equal(parseQuantity("0 Ω", "Ω"), 0);
});

test("formats small values without rounding them to zero and retains slider endpoints", () => {
  assert.equal(formatQuantity(0.0000452, "µF", "en"), "45.2 pF");
  assert.equal(formatQuantity(2500, "Ω", "en"), "2.5 kΩ");
  assert.deepEqual(refineSteps([0, 1, Infinity]), [0, 0.25, 0.5, 0.75, 1, Infinity]);
});
