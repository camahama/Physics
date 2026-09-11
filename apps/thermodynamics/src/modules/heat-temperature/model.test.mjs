import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const compiled = ts.transpile(readFileSync(new URL('./model.ts', import.meta.url), 'utf8'), { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 });
const { gasState, NR } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
test('all experiments reset to the same state', () => {
  for (const mode of ['locked', 'loaded', 'insulated', 'isothermal']) {
    const s = gasState(mode, (mode === 'insulated' || mode === 'isothermal') ? 1 : 0);
    near(s.temperature, 300); near(s.volume, 1); near(s.heat, 0); near(s.work, 0);
  }
});
test('heat, work and gas law balance throughout every control range', () => {
  for (const mode of ['locked', 'loaded', 'insulated', 'isothermal']) {
    for (let i = 0; i <= 1000; i++) {
      const input = (mode === 'insulated' || mode === 'isothermal') ? .45 + 2.05 * i / 1000 : -75 + 300 * i / 1000;
      const s = gasState(mode, input);
      near(s.pressure * s.volume * 100, NR * s.temperature);
      near(s.energy, s.heat - s.work);
      assert.ok(s.temperature > 0 && s.volume > 0 && s.pressure > 0);
      if (mode === 'isothermal') { near(s.temperature, 300); near(s.energy, 0); near(s.heat, NR * 300 * Math.log(s.volume)); near(s.work, s.heat); }
      if (mode === 'locked') { near(s.volume, 1); near(s.work, 0); }
      if (mode === 'loaded') { near(s.pressure, NR * 3); near(s.work, NR * 300 * (s.volume - 1)); }
      if (mode === 'insulated') { near(s.heat, 0); near(s.temperature * s.volume ** (2/3), 300); }
    }
  }
});
test('same heat warms locked gas more; insulated compression needs work on gas', () => {
  const locked = gasState('locked', 100), loaded = gasState('loaded', 100), compressed = gasState('insulated', .5);
  near((locked.temperature - 300)/(loaded.temperature - 300), 5/3);
  assert.ok(compressed.temperature > 300 && compressed.work < 0 && compressed.energy > 0);
});
