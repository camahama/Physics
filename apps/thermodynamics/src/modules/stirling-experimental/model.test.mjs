import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const compiled=ts.transpile(readFileSync(new URL('./model.ts',import.meta.url),'utf8'),{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022});
const m=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} differs from ${b}`);
function run(s,seconds,dt=.0002){for(let i=0;i<Math.round(seconds/dt);i++)m.step(s,dt);return s;}
function valid(s){
 near(s.cells.reduce((n,c)=>n+c.n,0),m.MOLES,1e-10);
 assert.ok(s.cells.every(c=>c.n>0&&Number.isFinite(c.energy)&&m.temperature(c)>0));
 assert.ok(s.matrix.every(t=>Number.isFinite(t)&&t>0));
 const p=m.pressures(s);p.forEach(v=>near(v,p[0],1e-7));
}
test('geometry has a 3:1 volume ratio, positive clearances, and rigid rods',()=>{
 let min=Infinity,max=0;
 for(let i=0;i<=2000;i++){
  const g=m.geometry(i*Math.PI/1000);min=Math.min(min,g.volume);max=Math.max(max,g.volume);
  assert.ok(g.volumes.every(v=>v>0));assert.ok(g.displacer>50&&g.displacer+70<g.power);
  const powerPin=[800+100*Math.cos(g.powerCrank),240+100*Math.sin(g.powerCrank)];
  const displacerPin=[800+50*Math.cos(g.displacerCrank),240+50*Math.sin(g.displacerCrank)];
  near(Math.hypot(powerPin[0]-(g.power+140),powerPin[1]-240),350);
  near(Math.hypot(displacerPin[0]-(g.displacer+240),displacerPin[1]-240),450);
 }
 near(max/min,3);near(min,.0005);near(max,.0015);
});
test('hot-left engine returns shaft work through the motor',()=>{
 const s=m.createEngine();s.drive='motor';s.motorSpeed=2;run(s,40);valid(s);
 assert.ok(s.shaftWork<0&&s.heat[0]>0&&s.heat[1]<0);
 assert.ok(Math.abs(m.balanceError(s))<.5);
});
test('driving either way separates equal finite-bath temperatures in opposite directions',()=>{
 for(const direction of [-1,1]){
  const s=m.createEngine(300,300);s.contacts=['finite','finite'];s.drive='motor';s.motorSpeed=direction*2;run(s,40);valid(s);
  assert.ok(s.shaftWork>0);assert.ok(direction*(s.baths[1]-s.baths[0])>4);
  near(80*(s.baths[0]-300),-s.heat[0],1e-7);near(80*(s.baths[1]-300),-s.heat[1],1e-7);
  assert.ok(Math.abs(m.balanceError(s))<.5);
 }
});
test('swapping thermal ends reverses the useful motor direction',()=>{
 const s=m.createEngine(300,650);s.drive='motor';s.motorSpeed=-2;run(s,40);valid(s);
 assert.ok(s.shaftWork<0&&s.heat[1]>0&&s.heat[0]<0);
});
test('reversal and contact changes preserve thermal memory and account for bath setting energy',()=>{
 const s=m.createEngine(300,300);s.drive='motor';s.motorSpeed=-2;run(s,10);
 const matrix=[...s.matrix],energy=m.totalEnergy(s);s.motorSpeed=2;
 assert.deepEqual(s.matrix,matrix);near(m.totalEnergy(s),energy);
 const before=m.balanceError(s);m.setBath(s,0,500);near(m.balanceError(s),before,1e-8);
 s.contacts=['insulated','insulated'];const heat=[...s.heat];run(s,3);valid(s);assert.deepEqual(s.heat,heat);
});
test('closed insulated system conserves energy including friction and brake',()=>{
 const s=m.createEngine(300,300);s.contacts=['insulated','insulated'];m.nudge(s,1);run(s,20);valid(s);
 assert.deepEqual(s.heat,[0,0]);assert.ok(Math.abs(m.balanceError(s))<.2);
});
test('smaller timesteps improve the first-law residual',()=>{
 const errors=[.0004,.0002].map(dt=>{const s=m.createEngine();s.drive='motor';s.motorSpeed=2;run(s,10,dt);return Math.abs(m.balanceError(s));});
 assert.ok(errors[1]<errors[0]*.7);
});
