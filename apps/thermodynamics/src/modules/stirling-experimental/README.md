# Experimental Stirling demonstrator

Temporary, independent alternative at `#/stirling-experimental`. The original
`#/stirling-illustration` implementation is not imported or modified by this module.
The landing-page entry is explicitly labelled experimental.

## Demonstrations

- **Hot left / cool right:** select Free wheel and nudge clockwise. Motor / generator
  regulates speed and can absorb shaft work when the gas drives it.
- **Equal finite baths:** starts a reverse motor drive from 300 K at both ends.
  Over time, the left bath warms and the right bath cools. Reverse the motor target
  to reverse the pumping direction. The thermal gradient is not reset.
- **Swap bath temperatures:** exchanges boundary temperatures with external energy
  accounted for; gas and regenerator temperatures are preserved.
- **Insulate both ends:** removes heat exchange. Stored thermal and kinetic energy
  can still power motion temporarily.
- **Hand drive:** drag around the wheel; pointer motion sets a spring-like motor
  target with bounded torque. Release removes hand torque but retains momentum.
- **Inspect:** preview geometry and an equilibrium pressure estimate at another
  angle without changing the physical simulation. Returning resumes its saved state.

The time-rate slider changes simulated seconds per real second, not physical RPM.
Presets reset the simulation. Ordinary contact, load and drive changes do not.

## Model

`model.ts` is independent of the DOM. The cylinder has seven gas cells: left space,
five matrix pores and right space. Gas has a common pressure and conserves moles.
Each cell retains its own molar inventory and temperature. Finite heat transfer
connects the end cells to fixed or finite thermal baths and the five pore cells to
finite-capacity matrix elements. Adjacent matrix elements also conduct heat.

For a monatomic gas at common pressure, cell energy is `3 p V / 2`. Total gas energy
changes through external/matrix heat and piston work. The adiabatic part of each
volume step is integrated analytically. Local cell energy balances determine
enthalpy transfer between adjacent cells; donor-cell temperatures convert that
transfer to molar flow. Equal and opposite fluxes conserve energy and mass.

Two rigid slider-cranks determine chamber volume. Matrix pore volume is included in
the 0.5–1.5 litre total range. Gas torque, a constant-pressure buffer, shaft torque,
viscous friction and a brake determine flywheel motion. UI integration uses fixed
0.2 ms substeps, with rendering independent of integration. A finite-step energy
residual is shown, not silently discarded.

The energy ledger includes gas, regenerator, baths, flywheel kinetic energy and
buffer work. Thermostat heat and changes to bath settings are external heat;
nudges and motor/hand work are external shaft work. Frictional dissipation and
brake work leave the tracked system.

Cycle shaft output combines brake work and negative motor/hand input. Efficiency
or heating COP is withheld until repeated full-cycle results and thermal changes
settle. These are demonstrator values, not calibrated engineering predictions.

Omitted: pressure-drop losses, seals, radiation, detailed fluid dynamics, and a
mechanically resolved regenerator microstructure. The ideal loop is a comparison,
not a path imposed on the solver. The first-law residual converges with timestep.

## Verification

From repository root:

```sh
node --test apps/thermodynamics/src/modules/stirling-experimental/model.test.mjs
npm run typecheck --workspace=@physics/thermodynamics
npm run build --workspace=@physics/thermodynamics
```

Tests cover clearance and rigid rods, exact compression ratio, common pressure,
mass conservation, heat-engine output, bidirectional heat pumping, swapped baths,
thermal memory, insulated operation, and energy-residual convergence.
