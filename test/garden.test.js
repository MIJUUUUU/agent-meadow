const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function garden(){
  let seed=42;const math=Object.create(Math);math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const nodes={},messages=[];let receive,frame;
  function element(){return {classList:{add(){},remove(){}},setPointerCapture(){},hasPointerCapture(){return false;},listeners:{},style:{},children:[],clientWidth:600,scrollLeft:0,append(...xs){this.children.push(...xs);for(const x of xs)x.parent=this;},remove(){this.parent.children=this.parent.children.filter(x=>x!==this);},replaceChildren(...xs){this.children=xs;},addEventListener(type,handler){this.listeners[type]=handler;},setAttribute(){},matches(){return false;},getContext(){return new Proxy({},{get:()=>()=>{}});}};}
  const document={getElementById(id){return nodes[id]||(nodes[id]=element());},createElement:element,querySelectorAll:()=>[],addEventListener(){}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../media/garden.js'),'utf8'),{Math:math,setTimeout,clearTimeout,document,acquireVsCodeApi:()=>({postMessage:m=>messages.push(m)}),window:{addEventListener(_,fn){receive=fn;}},matchMedia:()=>({matches:false}),requestAnimationFrame(fn){frame=fn;}});
  return {nodes,messages,send:pets=>receive({data:{type:'state',pets}}),tick:t=>frame(t)};
}
test('five agents stay inside the viewport, cross paths, and fit after resize',()=>{
  const g=garden();const pets=Array.from({length:5},(_,i)=>({id:String(i),provider:'claude',character:['dog','hamster','penguin','rabbit','cat'][i],name:'Claude',state:'done',message:'done'}));
  g.send(pets);g.tick(0);
  const positions=()=>g.nodes.pets.children.map(el=>Number(el.style.transform.match(/translateX\((.*)px\)/)[1]));
  assert.equal(positions().length,5);
  assert.ok(positions().every(x=>x>=0&&x+136<=600));
  let crossed=false, paused=false, reversed=false, previous=positions(), lastDirection=0;
  for(let t=100;t<=180000;t+=100){
    g.tick(t);const current=positions();
    assert.ok(current.every(x=>x>=0&&x+136<=600));
    if(current[0]>current[1])crossed=true;
    const delta=current[2]-previous[2];
    if(t>5000&&Math.abs(delta)<.0001)paused=true;
    if(Math.abs(delta)>.01){const direction=Math.sign(delta);if(lastDirection&&direction!==lastDirection)reversed=true;lastDirection=direction;}
    previous=current;
  }
  assert.ok(crossed,'agents may cross paths');assert.ok(paused,'agents pause between strolls');assert.ok(reversed,'agents change direction');
  const before=positions();g.send(pets);g.tick(180000);
  assert.deepEqual(positions(),before,'repeated status polling does not reset positions');
  g.nodes.pets.clientWidth=360;g.tick(180100);
  assert.ok(positions().every(x=>x>=0&&x+136<=360));
  g.send(pets.slice(0,4));g.tick(180200);assert.equal(positions().length,4);
});

test('secondary press opens one menu and Control-click also works',()=>{
  const g=garden();g.send([{id:'cat',provider:'claude',state:'idle',name:'Claude',message:'idle'}]);
  const el=g.nodes.pets.children[0];let prevented=0;
  const event={button:2,preventDefault(){prevented++;},stopPropagation(){}};
  el.listeners.pointerdown(event);el.listeners.contextmenu(event);
  assert.equal(g.messages.filter(m=>m.type==='desktopMenu').length,1);
  assert.equal(g.messages.find(m=>m.type==='desktopMenu').id,'cat');assert.equal(prevented,2);
  const other=garden();other.send([{id:'rabbit',provider:'codex',state:'idle',name:'Codex'}]);
  other.nodes.pets.children[0].listeners.pointerdown({...event,button:0,ctrlKey:true});
  assert.equal(other.messages.filter(m=>m.type==='desktopMenu').length,1);
  const plain=garden();plain.send([{id:'rabbit',provider:'codex',state:'idle',name:'Codex'}]);
  plain.nodes.pets.children[0].listeners.pointerdown({...event,button:0,ctrlKey:false});
  assert.equal(plain.messages.filter(m=>m.type==='desktopMenu').length,0);
});

test('dragging moves and clamps pets, suppresses click, and survives state updates',()=>{
  const g=garden();const pets=[{id:'cat',provider:'claude',state:'working',name:'Claude'}];
  g.send(pets);g.tick(0);
  const el=g.nodes.pets.children[0],canvas=el.children[1];
  const e={button:0,ctrlKey:false,pointerId:1,clientX:300,clientY:180,preventDefault(){}};
  canvas.listeners.pointerdown(e);
  canvas.listeners.pointermove({...e,clientX:400,clientY:120});
  assert.equal(el.style.transform,'translateX(332px)');assert.equal(el.style.bottom,'60px');
  assert.equal(g.messages.filter(m=>m.type==='dragging'&&m.active).length,1);
  canvas.listeners.pointerup(e);canvas.listeners.click(e);
  assert.equal(g.messages.filter(m=>m.type==='character').length,0);
  assert.equal(g.messages.filter(m=>m.type==='dragging'&&!m.active).length,1);
  g.send(pets);g.tick(100);assert.equal(el.style.transform,'translateX(332px)');
  g.send([...pets,{id:'dog',provider:'claude',state:'idle',name:'Claude'}]);g.tick(200);
  assert.equal(el.style.transform,'translateX(332px)');
  canvas.listeners.pointerdown(e);canvas.listeners.pointermove({...e,clientX:9999,clientY:-9999});canvas.listeners.pointercancel(e);
  assert.equal(el.style.transform,'translateX(464px)');assert.equal(el.style.bottom,'90px');
});
test('a short click still changes the character without lifting',()=>{
  const g=garden();g.send([{id:'cat',provider:'claude',state:'idle',name:'Claude'}]);
  const canvas=g.nodes.pets.children[0].children[1];
  const e={button:0,pointerId:1,clientX:50,clientY:100,preventDefault(){}};
  canvas.listeners.pointerdown(e);canvas.listeners.pointerup(e);canvas.listeners.click(e);
  assert.equal(g.messages.filter(m=>m.type==='character').length,1);
  assert.equal(g.messages.filter(m=>m.type==='dragging').length,0);
});

test('adding or returning a companion preserves the others position and ongoing movement',()=>{
  const live=garden(),control=garden();
  const pets=[{id:'cat',provider:'claude',state:'done',name:'Claude'},{id:'rabbit',provider:'codex',state:'done',name:'Codex'}];
  for(const g of [live,control]){g.send(pets);g.tick(0);}
  const x=g=>Number(g.nodes.pets.children[0].style.transform.match(/translateX\((.*)px\)/)[1]);
  let time=0,previous=x(live);
  for(time=100;time<10000;time+=100){live.tick(time);control.tick(time);if(Math.abs(x(live)-previous)>.2)break;previous=x(live);}
  assert.ok(time<10000,'existing pet is actively walking');
  const original=live.nodes.pets.children[0],before=x(live),bottom=original.style.bottom;
  const extra={id:'new',provider:'claude',state:'working',name:'New'};
  live.send([...pets,extra]);
  assert.equal(live.nodes.pets.children[0],original);assert.equal(x(live),before);assert.equal(original.style.bottom,bottom);
  live.tick(time+100);control.tick(time+100);assert.equal(x(live),x(control),'same velocity and destination after adding');
  live.send(pets);assert.equal(x(live),x(control));
  live.tick(time+200);control.tick(time+200);assert.equal(x(live),x(control),'same movement after returning another pet');
});
