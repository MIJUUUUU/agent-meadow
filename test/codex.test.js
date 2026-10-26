const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {Codex}=require('../src/codex');
test('Codex handshakes, streams approval, waits for explicit decision, and reports completion',async()=>{
  const events=[];
  let complete,approval;
  const approved=new Promise(r=>approval=r),done=new Promise(r=>complete=r);
  const client=new Codex('mock',__dirname,m=>{events.push(m);if(m.id===99)approval(m);if(m.method==='turn/completed')complete(m);},()=>{},()=>spawn(process.execPath,[path.join(__dirname,'fake-codex.cjs')],{env:process.env,stdio:['pipe','pipe','pipe']}));
  try{
    await client.init();
    assert.equal((await client.request('thread/start',{})).thread.id,'thread-1');
    await client.request('turn/start',{});
    const request=await approved;
    assert.equal(request.method,'item/commandExecution/requestApproval');
    assert.equal(events.some(m=>m.method==='turn/completed'),false);
    client.send({id:request.id,result:{decision:'decline'}});
    assert.equal((await done).params.turn.status,'completed');
    await assert.rejects(client.request('unsupported',{}),/unsupported test method/);
  }finally{client.dispose();}
});
