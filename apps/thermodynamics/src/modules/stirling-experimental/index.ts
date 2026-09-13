import type { ModuleRenderContext } from '../../config/modules.js';
import { createPackageCredit } from '../../components/packageCredit.js';
import { messages } from './messages.js';
import { createEngine, step, geometry, temperature, meanPressure, nudge, setBath, balanceError, MATRIX_CAPACITY, MOLES, R, type Engine, type Contact } from './model.js';
import './styles.css';
const NS='http://www.w3.org/2000/svg', TAU=Math.PI*2;
const fmt=(n:number,d=1)=>Number.isFinite(n)?(Math.abs(n)<.00001?0:n).toFixed(d):'—';
const tint=(t:number)=>`rgb(${[56,125,180].map((v,i)=>Math.round(v+([222,87,44][i]-v)*Math.max(0,Math.min(1,(t-280)/400)))).join(' ')})`;
type Cycle={heat:number[];output:number;time:number;temps:number[];matrix:number[]};
export function renderStirlingExperimentalModule({t,language}:ModuleRenderContext):HTMLElement {
  const copy=messages[language==='sv'?'sv':'en'];
  let s=createEngine(), selected='free', paused=false, preview=0, previous=0, accumulator=0, rate=.6;
  let pointer:number|null=null, pointerAngle=0, lastSample=0;
  let trail:{v:number;p:number}[]=[], cycle:Cycle|null=null, previousCycle:Cycle|null=null, stableCycles=0;
  let checkpoint={angle:s.angle,heat:[...s.heat],shaft:s.shaftWork,load:s.loadWork,time:s.time,temps:[...s.baths],matrix:[...s.matrix]};
  let direction=0, fault=false;
  const page=el('main','page-shell sx-shell'), content=el('section','module-page sx-page');
  const header=el('header','sx-header'), title=el('div');
  title.append(el('p','sx-badge',copy.badge),el('h1','module-title',copy.title),el('p','sx-caption',copy.intro));
  const links=el('div','sx-actions');
  for(const [name,href] of [[copy.original,'#/stirling-illustration'],[copy.menu,'#/']]) {const a=el('a','sx-button',name);a.href=href;links.append(a);}
  header.append(title,links);
  const presets=el('div','sx-actions');
  presets.append(button(copy.engine,()=>reset(false)),button(copy.pump,()=>reset(true)),button(copy.swap,()=>{
    const [l,r]=s.baths;setBath(s,0,r);setBath(s,1,l);invalidateCycle();syncContacts();
  }),button(copy.detach,()=>{s.contacts=['insulated','insulated'];invalidateCycle();syncContacts();}));
  const stage=el('div','sx-stage');
  const machinePanel=el('section','sx-panel'), graphPanel=el('section','sx-panel');
  machinePanel.append(el('h2','',copy.machine));graphPanel.append(el('h2','',copy.graph));
  const machine=svg('svg',{viewBox:'0 0 980 470',role:'img','aria-label':copy.machine});
  const graph=svg('svg',{viewBox:'0 0 600 470',role:'img','aria-label':copy.graph});
  machinePanel.append(machine);graphPanel.append(graph,el('p','sx-caption',copy.legend));stage.append(machinePanel,graphPanel);
  const hint=el('p','sx-hint',copy.hint);
  const modes=el('div','sx-actions');
  const modeButtons=['free','motor','hand','inspect'].map(mode=>{
    const b=button(copy[mode as 'free'],()=>setMode(mode));modes.append(b);return b;
  });
  const pause=button(copy.pause,()=>{paused=!paused;pause.textContent=paused?copy.resume:copy.pause;pause.setAttribute('aria-pressed',String(paused));release();});
  pause.setAttribute('aria-pressed','false');
  modes.append(button('↶',()=>{if(selected!=='inspect'){nudge(s,-1);invalidateCycle();}}),button('↷',()=>{if(selected!=='inspect'){nudge(s,1);invalidateCycle();}}),pause,button(copy.reset,()=>reset(false)));
  (modes.children[4] as HTMLElement).title=language==='sv'?'Knuff moturs':'Nudge counterclockwise';
  (modes.children[5] as HTMLElement).title=language==='sv'?'Knuff medurs':'Nudge clockwise';
  const mechanics=el('div','sx-mechanics');
  const speed=slider(copy.speed,-40,40,1,19.1,v=>{s.motorSpeed=v*TAU/60;invalidateCycle();});
  const brake=slider(copy.brake,0,.4,.005,s.load,v=>{s.load=v;invalidateCycle();});
  const scrub=slider(copy.angle,0,360,1,0,v=>{preview=v*Math.PI/180;});
  const playback=slider(language==='sv'?'Simuleringstid / realtid':'Simulation time / real time',.1,2,.1,rate,v=>{rate=v;});
  mechanics.append(speed.row,brake.row,scrub.row,playback.row);
  const contacts=el('div','sx-contacts');
  const contactControls=[0,1].map(side=>{
    const panel=el('section','sx-panel');panel.append(el('h2','',side===0?copy.left:copy.right));
    const selector=el('select');selector.setAttribute('aria-label',side===0?copy.left:copy.right);
    for(const mode of ['fixed','finite','insulated'] as Contact[]) {const option=el('option','',copy[mode]);option.value=mode;selector.append(option);}
    selector.addEventListener('change',()=>{s.contacts[side]=selector.value as Contact;invalidateCycle();});
    const bath=slider(copy.bath,250,800,5,s.baths[side],v=>{setBath(s,side,v);invalidateCycle();});
    panel.append(selector,bath.row);contacts.append(panel);return{selector,bath};
  });
  const stats=el('div','sx-stats');
  const readings=[copy.rpm,copy.work,copy.mode,copy.steady].map(label=>{const box=el('div'),value=el('strong');box.append(el('span','',label),value);stats.append(box);return value;});
  const energy=el('section','sx-panel');energy.append(el('h2','',copy.energy));
  const energies=el('div','sx-energy');
  const energyValues=[copy.heatL,copy.heatR,copy.supplied,copy.load,copy.matrixEnergy,copy.balance].map(label=>{
    const row=el('div'),value=el('strong');row.append(el('span','',label),value);energies.append(row);return value;
  });energy.append(energies,el('p','sx-caption',copy.note));
  const details=el('details','sx-caption');details.append(el('summary','',copy.model),el('p','',copy.details),el('p','',copy.history));
  const source=el('a','','NASA · Stirling engine design manual');source.href='https://ntrs.nasa.gov/citations/19780016056';source.target='_blank';source.rel='noreferrer';details.append(source);
  content.append(header,presets,stage,hint,modes,stats,mechanics,contacts,energy,details,createPackageCredit(t));page.append(content);
  let initialMatrix=s.matrix.reduce((sum,t)=>sum+t*MATRIX_CAPACITY,0);

  function invalidateCycle(){cycle=null;previousCycle=null;stableCycles=0;direction=0;checkpoint={angle:s.angle,heat:[...s.heat],shaft:s.shaftWork,load:s.loadWork,time:s.time,temps:[...s.baths],matrix:[...s.matrix]};}
  function reset(equal:boolean){
    release();s=createEngine(equal?300:650,300);if(equal)s.contacts=['finite','finite'];
    initialMatrix=s.matrix.reduce((sum,t)=>sum+t*MATRIX_CAPACITY,0);
    trail=[];lastSample=0;accumulator=0;fault=false;paused=false;pause.textContent=copy.pause;pause.setAttribute('aria-pressed','false');
    speed.input.value=String(s.motorSpeed*60/TAU);speed.output.textContent=fmt(s.motorSpeed*60/TAU);
    brake.input.value=String(s.load);brake.output.textContent=String(s.load);
    invalidateCycle();setMode(equal?'motor':'free');if(equal){s.motorSpeed=-2;speed.input.value=String(-120/TAU);speed.output.textContent=fmt(-120/TAU);}
    syncContacts();render();
  }
  function syncContacts(){contactControls.forEach((c,i)=>{c.selector.value=s.contacts[i];c.bath.input.value=String(s.baths[i]);c.bath.output.textContent=fmt(s.baths[i]);});}
  function setMode(mode:string){
    release();selected=mode;
    if(mode==='inspect'){preview=((s.angle%TAU)+TAU)%TAU;scrub.input.value=String(preview*180/Math.PI);scrub.output.textContent=fmt(preview*180/Math.PI);}
    else s.drive=mode==='motor'?'motor':'free';
    modeButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(['free','motor','hand','inspect'][i]===mode)));
    speed.row.hidden=mode!=='motor';scrub.row.hidden=mode!=='inspect';
    hint.textContent=mode==='inspect'?copy.inspectHint:copy.hint;
    machine.classList.toggle('sx-hand',mode==='hand');
    mechanics.querySelectorAll('input').forEach(input=>{if(input!==scrub.input&&input!==playback.input)(input as HTMLInputElement).disabled=mode==='inspect';});
    contacts.querySelectorAll('input,select').forEach(input=>(input as HTMLInputElement).disabled=mode==='inspect');
    for (const index of [2,3]) (presets.children[index] as HTMLButtonElement).disabled=mode==='inspect';
    invalidateCycle();
  }
  function release(){const id=pointer;pointer=null;if(id!==null&&machine.hasPointerCapture(id))machine.releasePointerCapture(id);if(s.drive==='hand')s.drive='free';machine.classList.remove('sx-grabbing');}
  const mouseAngle=(e:PointerEvent)=>{const matrix=machine.getScreenCTM();if(!matrix)return null;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());return{angle:Math.atan2(p.y-240,p.x-800),radius:Math.hypot(p.x-800,p.y-240)};};
  machine.addEventListener('pointerdown',e=>{if(selected!=='hand'||paused||pointer!==null||e.button!==0)return;const p=mouseAngle(e);if(!p||p.radius<20||p.radius>130)return;e.preventDefault();pointer=e.pointerId;pointerAngle=p.angle;s.handAngle=s.angle;s.drive='hand';machine.setPointerCapture(e.pointerId);machine.classList.add('sx-grabbing');});
  machine.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;const p=mouseAngle(e);if(!p||p.radius<20)return;const delta=Math.atan2(Math.sin(p.angle-pointerAngle),Math.cos(p.angle-pointerAngle));s.handAngle+=delta;pointerAngle=p.angle;});
  for(const event of ['pointerup','pointercancel','lostpointercapture'] as const)machine.addEventListener(event,e=>{if(e.pointerId===pointer)release();});

  function sample(){
    if(s.time-lastSample<.025)return;lastSample=s.time;
    trail.push({v:geometry(s.angle).volume*1000,p:meanPressure(s)/100000});if(trail.length>800)trail.shift();
    const dir=Math.abs(s.speed)>.1?Math.sign(s.speed):direction;
    if(dir!==direction){invalidateCycle();direction=dir;}
    if(Math.abs(s.angle-checkpoint.angle)>=TAU){
      previousCycle=cycle;
      cycle={heat:s.heat.map((q,i)=>q-checkpoint.heat[i]),output:s.loadWork-checkpoint.load-(s.shaftWork-checkpoint.shaft),time:s.time-checkpoint.time,temps:s.baths.map((v,i)=>v-checkpoint.temps[i]),matrix:s.matrix.map((v,i)=>v-checkpoint.matrix[i])};
      const stable=previousCycle && Math.abs(cycle.output-previousCycle.output)<Math.max(.2,Math.abs(cycle.output)*.05) && Math.max(...cycle.temps.map(Math.abs),...cycle.matrix.map(Math.abs))<.5;
      stableCycles=stable?stableCycles+1:0;
      checkpoint={angle:s.angle,heat:[...s.heat],shaft:s.shaftWork,load:s.loadWork,time:s.time,temps:[...s.baths],matrix:[...s.matrix]};
    }
  }
  function render(){
    const angle=selected==='inspect'?preview:s.angle,g=geometry(angle),temps=s.cells.map(temperature),pressure=meanPressure(s,angle)/100000;
    machine.replaceChildren();
    const defs=svg('defs',{});const gradient=svg('linearGradient',{id:'sx-metal',x1:'0%',y1:'0%',x2:'0%',y2:'100%'});
    for(const [offset,color]of[['0%','#4d6474'],['25%','#d6e4eb'],['45%','#fbfdff'],['70%','#8da3b2'],['100%','#405766']])gradient.append(svg('stop',{offset,'stop-color':color}));defs.append(gradient);machine.append(defs);
    const drawLine=(x1:number,y1:number,x2:number,y2:number,stroke:string,width=4)=>machine.append(svg('line',{x1,y1,x2,y2,stroke,'stroke-width':width,'stroke-linecap':'round'}));
    machine.append(svg('rect',{x:34,y:175,width:412,height:130,rx:10,fill:'url(#sx-metal)',stroke:'#425d70','stroke-width':3}),svg('rect',{x:50,y:191,width:380,height:99,fill:'#f7fafc'}));
    machine.append(svg('rect',{x:50,y:192,width:g.displacer-50,height:96,fill:tint(temps[0]),opacity:.25}),svg('rect',{x:g.displacer+70,y:192,width:g.power-g.displacer-70,height:96,fill:tint(temps[6]),opacity:.25}));
    for(let i=0;i<5;i++)machine.append(svg('rect',{x:g.displacer+i*14,y:194,width:14,height:92,fill:tint(s.matrix[i]),stroke:'#496070','stroke-width':.7}));
    for(let y=198;y<285;y+=8)drawLine(g.displacer,y,g.displacer+70,y,'#ffffff66',1);
    machine.append(svg('rect',{x:g.power,y:190,width:20,height:100,rx:3,fill:'url(#sx-metal)',stroke:'#425d70','stroke-width':2}));
    const powerJoint=g.power+140,displacerJoint=g.displacer+240;
    drawLine(g.power+20,240,powerJoint,240,'#8ca3b3',14);drawLine(g.displacer+70,240,displacerJoint,240,'#bd9459',4);
    const wheel=svg('g',{});wheel.append(svg('circle',{cx:800,cy:240,r:120,fill:'#f1f5f8',stroke:'url(#sx-metal)','stroke-width':15}));
    for(let i=0;i<6;i++){const a=angle+i*TAU/6;wheel.append(svg('line',{x1:800,y1:240,x2:800+112*Math.cos(a),y2:240+112*Math.sin(a),stroke:'#a2b3bf','stroke-width':8}));}
    machine.append(wheel);
    for(const [joint,a,r,c]of[[powerJoint,g.powerCrank,100,'#456e8b'],[displacerJoint,g.displacerCrank,50,'#b98c43']] as [number,number,number,string][]){
      const x=800+r*Math.cos(a),y=240+r*Math.sin(a);drawLine(joint,240,x,y,c,5);machine.append(svg('circle',{cx:x,cy:y,r:6,fill:'#fff',stroke:c,'stroke-width':3}),svg('circle',{cx:joint,cy:240,r:5,fill:c}));
    }
    machine.append(svg('circle',{cx:800,cy:240,r:12,fill:'#496778'}));
    for(let side=0;side<2;side++){
      const x=side===0?35:270, insulated=s.contacts[side]==='insulated';
      machine.append(svg('rect',{x,y:335,width:180,height:60,rx:9,fill:insulated?'#e5dbbd':tint(s.baths[side]),'fill-opacity':.2,stroke:insulated?'#a29167':tint(s.baths[side]),'stroke-width':2}));
      machine.append(label(`${copy.reservoir} ${fmt(s.baths[side])} K`,x+10,358),label(`${copy.gas} ${fmt(temps[side===0?0:6])} K`,x+10,383));
      const q=s.heatRate[side];machine.append(label(insulated?'Q = 0':`${q>=0?'↑':'↓'} Q̇ = ${fmt(Math.abs(q))} W`,x+10,327));
    }
    machine.append(label(`V = ${fmt(g.volume*1000,3)} l     p = ${fmt(pressure,2)} bar`,50,70),label('Vmax / Vmin = 3 : 1',50,105),label(copy.matrix,95,425),label(`${fmt(s.lastTorque)} N·m`,735,400));
    const pmax=Math.max(3,pressure,...trail.map(p=>p.p),MOLES*R*Math.max(...s.baths)/.0005/100000)*1.15;
    const xy=(v:number,p:number)=>[65+(v-.4)/1.2*480,400-p/pmax*335];
    const nodes:SVGElement[]=[];
    for(let i=0;i<=5;i++){const p=pmax*i/5,y=xy(.4,p)[1];nodes.push(svg('path',{d:`M65 ${y}H545`,class:'sx-grid'}),label(fmt(p,1),16,y+5,'sx-tick'));}
    for(const v of [.5,.75,1,1.25,1.5]){const x=xy(v,0)[0];nodes.push(svg('path',{d:`M${x} 65V400`,class:'sx-grid'}),label(fmt(v,2),x-14,424,'sx-tick'));}
    nodes.push(svg('path',{d:'M65 50V400H555',class:'sx-axis'}),label('p / bar',20,30),label('V / l',500,455));
    const curve=(pts:number[][],cls:string)=>svg('path',{d:pts.map((p,i)=>`${i?'L':'M'}${p.join(' ')}`).join(' '),class:cls});
    const lo=Math.min(...s.baths),hi=Math.max(...s.baths),reference:number[][]=[];
    for(let i=0;i<=60;i++){const v=.5+i/60;reference.push(xy(v,MOLES*R*hi/(v*.001)/100000));}
    for(let i=0;i<=60;i++){const v=1.5-i/60;reference.push(xy(v,MOLES*R*lo/(v*.001)/100000));}
    reference.push(reference[0]);nodes.push(curve(reference,'sx-reference'));
    if(trail.length)nodes.push(curve(trail.map(p=>xy(p.v,p.p)),'sx-trace'));
    const pos=xy(g.volume*1000,pressure);nodes.push(svg('circle',{cx:pos[0],cy:pos[1],r:7,fill:selected==='inspect'?'#ab7d35':tint((temps[0]+temps[6])/2),stroke:'#fff','stroke-width':2}));graph.replaceChildren(...nodes);
    readings[0].textContent=fmt(s.speed*60/TAU);readings[1].textContent=cycle?`${fmt(cycle.output)} J`:'—';
    const heatPump=cycle&&cycle.output<0&&cycle.heat.some(q=>q>0)&&cycle.heat.some(q=>q<0);
    readings[2].textContent=!cycle?copy.transient:cycle.output>0?copy.engineMode:heatPump?copy.pumpMode:copy.dissipative;
    readings[3].textContent=copy.unsettled;
    if(cycle&&stableCycles>=3){
      if(cycle.output>0){const q=cycle.heat.reduce((sum,v)=>sum+Math.max(v,0),0);if(q>cycle.output)readings[3].textContent=`${copy.efficiency}: ${fmt(cycle.output/q*100)} %`;}
      else if(heatPump)readings[3].textContent=`${copy.cop}: ${fmt(-Math.min(...cycle.heat)/-cycle.output,2)}`;
    }
    [s.heat[0],s.heat[1],s.shaftWork,s.loadWork,s.matrix.reduce((sum,v)=>sum+v*MATRIX_CAPACITY,0)-initialMatrix,balanceError(s)].forEach((v,i)=>energyValues[i].textContent=`${fmt(v,i===5?3:1)} J`);
    contactControls.forEach((c,i)=>{if(document.activeElement!==c.bath.input){c.bath.input.value=String(s.baths[i]);c.bath.output.textContent=fmt(s.baths[i]);}});
  }
  function frame(now:number){
    if(!page.isConnected){release();return;}
    const dt=Math.min(.04,(now-(previous||now))/1000);previous=now;
    if(!paused&&selected!=='inspect'&&!fault){
      accumulator+=dt*rate;
      while(accumulator>=.0002){step(s,.0002);accumulator-=.0002;
        if(s.cells.some(c=>!Number.isFinite(c.energy)||c.n<=0||temperature(c)<30||temperature(c)>3000)||Math.abs(s.speed)>120){fault=true;paused=true;hint.textContent=copy.fault;break;}
      }
      sample();
    }
    render();requestAnimationFrame(frame);
  }
  syncContacts();setMode('free');render();requestAnimationFrame(frame);return page;
}
function el<K extends keyof HTMLElementTagNameMap>(tag:K,cls='',value=''){const n=document.createElement(tag);n.className=cls;n.textContent=value;return n;}
function svg<K extends keyof SVGElementTagNameMap>(tag:K,attrs:Record<string,string|number>){const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));return n;}
function label(value:string,x:number,y:number,cls='sx-label'){
  const n=svg('text',{x,y,class:cls});
  for(const part of value.split(/(Vmax|Vmin|Q̇|\bp\b|\bV\b|\bQ\b)/g)){
    if(/^(Vmax|Vmin|Q̇|p|V|Q)$/.test(part)){const span=svg('tspan',{'font-style':'italic'});span.textContent=part.startsWith('V')?'V':part;n.append(span);if(part==='Vmax'||part==='Vmin'){const sub=svg('tspan',{'baseline-shift':'sub','font-size':'70%'});sub.textContent=part.slice(1);n.append(sub);}}
    else n.append(document.createTextNode(part));
  }return n;
}
function button(value:string,action:()=>void){const b=el('button','sx-button',value);b.type='button';b.addEventListener('click',action);return b;}
function slider(name:string,min:number,max:number,step:number,value:number,action:(v:number)=>void){const row=el('label','sx-slider'),head=el('span'),output=el('strong','',fmt(value)),input=el('input');head.append(el('span','',name),output);input.type='range';input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(value);input.addEventListener('input',()=>{output.textContent=input.value;action(Number(input.value));});row.append(head,input);return{row,input,output};}
