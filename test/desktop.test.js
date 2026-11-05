'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {EventEmitter}=require('node:events');
const {PassThrough}=require('node:stream');
function harness() {
  let child, launches=0, messages=[], closed=0;
  const sandbox={module:{exports:{}},process:{platform:'darwin',execPath:'/Applications/Visual Studio Code.app/Contents/MacOS/Code',env:{}},setTimeout,clearTimeout,
    require(name){if(name==='node:child_process')return {spawn(binary,args,options){
      launches++;assert.ok(binary.endsWith('/desktop/AgentMeadow'));assert.ok(args[0].endsWith('/media'));
      assert.equal(options.env.MEADOW_EDITOR_APP,'/Applications/Visual Studio Code.app');
      child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>child.emit('close',0);return child;
    }};return require(name);}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/desktop.js'),'utf8'),sandbox);
  const desktop=new sandbox.module.exports.Desktop('/extension',m=>messages.push(m),()=>closed++,()=>{});
  return {desktop,get child(){return child;},get launches(){return launches;},messages,get closed(){return closed;}};
}
test('desktop shares a process, waits for readiness, forwards state/actions and closes cleanly',async()=>{
  const h=harness(), first=h.desktop.start(), second=h.desktop.start();
  assert.equal(h.launches,1);assert.equal(first,second);
  h.child.stdout.write('{"type":"ready"}\n');await first;
  let sent='';h.child.stdin.on('data',chunk=>sent+=chunk);
  h.desktop.publish([{id:'pet-1',state:'waiting',message:'확인해 주세요'}]);
  assert.equal(JSON.parse(sent).pets[0].state,'waiting');
  h.child.stdout.write('{"type":"return","id":"pet-1"}\n');
  assert.equal(h.messages[0].id,'pet-1');
  h.desktop.dispose();assert.equal(h.closed,1);assert.equal(h.desktop.child,undefined);
});
test('failed native launch rejects instead of losing the pet',async()=>{
  const h=harness(), started=h.desktop.start();
  h.child.emit('error',new Error('ENOENT'));h.child.emit('close',1);
  await assert.rejects(started,/ENOENT/);assert.equal(h.closed,1);
});
