import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointerDrag, svgClientPoint, paletteDrag } from './interaction.js';

function event(type: string, properties: Record<string, unknown> = {}) {
  return Object.assign(new Event(type, { cancelable: true }), {
    pointerId: 1, button: 0, buttons: 1, isPrimary: true, pointerType: 'mouse', clientX: 300, clientY: 250, detail: 1,
  }, properties);
}
class MockElement extends EventTarget {
  isConnected = true; textContent = 'Tool'; draggable = false;
  style: Record<string, string> = {}; attrs: Record<string, string> = {};
  captures = new Set<number>(); failCapture = false;
  classList = { toggle() {}, remove() {} };
  constructor(public ownerDocument: MockDocument) { super(); }
  setAttribute(k: string, v: string) { this.attrs[k] = v; }
  removeAttribute(k: string) { delete this.attrs[k]; }
  setPointerCapture(id: number) { if(this.failCapture)throw new Error('Capture unavailable');this.captures.add(id); }
  hasPointerCapture(id: number) { return this.captures.has(id); }
  releasePointerCapture(id: number) { this.captures.delete(id); this.dispatchEvent(event('lostpointercapture', { pointerId: id })); }
  getBoundingClientRect() { return { left: 100, top: 50, width: 400, height: 400 }; }
  getScreenCTM() { return null; }
  viewBox = { baseVal: { x: 0, y: 0, width: 800, height: 400 } };
  cloneNode() { return new MockElement(this.ownerDocument); }
  remove() { this.isConnected = false; }
}
class MockDocument extends EventTarget {
  defaultView = new EventTarget(); hidden = false;
  body = { append() {} };
}
function setup() { const doc=new MockDocument(),owner=new MockElement(doc);return{doc,owner,svg:owner as unknown as SVGSVGElement}; }

test('SVG fallback accounts for letterboxing and client offsets',()=>{
  const {svg}=setup();
  assert.deepEqual(svgClientPoint(svg,{clientX:100,clientY:150}),{x:0,y:0});
  assert.deepEqual(svgClientPoint(svg,{clientX:500,clientY:350}),{x:800,y:400});
  assert.deepEqual(svgClientPoint(svg,{clientX:300,clientY:250}),{x:400,y:200});
});
test('SVG screen transform is preferred and handles zoom/transforms',()=>{
 const {svg}=setup();
 const inverse={a:.25,b:0,c:0,d:.5,e:-10,f:-20};
 svg.getScreenCTM=()=>({inverse:()=>inverse}) as DOMMatrix;
 svg.createSVGPoint=()=>({x:0,y:0,matrixTransform(m:typeof inverse){return{x:this.x*m.a+m.e,y:this.y*m.d+m.f};}}) as DOMPoint;
 assert.deepEqual({...svgClientPoint(svg,{clientX:100,clientY:100})},{x:15,y:30});
});
test('drag survives child redraws, ignores other pointers, and ends exactly once',()=>{
 const{doc,owner}=setup();let moves=0,ends=0;
 const drag=pointerDrag(owner as unknown as Element,()=>moves++,(_e,cancelled)=>{assert.equal(cancelled,false);ends++;});
 assert.ok(drag.start(event('pointerdown') as PointerEvent));
 doc.dispatchEvent(event('pointermove',{pointerId:2}));assert.equal(moves,0);
 doc.dispatchEvent(event('pointermove'));doc.dispatchEvent(event('pointermove'));assert.equal(moves,2);
 doc.dispatchEvent(event('pointerup'));assert.equal(ends,1);assert.equal(drag.active,false);
 doc.dispatchEvent(event('pointermove'));assert.equal(moves,2);
});
test('document fallback completes drag when pointer capture is unavailable',()=>{
 const{doc,owner}=setup();owner.failCapture=true;let ended=false;
 const drag=pointerDrag(owner as unknown as Element,()=>{},()=>{ended=true;});
 assert.ok(drag.start(event('pointerdown') as PointerEvent));doc.dispatchEvent(event('pointerup'));assert.ok(ended);
});
test('cancel, window blur, detachment, and lost capture terminate without a click action',()=>{
 for(const reason of ['cancel','blur','detach','lost']){
  const{doc,owner}=setup();let ends=0;
  const drag=pointerDrag(owner as unknown as Element,()=>{},(_e,cancelled)=>{assert.ok(cancelled);ends++;});
  drag.start(event('pointerdown') as PointerEvent);
  if(reason==='cancel')doc.dispatchEvent(event('pointercancel'));
  if(reason==='blur')doc.defaultView.dispatchEvent(new Event('blur'));
  if(reason==='detach'){owner.isConnected=false;doc.dispatchEvent(event('pointermove'));}
  if(reason==='lost')owner.releasePointerCapture(1);
  assert.equal(ends,1);assert.equal(drag.active,false);
 }
});
test('secondary presses cannot start or replace a drag',()=>{
 const{owner}=setup();const drag=pointerDrag(owner as unknown as Element,()=>{},()=>{});
 assert.equal(drag.start(event('pointerdown',{button:2}) as PointerEvent),false);
 assert.equal(drag.start(event('pointerdown',{isPrimary:false}) as PointerEvent),false);
 assert.equal(drag.start(event('pointerdown') as PointerEvent),true);
 assert.equal(drag.start(event('pointerdown',{pointerId:2}) as PointerEvent),false);drag.cancel();
});
test('process palette uses double-click and native drag without single-click or keyboard insertion',()=>{
 const{doc,svg}=setup(),button=new MockElement(doc);let added=0,dropped=0;
 paletteDrag(button as unknown as HTMLButtonElement,svg,()=>added++,()=>dropped++,'dblclick');
 assert.equal(button.draggable,true);
 button.dispatchEvent(event('pointerdown'));assert.equal(button.captures.size,0);
 button.dispatchEvent(event('click'));assert.equal(added,0);
 button.dispatchEvent(event('dblclick',{detail:2}));assert.equal(added,1);
 button.dispatchEvent(event('click',{detail:0}));assert.equal(added,1);
 const transfer={effectAllowed:'',setData(){}};
 button.dispatchEvent(event('dragstart',{dataTransfer:transfer}));
 svg.dispatchEvent(event('drop',{dataTransfer:transfer}));assert.equal(dropped,1);
 button.dispatchEvent(event('click'));assert.equal(added,1);
});
test('dropping in SVG letterbox space does not place an item',()=>{
 const{doc,svg}=setup(),button=new MockElement(doc);let dropped=0;
 paletteDrag(button as unknown as HTMLButtonElement,svg,()=>{},()=>dropped++);
 button.dispatchEvent(event('dragstart',{dataTransfer:{setData(){}}}));
 svg.dispatchEvent(event('drop',{clientY:75}));assert.equal(dropped,0);
});
test('touch drag drops exactly once and double-tap activates the process palette',()=>{
 const{doc,svg}=setup(),button=new MockElement(doc);let added=0,dropped=0;
 paletteDrag(button as unknown as HTMLButtonElement,svg,()=>added++,()=>dropped++,'dblclick');
 for(let i=0;i<2;i++){button.dispatchEvent(event('pointerdown',{pointerType:'touch'}));doc.dispatchEvent(event('pointerup',{pointerType:'touch'}));}
 assert.equal(added,1);
 button.dispatchEvent(event('pointerdown',{pointerType:'touch',clientX:20}));
 doc.dispatchEvent(event('pointermove',{pointerType:'touch'}));
 doc.dispatchEvent(event('pointerup',{pointerType:'touch'}));assert.equal(dropped,1);
 button.dispatchEvent(event('click'));assert.equal(added,1);
});
