// Quasistatic, monatomic ideal gas. SI energy; displayed volume in litres, pressure in bar.
export type Experiment = "locked" | "loaded" | "insulated" | "isothermal";
export const NR = 0.04 * 8.314462618;
export const CV = 1.5 * NR;
export type GasState = { temperature: number; volume: number; pressure: number; heat: number; work: number; energy: number };
export function gasState(mode: Experiment, input: number): GasState {
  const volume = (mode === "insulated" || mode === "isothermal") ? input : mode === "loaded" ? 1 + input / (2.5 * NR * 300) : 1;
  const temperature = mode === "isothermal" ? 300 : mode === "insulated" ? 300 * volume ** (-2 / 3) : 300 + input / ((mode === "locked" ? 1.5 : 2.5) * NR);
  const heat = mode === "isothermal" ? NR * 300 * Math.log(volume) : mode === "insulated" ? 0 : input;
  const energy = CV * (temperature - 300);
  return { temperature, volume, pressure: NR * temperature / (100 * volume), heat, energy, work: heat - energy };
}
