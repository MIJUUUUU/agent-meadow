const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function garden(){
  const nodes={};let receive,frame;
  function element(){return {style:{},children:[],clientWidth:600,scrollLeft:0,append(...xs){this.children.push(...xs);for(const x of xs)x.parent=this;},remove(){this.parent.children=this.parent.children.filter(x=>x!==this);},replaceChildren(...xs){this.children=xs;},addEventListener(){},setAttribute(){},matches(){return false;},getContext(){return new Proxy({},{get:()=>()=>{}});}};}
  const document={getElementById(id){return nodes[id]||(nodes[id]=element());},createElement:element,querySelectorAll:()=>[],addEventListener(){}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../media/garden.js'),'utf8'),{document,window:{addEventListener(_,fn){receive=fn;}},matchMedia:()=>({matches:false}),requestAnimationFrame(fn){frame=fn;}});
  return {nodes,send:pets=>receive({data:{type:'state',pets}}),tick:t=>frame(t)};
}
test('five agents stay inside the viewport, cross paths, and fit after resize',()=>{
  const g=garden();const pets=Array.from({length:5},(_,i)=>({id:String(i),provider:'claude',name:'Claude',state:'done',message:'done'}));
  g.send(pets);g.tick(0);
  const positions=()=>g.nodes.pets.children.map(el=>Number(el.style.transform.match(/translateX\((.*)px\)/)[1]));
  assert.equal(positions().length,5);
  assert.ok(positions().every(x=>x>=0&&x+136<=600));
  for(let t=100;t<=7000;t+=100)g.tick(t);
  assert.ok(positions()[0]>positions()[1],'characters can cross instead of staying in fixed slots');
  const before=positions();g.send(pets);g.tick(7000);
  assert.deepEqual(positions(),before,'repeated status polling does not reset positions');
  g.nodes.pets.clientWidth=360;g.tick(7100);
  assert.ok(positions().every(x=>x>=0&&x+136<=360));
  g.send(pets.slice(0,4));g.tick(7200);assert.equal(positions().length,4);
});
