/** Finite-volume demonstrator: monatomic gas, common gas pressure,
 * upwind enthalpy transport, five finite-capacity regenerator elements.
 * SI units throughout. Not a calibrated engineering prediction.
 */
export const R = 8.314462618, CV = 1.5 * R, CP = 2.5 * R;
export const MATRIX_CAPACITY = 1.5, BATH_CAPACITY = 80, INERTIA = 2;
export const MOLES = .025, DEAD_VOLUME = .00005;
export type Contact = 'fixed' | 'finite' | 'insulated';
export type Control = 'free' | 'motor' | 'hand';
export type Cell = { n: number; energy: number };
export type Engine = {
  angle: number; speed: number; time: number; cells: Cell[]; matrix: number[];
  baths: [number, number]; contacts: [Contact, Contact]; bufferPressure: number;
  initialVolume: number; initialEnergy: number; externalHeat: number;
  heat: [number, number]; gasWork: number; shaftWork: number; losses: number; loadWork: number;
  drive: Control; motorSpeed: number; handAngle: number; load: number;
  lastTorque: number; heatRate: [number, number]; steps: number;
};
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export function sliderPosition(angle: number, radius: number, rod: number) {
  return radius * Math.cos(angle) - Math.sqrt(rod * rod - (radius * Math.sin(angle)) ** 2);
}
export function geometry(angle: number) {
  // Two rigid slider-cranks. Constant matrix pore volume is included in 3:1 ratio.
  const powerCrank = angle + Math.PI, displacerCrank = angle - Math.PI / 2;
  const powerTravel = sliderPosition(powerCrank, 100, 350) + 450;
  const displacerTravel = sliderPosition(displacerCrank, 50, 450) + 500;
  const freeLength = 90 + powerTravel, hotLength = 10 + displacerTravel;
  const left = hotLength * .000005, right = (freeLength - hotLength) * .000005;
  return {
    volumes: [left, ...Array(5).fill(DEAD_VOLUME / 5), right] as number[],
    volume: left + right + DEAD_VOLUME,
    power: 210 + powerTravel, displacer: 50 + hotLength,
    powerCrank, displacerCrank,
  };
}
export const temperature = (cell: Cell) => cell.energy / (cell.n * CV);
export function pressures(s: Engine) {
  const v = geometry(s.angle).volumes;
  return s.cells.map((c, i) => c.n * R * temperature(c) / v[i]);
}
export function meanPressure(s: Engine, angle = s.angle) {
  const volumes = geometry(angle).volumes;
  return MOLES * R / volumes.reduce((sum, v, i) => sum + v / temperature(s.cells[i]), 0);
}
export function totalEnergy(s: Engine) {
  return s.cells.reduce((sum, c) => sum + c.energy, 0)
    + s.matrix.reduce((sum, t) => sum + MATRIX_CAPACITY * t, 0)
    + BATH_CAPACITY * (s.baths[0] + s.baths[1])
    + .5 * INERTIA * s.speed ** 2
    + s.bufferPressure * (geometry(s.angle).volume - s.initialVolume);
}
export function balanceError(s: Engine) {
  return totalEnergy(s) - s.initialEnergy - s.externalHeat - s.shaftWork + s.losses + s.loadWork;
}
export function createEngine(left = 650, right = 300): Engine {
  const angle = 0, g = geometry(angle);
  const temps = [left, ...Array.from({length:5}, (_,i) => left + (right-left)*(i+.5)/5), right];
  const p = MOLES * R / g.volumes.reduce((sum,v,i) => sum + v/temps[i],0);
  const cells = temps.map((t,i) => { const n = p*g.volumes[i]/(R*t); return {n,energy:n*CV*t}; });
  const s: Engine = {
    angle, speed: 0, time: 0, cells, matrix: temps.slice(1,6), baths:[left,right], contacts:['fixed','fixed'],
    bufferPressure: p * .5, initialVolume:g.volume, initialEnergy:0, externalHeat:0,
    heat:[0,0],gasWork:0,shaftWork:0,losses:0,loadWork:0,drive:'free',motorSpeed:3,handAngle:0,load:.015,
    lastTorque:0,heatRate:[0,0],steps:0,
  };
  s.initialEnergy=totalEnergy(s); return s;
}
export function nudge(s: Engine, direction: number) {
  const before=.5*INERTIA*s.speed**2;
  s.speed += direction*3;
  s.shaftWork += .5*INERTIA*s.speed**2-before;
}
export function setBath(s: Engine, side: number, value: number) {
  s.externalHeat += BATH_CAPACITY * (value-s.baths[side]); s.baths[side]=value;
}
export function step(s: Engine, dt: number) {
  if (!(dt > 0 && dt <= .0005)) throw new Error('Use fixed timesteps no larger than 0.5 ms');
  const old = geometry(s.angle), p = pressures(s), h=.00001;
  const ahead=geometry(s.angle+h), behind=geometry(s.angle-h);
  let torque=0;
  for(let i=0;i<7;i++) torque += (p[i]-s.bufferPressure)*(ahead.volumes[i]-behind.volumes[i])/(2*h);
  const driveTorque = s.drive==='motor' ? clamp((s.motorSpeed-s.speed)*35,-100,100)
    : s.drive==='hand' ? clamp((s.handAngle-s.angle)*35-s.speed*4,-100,100) : 0;
  const resistance = (.025+s.load)*s.speed;
  const oldSpeed=s.speed;
  s.speed += (torque+driveTorque-resistance)/INERTIA*dt;
  const delta=(oldSpeed+s.speed)*.5*dt;
  s.angle+=delta; s.time+=dt; s.steps++; s.lastTorque=driveTorque;
  s.shaftWork+=driveTorque*delta; s.losses+=.025*oldSpeed*delta; s.loadWork+=s.load*oldSpeed*delta;
  const next=geometry(s.angle);
  const heat = Array(7).fill(0);
  for(let side=0;side<2;side++) {
    const index=side===0?0:6, c=s.cells[index];
    const q=s.contacts[side]==='insulated'?0:3*(s.baths[side]-temperature(c))*dt;
    heat[index]+=q;s.heat[side]+=q;s.heatRate[side]=q/dt;
    if(s.contacts[side]==='finite') s.baths[side]-=q/BATH_CAPACITY;
    else if(s.contacts[side]==='fixed') s.externalHeat+=q;
  }
  for(let i=0;i<5;i++) {
    const q=.35*(s.matrix[i]-temperature(s.cells[i+1]))*dt;
    heat[i+1]+=q;s.matrix[i]-=q/MATRIX_CAPACITY;
  }
  const oldEnergy=s.cells.reduce((sum,c)=>sum+c.energy,0);
  const adiabaticEnergy=oldEnergy*(old.volume/next.volume)**(2/3);
  const work=oldEnergy-adiabaticEnergy;
  const effectivePressure=Math.abs(next.volume-old.volume)>1e-14?work/(next.volume-old.volume):p[0];
  const newEnergy=adiabaticEnergy+heat.reduce((sum,q)=>sum+q,0);
  const energies=next.volumes.map(v=>newEnergy*v/next.volume);
  // Common-pressure energy balances determine enthalpy flow across each face.
  // Upwind temperatures turn enthalpy transfer into conserved molar transfer.
  const deltaMoles=Array(7).fill(0);
  let transported=0;
  for(let i=0;i<6;i++) {
    transported+=heat[i]-effectivePressure*(next.volumes[i]-old.volumes[i])-(energies[i]-s.cells[i].energy);
    const from=transported>=0?i:i+1;
    const dn=transported/(CP*temperature(s.cells[from]));
    deltaMoles[i]-=dn;deltaMoles[i+1]+=dn;
  }
  s.cells.forEach((c,i)=>{c.n+=deltaMoles[i];c.energy=energies[i];});
  s.gasWork+=work;
  // Axial heat leak through the matrix, also conservative.
  for(let i=0;i<4;i++) {
    const q=.006*(s.matrix[i]-s.matrix[i+1])*dt;
    s.matrix[i]-=q/MATRIX_CAPACITY;s.matrix[i+1]+=q/MATRIX_CAPACITY;
  }
}
