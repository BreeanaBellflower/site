import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// A deterministic event/animation lifecycle harness, not a browser renderer.
// Geometry is fixed. This checks cancellation and state, not visual layout.
let clock=0,serial=0,simulateCaptionLayout=false;
const animationRecords=[];
const queue=new Map();
const timeout=(fn,ms=0)=>{const id=++serial;queue.set(id,{at:clock+ms,fn});return id;};
const clear=id=>queue.delete(id);
async function microtasks(){for(let i=0;i<8;i++)await Promise.resolve();}
async function advance(ms){const end=clock+ms;await microtasks();for(let guard=0;guard<10000;guard++){const jobs=[...queue].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at);if(!jobs.length)break;const [id,job]=jobs[0];queue.delete(id);clock=job.at;job.fn();await microtasks();}clock=end;await microtasks();}
async function settle(){for(let i=0;i<50;i++){await microtasks();if(!queue.size&&!lab.state().busy)return;await advance(1000);}throw Error('Animation did not settle');}
class Node {
 constructor(tag='',text=''){this.tagName=tag.toUpperCase();this.nodeType=tag?1:3;this._text=text;this.nodes=[];this.parentNode=null;this.attrs={};this.style={};this.dataset={};this.listeners={};this.hidden=false;this.value='';this.inert=false;}
 get children(){return this.nodes.filter(x=>x.nodeType===1);}
 get firstChild(){return this.nodes[0]||null;}
 get lastChild(){return this.nodes.at(-1)||null;}
 get className(){return this.attrs.class||'';}set className(v){this.attrs.class=v;}
 get classList(){const n=this;return {contains:c=>n.className.split(/\s+/).includes(c),add(...cs){n.className=[...new Set([...n.className.split(/\s+/).filter(Boolean),...cs])].join(' ');},remove(...cs){n.className=n.className.split(/\s+/).filter(c=>!cs.includes(c)).join(' ');},toggle(c,on){on=on??!this.contains(c);on?this.add(c):this.remove(c);return on;}};}
 get textContent(){return this.nodeType===3?this._text:this.nodes.map(n=>n.textContent).join('');}
 set textContent(s){this.nodes=[];this.append(new Node('',String(s)));}
 setAttribute(k,v){this.attrs[k]=String(v);if(k==='value')this.value=String(v);if(k==='style')this.style.cssText=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5)]=String(v);}
 getAttribute(k){return this.attrs[k]??null;}
 removeAttribute(k){delete this.attrs[k];}
 append(...items){for(let x of items){if(typeof x==='string')x=new Node('',x);if(x.parentNode)x.remove();x.parentNode=this;this.nodes.push(x);}}
 remove(){if(this.parentNode)this.parentNode.nodes=this.parentNode.nodes.filter(n=>n!==this);this.parentNode=null;}
 cloneNode(deep){const n=new Node(this.tagName,this._text);n.attrs={...this.attrs};n.style={...this.style};if(deep)this.nodes.forEach(c=>n.append(c.cloneNode(true)));return n;}
 matches(selector){if(selector.startsWith('.'))return selector.slice(1).split('.').every(c=>this.classList.contains(c));if(selector.startsWith('[')){const m=selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);return m&&this.attrs[m[1]]!==undefined&&(m[2]===undefined||this.attrs[m[1]]===m[2]);}return this.tagName===selector.toUpperCase();}
 querySelectorAll(selector){const sels=selector.split(',').map(x=>x.trim()),out=[];const visit=n=>{for(const c of n.children){if(sels.some(s=>c.matches(s)))out.push(c);visit(c);}};visit(this);return out;}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 closest(s){for(let n=this;n;n=n.parentNode)if(s.split(',').some(x=>n.matches(x.trim())))return n;return null;}
 addEventListener(t,f){(this.listeners[t]??=[]).push(f);}
 fire(t,e={}){for(const f of this.listeners[t]||[])f({target:this,...e});}
 getBoundingClientRect(){const top=simulateCaptionLayout&&this.attrs['data-c']!==undefined?-nodes.cap.textContent.length/5+Number(this.attrs['data-c'])*26:0;return {left:0,top,width:320,height:320};}
 get clientWidth(){return 320;}get clientHeight(){return 270;}get offsetWidth(){return 320;}
 animate(frames,options){animationRecords.push({el:this,frames,options});const a={onfinish:null,cancel(){clear(id);}};const id=timeout(()=>a.onfinish?.(),options.duration);return a;}
}
const body=new Node('body');
const nodes={};for(const [id,tag] of [['map','nav'],['vp','section'],['cap','p'],['back','button'],['next','button'],['replay','button']]){const n=nodes[id]=new Node(tag);n.setAttribute('id',id);body.append(n);}
nodes.next.append(new Node('span'));const document={documentElement:new Node('html'),createElement:t=>new Node(t),createElementNS:(_,t)=>new Node(t),createTextNode:s=>new Node('',s),getElementById:id=>nodes[id]||body.querySelector(`[id="${id}"]`),listeners:{},addEventListener(t,f){this.listeners[t]=f;},fonts:{status:'loaded'}};
const window={getComputedStyle:n=>({gap:n.classList.contains('trow')?'10px':'9px'}),innerWidth:400,matchMedia:()=>({matches:false}),listeners:{},addEventListener(t,f){this.listeners[t]=f;}};
const html=fs.readFileSync(new URL('../education/transformers.html',import.meta.url),'utf8');
let script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
script=script.replace("go(0,'fresh');\nif(document.fonts",`globalThis.lab={go:go,next:next,back:back,steps:STEPS,softmax:softmax,pct:pct,log:LOG,blend:BLEND,values:V,weights:WIT,queries:Q,keys:K,inputs:INPUT,rawQueries:RAWQ,rawKeys:RAWK,matrices:[WQ,WK,WV],scores:S1,allWeights:WEIGHTS,mixes:MIXES,rope:rope,afterAttention:AFTERATTN,newRow:NEWROW,ffUpdates:FFUPDATES,layer1Rows:L1OUT,layer1:LAYER1,gate:GATE,up:UP,product:PROD,singleRows:SINGLEROWS,singleUpdates:SINGLEUPDATES,oneOutput:WO1,embeddings:IDS.map(i=>E[i]),second:{matrices:[WQ2,WK2,WV2],queries:Q2,keys:K2,values:V2,scores:S2,weights:W2it,blend:HEAD2},
camera:{cover:coverBlock,fit:fitWorld,pose:worldPose,route:cameraRoute},
state:function(){return {idx:idx,busy:busy,cur:cur,run:run,gen:gen};},choose:function(k){CHOSEN=k;},reduce:function(on){RM=on;}};
go(0,'fresh');\nif(document.fonts`);
const context=vm.createContext({document,window,console,setTimeout:timeout,clearTimeout:clear,requestAnimationFrame:fn=>timeout(fn,16),cancelAnimationFrame:clear,Math,Set});
vm.runInContext(script,context);const lab=context.lab;let checks=0;
const COUNT=30,OUTPUT=24,CACHE=28,SCORE=15,BLENDING=16,CAUSAL=17,HEADS=18;
function finished(index){assert.equal(lab.state().idx,index);assert.equal(nodes.vp.children.length,1);assert.equal(nodes.vp.querySelectorAll('.ghost').length,0);assert.equal(lab.state().busy,false);assert.equal(lab.state().run.stops.size,0);assert.equal(lab.state().cur.inert,false);checks+=6;}
await settle();finished(0);
assert.ok(nodes.vp.querySelector('h1'));assert.equal(nodes.next.firstChild.textContent,'Begin');assert.ok(document.documentElement.classList.contains('intro-dark'));checks+=3;
for(let i=1;i<COUNT;i++){lab.next();await settle();finished(i);}
assert.ok(nodes.vp.querySelector('.cache-cell'));checks++;
lab.next();await settle();finished(0);
// Leave during typing, carries, and value blending; settle the last operation.
for(let i=0;i<COUNT*5;i++){const step=i%COUNT;lab.go(step,i%3===0?'fresh':'next');await advance(i%2?37:190);}
await settle();finished(COUNT-1);
assert.equal(queue.size,0);checks++;
// Replay, back, and next must clean up any still-moving previous station.
for(let i=0;i<COUNT;i++){lab.go(i,'fresh');await advance(60);lab.go(i,'fresh');await advance(25);lab.back();lab.next();await settle();finished(i===0?1:i);}
// Next advances even while an animation is running.
lab.go(1,'fresh');lab.next();assert.equal(lab.state().idx,2);checks++;await settle();finished(2);
// End is a terminal state, not a new cache row. A normal token keeps the cursor.
lab.choose(1);lab.go(CACHE,'fresh');await settle();finished(CACHE);assert.ok(nodes.vp.querySelector('.t9w').classList.contains('e'));assert.equal(nodes.vp.querySelectorAll('.nr').length,0);checks+=2;
lab.choose(14);lab.go(CACHE,'fresh');await settle();assert.ok(!nodes.vp.querySelector('.t9w').classList.contains('e'));assert.equal(nodes.vp.querySelector('.pline').textContent.includes('full.'),false);checks+=2;
// Every draw animates before selection, including a click during initial entry.
lab.go(OUTPUT,'fresh');await advance(40);let spinStart=animationRecords.length;
document.getElementById('draw').fire('click');await advance(100);
assert.equal(nodes.vp.querySelector('.out').textContent,'');assert.equal(document.getElementById('draw').disabled,true);checks+=2;
await settle();assert.ok(nodes.vp.querySelector('.out').textContent.includes('lands on'));assert.equal(document.getElementById('draw').disabled,false);
assert.equal(animationRecords.slice(spinStart).filter(a=>a.options.id==='token-draw-spin').length,1);checks+=3;
// Removing the spin must retain its final position without a second CSS tween.
const landingSpin=animationRecords.slice(spinStart).find(a=>a.options.id==='token-draw-spin');
assert.equal(nodes.vp.querySelector('.mk').style.left,landingSpin.frames.at(-1).left);
assert.ok(/\.mk\{[^}]*transition:none/.test(html));checks+=2;
spinStart=animationRecords.length;document.getElementById('draw').fire('click');document.getElementById('draw').fire('click');await advance(300);
assert.equal(nodes.vp.querySelector('.out').textContent,'');await settle();assert.equal(animationRecords.slice(spinStart).filter(a=>a.options.id==='token-draw-spin').length,1);checks+=2;
// Changing temperature or leaving the slide cancels any uncommitted selection.
lab.choose(1);document.getElementById('draw').fire('click');await advance(250);lab.go(25,'next');await settle();
assert.equal(nodes.vp.querySelector('.one-stick.selected').getAttribute('data-token'),'1');checks++;
lab.go(OUTPUT,'snap');await settle();document.getElementById('draw').fire('click');await advance(250);document.getElementById('temp').value='0';document.getElementById('temp').fire('input');await settle();
assert.equal(document.getElementById('draw').disabled,false);assert.equal(nodes.vp.querySelector('.out').textContent,'');assert.equal(nodes.vp.querySelector('.mk').hidden,true);checks+=3;
lab.reduce(true);spinStart=animationRecords.length;document.getElementById('draw').fire('click');await settle();lab.reduce(false);
assert.ok(nodes.vp.querySelector('.out').textContent.includes('temperature 0'));assert.equal(animationRecords.slice(spinStart).filter(a=>a.options.id==='token-draw-spin').length,0);checks+=2;
// Full reduced-motion path and resize during a live transition.
lab.reduce(true);for(let i=0;i<COUNT;i++){lab.go(i,'fresh');await settle();finished(i);}lab.reduce(false);
lab.go(4,'next');await advance(100);window.innerWidth=320;window.listeners.resize();await settle();finished(4);
const before=lab.state().idx;document.listeners.keydown({key:'ArrowRight',target:new Node('input'),preventDefault(){throw Error('Range key intercepted');}});assert.equal(lab.state().idx,before);checks++;
const probs=lab.softmax(lab.log,0);assert.equal(probs.filter(x=>x===1).length,1);assert.equal(lab.pct(0),'0%');checks+=2;
assert.ok(Math.abs(lab.weights.reduce((a,b)=>a+b,0)-1)<1e-12);checks++;
for(let d=0;d<4;d++)assert.ok(Math.abs(lab.blend[d]-lab.weights.reduce((s,w,j)=>s+w*lab.values[j][d],0))<=.00501);checks+=4;
assert.equal(lab.steps.length,COUNT);assert.ok(!html.includes('.cur{display:inline-block'));assert.ok(html.includes('.map .d{'));checks+=3;
// The caption must have its final height when moving-token endpoints are measured.
lab.go(1,'snap');await settle();simulateCaptionLayout=true;
lab.go(2,'next');await microtasks();
const carry=animationRecords.filter(a=>a.el.classList.contains('ghost')&&a.el.parentNode===nodes.vp).at(-1);
assert.ok(carry);assert.equal(carry.frames.at(-1).gap,'9px');assert.equal(carry.frames.at(-1).height,'320.0px');checks+=3;
const match=carry.frames.at(-1).transform.match(/translate\([^,]+,([^p]+)px\)/);
const landing=Number.parseFloat(carry.el.style.top)+Number(match[1]);
await advance(200);
const target=lab.state().cur.querySelector('[data-c="'+carry.el.getAttribute('data-c')+'"]');
assert.ok(Math.abs(landing-target.getBoundingClientRect().top)<.11,'Caption reflow moved a token after its endpoint was measured');checks++;
await settle();finished(2);simulateCaptionLayout=false;
// All rows use the displayed learned projections, positional rotations, causal
// scores, normalized weights and weighted values (including the current token).
for(let k=0;k<10;k++){
 const raw=lab.matrices.map(m=>m.map(row=>row.reduce((sum,w,d)=>sum+w*lab.inputs[k][d],0)));
 for(let d=0;d<4;d++){
  assert.ok(Math.abs(lab.queries[k][d]-lab.rope(raw[0],k)[d])<1e-10);
  assert.ok(Math.abs(lab.keys[k][d]-lab.rope(raw[1],k)[d])<1e-10);
  assert.ok(Math.abs(lab.values[k][d]-raw[2][d])<1e-10);checks+=3;
 }
 assert.equal(lab.scores[k].length,k+1);
 assert.ok(Math.abs(lab.allWeights[k].reduce((a,b)=>a+b,0)-1)<1e-12);checks+=2;
 for(let j=0;j<=k;j++){
  assert.ok(Math.abs(lab.scores[k][j]-lab.queries[k].reduce((sum,q,d)=>sum+q*lab.keys[j][d],0)/2)<1e-10);checks++;
 }
 for(let d=0;d<4;d++){
  assert.ok(Math.abs(lab.mixes[k][d]-lab.allWeights[k].reduce((sum,w,j)=>sum+w*lab.values[j][d],0))<1e-10);checks++;
 }
}
// Preserve the focal match in the illustrative example.
assert.equal(lab.weights.indexOf(Math.max(...lab.weights)),6);checks++;
// The single-token score and value contribution precede the all-row overview.
lab.go(SCORE,'fresh');await advance(5400);
assert.ok(nodes.vp.querySelector('.t4').classList.contains('scores'));
assert.equal(nodes.vp.querySelectorAll('.pc')[6].textContent,'2.30');checks+=2;
await settle();assert.equal(nodes.vp.querySelectorAll('.pc')[6].textContent,'43%');checks++;
lab.go(BLENDING,'fresh');await advance(500);
const weighted=nodes.vp.querySelectorAll('.mrow')[6].querySelector('.vg').dataset.values.split(',').map(Number);
for(let d=0;d<4;d++){assert.ok(Math.abs(weighted[d]-lab.values[6][d]*lab.weights[6])<1e-6);checks++;}
// Replay while weighted contributions are arriving: no stale sums or double weighting.
await advance(2200);lab.go(BLENDING,'fresh');await settle();finished(BLENDING);
const result=nodes.vp.querySelector('.eqcol').querySelector('.vg').dataset.values.split(',').map(Number);
assert.deepEqual(result,Array.from(lab.blend));checks++;
lab.go(CAUSAL,'snap');await settle();assert.ok(nodes.vp.querySelector('.attn-grid'));checks++;
// The row produced by one operation is the row consumed by the next.
assert.deepEqual(Array.from(lab.afterAttention[8]),Array.from(lab.newRow));
assert.deepEqual(Array.from(lab.layer1Rows[8]),Array.from(lab.layer1));checks+=2;
for(let d=0;d<16;d++){
 assert.ok(Math.abs(lab.product[d]-(lab.gate[d]/(1+Math.exp(-lab.gate[d])))*lab.up[d])<1e-12);checks++;
}
// The individual lessons output their learned projections, without simulating training.
for(const [step,expected] of [[9,lab.rawKeys[6]],[7,lab.rawQueries[8]],[11,lab.values[6]]]){
 lab.go(step,'fresh');await settle();finished(step);
 const out=nodes.vp.querySelectorAll('.matrix-end')[1].querySelector('.vg');
 const shown=out.dataset.values.split(',').map(Number);
 for(let d=0;d<4;d++){assert.ok(Math.abs(shown[d]-expected[d])<1e-6);checks++;}
 assert.equal(nodes.vp.querySelector('.wm').children.length,32);
 assert.ok(nodes.vp.querySelector('.matrix-samples').classList.contains('on'));checks+=2;
}
// The introductory block and the first worked update use only one head.
for(let k=0;k<10;k++)for(let d=0;d<8;d++){
 const update=lab.oneOutput[d].reduce((sum,w,j)=>sum+w*Math.round(lab.mixes[k][j]*100)/100,0);
 assert.ok(Math.abs(lab.singleUpdates[k][d]-update)<=.00501);
 assert.ok(Math.abs(lab.singleRows[k][d]-lab.embeddings[k][d]-lab.singleUpdates[k][d])<=.00501);checks+=2;
}
lab.go(6,'snap');await settle();assert.equal(nodes.vp.querySelectorAll('.overview-out').length,10);checks++;
lab.go(BLENDING,'snap');await settle();assert.ok(!nodes.vp.textContent.includes('head 2'));checks++;
lab.go(HEADS,'fresh');await settle();finished(HEADS);assert.equal(nodes.vp.querySelectorAll('.mini-matrix').length,6);checks++;
// Both heads' distinct matrices produce the keys, queries, scores and values shown.
for(let k=0;k<10;k++){
 const head=lab.second,raw=head.matrices.map(m=>m.map(row=>row.reduce((sum,w,d)=>sum+w*lab.inputs[k][d],0)));
 for(let d=0;d<4;d++){
  assert.ok(Math.abs(head.queries[k][d]-lab.rope(raw[0],k)[d])<1e-10);
  assert.ok(Math.abs(head.keys[k][d]-lab.rope(raw[1],k)[d])<1e-10);
  assert.ok(Math.abs(head.values[k][d]-raw[2][d])<1e-10);checks+=3;
 }
 for(let j=0;j<=k;j++){
  assert.ok(Math.abs(head.scores[k][j]-head.queries[k].reduce((sum,q,d)=>sum+q*head.keys[j][d],0)/2)<1e-10);checks++;
 }
}
assert.equal(lab.second.weights.indexOf(Math.max(...lab.second.weights)),7);checks++;
for(let d=0;d<4;d++){
 assert.ok(Math.abs(lab.second.blend[d]-lab.second.weights.reduce((sum,w,j)=>sum+w*lab.second.values[j][d],0))<=.00501);checks++;
}
// The outer block must cover every viewport edge before revealing its interior.
for(const view of [{w:288,h:430},{w:560,h:650},{w:848,h:430}]){
 const block={x:view.w*.4,y:70,w:view.w*.2,h:250},p=lab.camera.cover(block,view);
 assert.ok(p.x+block.x*p.s<0);assert.ok(p.x+(block.x+block.w)*p.s>view.w);
 assert.ok(p.y+block.y*p.s<0);assert.ok(p.y+(block.y+block.h)*p.s>view.h);checks+=4;
}
lab.go(6,'snap');await settle();lab.go(7,'next');await advance(800);
assert.equal(lab.state().cur.style.visibility,'hidden');checks++;
await advance(100);assert.equal(lab.state().cur.style.visibility,'');checks++;await settle();finished(7);
// A detail view is a deeper scale of its vector, not another horizontal station.
let recordStart=animationRecords.length;lab.go(8,'next');await advance(100);
assert.ok(nodes.vp.querySelector('.camera-stage'));assert.ok(!lab.state().cur.classList.contains('slide'));checks+=2;
let travel=animationRecords.slice(recordStart).find(a=>a.options.id==='camera-travel');
const scale=frame=>Number(frame.transform.match(/scale\(([^)]+)\)/)[1]);
assert.ok(Math.abs(scale(travel.frames.at(-1))/scale(travel.frames[0])-8)<1e-5);checks++;
await settle();finished(8);
// Moving to the next aligned sibling zooms out, pans down, then returns to its scale.
recordStart=animationRecords.length;lab.go(9,'next');await advance(100);
travel=animationRecords.slice(recordStart).find(a=>a.options.id==='camera-travel');
assert.deepEqual(Array.from(travel.frames,scale),[8,1,.56,.56,1]);checks++;
const position=frame=>frame.transform.match(/translate\(([^p]+)px,([^p]+)px\)/).slice(1).map(Number);
const panStart=position(travel.frames[2]),panEnd=position(travel.frames[3]);
assert.equal(panEnd[0],panStart[0]);assert.ok(panEnd[1]<panStart[1]);checks+=2;
// Interrupt at multiple phases of this longer camera trip; no stale layers survive.
for(const ms of [200,700,1200]){lab.go(8,'snap');await settle();lab.go(9,'next');await advance(ms);lab.back();await settle();finished(8);assert.equal(nodes.vp.querySelectorAll('.camera-stage').length,0);checks++;}
lab.go(12,'snap');await settle();lab.go(13,'next');await advance(400);window.innerWidth=360;window.listeners.resize();await settle();finished(13);
assert.equal(nodes.vp.querySelectorAll('.attention-location').length,3);assert.equal(nodes.vp.querySelectorAll('[data-c]').length,0);checks+=2;
recordStart=animationRecords.length;lab.reduce(true);lab.go(12,'back');await settle();finished(12);lab.reduce(false);
assert.equal(animationRecords.slice(recordStart).filter(a=>a.options.id?.startsWith('camera-')).length,0);checks++;
// FFN updates retain the exact row count and add coordinate by coordinate.
assert.equal(lab.ffUpdates.length,10);checks++;
for(let k=0;k<10;k++)for(let d=0;d<8;d++){
 assert.equal(lab.ffUpdates[k].length,8);
 assert.ok(Math.abs(lab.layer1Rows[k][d]-lab.afterAttention[k][d]-lab.ffUpdates[k][d])<=.00501);checks+=2;
}
lab.go(19,'snap');await settle();recordStart=animationRecords.length;lab.go(20,'next');await advance(400);
assert.ok(animationRecords.slice(recordStart).some(a=>a.options.id==='ff-pullback'));checks++;
await settle();finished(20);
assert.equal(nodes.vp.querySelectorAll('.ff-attention').length,1);
assert.ok(nodes.vp.querySelector('.ff-attention').textContent.includes('attention'));
assert.equal(nodes.vp.querySelectorAll('.ff-input').length,0);checks+=3;
for(const name of ['ff-preserved','ff-updates','ff-result']){
 const matrix=nodes.vp.querySelector('.'+name);assert.equal(matrix.children.length,80);assert.ok(matrix.classList.contains('on'));checks+=2;
}
for(const ms of [200,900,1600]){lab.go(19,'snap');await settle();lab.go(20,'next');await advance(ms);lab.next();await settle();finished(21);}
lab.go(19,'snap');await settle();lab.go(20,'next');await advance(350);window.innerWidth=390;window.listeners.resize();await settle();finished(20);
recordStart=animationRecords.length;lab.reduce(true);lab.go(19,'snap');await settle();lab.go(20,'next');await settle();finished(20);lab.reduce(false);
assert.ok(!animationRecords.slice(recordStart).some(a=>a.options.id==='ff-pullback'));checks++;
// Whole-prompt and wider-network views preserve shapes and the selected token.
lab.go(5,'snap');await settle();assert.equal(nodes.vp.querySelectorAll('.matrix-input-row').length,10);checks++;
lab.go(14,'snap');await settle();assert.equal(nodes.vp.querySelectorAll('.vg').length,30);checks++;
for(const step of [22,26]){lab.go(step,'snap');await settle();assert.equal(nodes.vp.querySelectorAll('.pipeline-block').length,32);checks++;}
lab.go(OUTPUT,'snap');await settle();assert.ok(document.getElementById('draw'));assert.equal(nodes.vp.querySelectorAll('.prow').length,7);assert.equal(lab.steps.filter(step=>typeof step.cap==='string'&&step.cap.startsWith('After the last block,')).length,1);checks+=3;
for(const token of [14,1,26]){
 lab.choose(token);lab.go(25,'snap');await settle();assert.equal(nodes.vp.querySelectorAll('.prob-stick').length,27);assert.equal(nodes.vp.querySelectorAll('.one-stick').length,27);
 const selected=nodes.vp.querySelectorAll('.one-stick.selected');assert.equal(selected.length,1);assert.equal(selected[0].getAttribute('data-token'),String(token));checks+=4;
}
lab.choose(1);lab.go(26,'snap');await settle();assert.equal(nodes.vp.querySelectorAll('.pipeline-block.lit').length,0);checks++;
lab.choose(14);lab.go(27,'snap');await settle();const strips=nodes.vp.querySelectorAll('.work-strip');assert.equal(strips.length,8);
for(let i=0;i<4;i++){assert.equal(strips[2*i].querySelectorAll('.compute').length,10+i);assert.equal(strips[2*i+1].querySelectorAll('.compute').length,i===0?10:1);checks+=2;}
lab.go(29,'snap');await settle();assert.equal(nodes.vp.querySelectorAll('.cache-cell').length,4*2*13);checks+=2;
console.log(`PASS: ${checks} animation lifecycle and arithmetic assertions across ${COUNT} scenes. No browser/layout rendering performed.`);
