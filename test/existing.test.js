const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {snapshot,records,within,readSnapshot,observe}=require('../src/existing');
test('Codex metadata, task text, and complete status are read without resume',()=>{
  const data=snapshot('codex',[
    {type:'session_meta',payload:{id:'123',cwd:'/project'}},
    {type:'response_item',payload:{type:'message',role:'user',content:[{type:'input_text',text:'# Context\n## My request:\n로그인 수정'}]}},
    {type:'event_msg',payload:{type:'task_complete'}}
  ],Date.now());
  assert.equal(data.cwd,'/project');assert.equal(data.task,'기존 대화');assert.equal(data.state,'done');
});
test('silent logs never claim current thinking or permission approval',()=>{
  const result=snapshot('codex',[{type:'event_msg',payload:{type:'task_started'}}],1000,200000);
  assert.equal(result.state,'idle');
  assert.equal(snapshot('claude',[{type:'assistant',message:{content:[{type:'tool_use',name:'AskUserQuestion'}]}}],Date.now()).state,'working');
});
test('Claude conversation title takes precedence over a short follow-up request',()=>{
  const result=snapshot('claude',[{type:'ai-title',aiTitle:'로그인 화면 구현'},{type:'last-prompt',lastPrompt:'계속해줘'},{type:'user',message:{content:'user: 계속해줘'}}],Date.now());
  assert.equal(result.task,'로그인 화면 구현');
});
test('raw prompts are never used as conversation names',()=>{
  const events=[{type:'last-prompt',lastPrompt:'지금프로젝트 확인해줘'},{type:'user',message:{content:'응 만들어봐'}}];
  assert.equal(snapshot('claude',events,Date.now()).task,'기존 대화');
  assert.equal(snapshot('codex',[{type:'event_msg',payload:{type:'user_message',message:'계속해줘'}}],Date.now()).task,'기존 대화');
});
test('Claude tool result and turn completion supersede prior activity',()=>{
  const rows=[{type:'user',cwd:'/app',sessionId:'abc',message:{content:'수정해줘'}},{type:'assistant',message:{content:[{type:'tool_use',name:'Read'}]}},{type:'user',message:{content:[{type:'tool_result'}]}},{type:'system',subtype:'turn_duration'}];
  assert.equal(snapshot('claude',rows,Date.now()).state,'done');
  assert.equal(snapshot('claude',rows,Date.now()).session,'abc');
});
test('malformed partial lines and sibling workspaces do not match',()=>{
  assert.equal(records('{"type":"user"}\n{"type":').length,1);
  assert.equal(within('/project','/project-two'),false);
  assert.equal(within('/project','/project/sub'),true);
});
test('reads appended events and observer disposal stops delivery',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'meadow-existing-'));
  const file=path.join(dir,'session.jsonl');let watcher;
  try{
    await fs.writeFile(file,JSON.stringify({type:'session_meta',payload:{id:'session',cwd:dir}})+'\n');
    await fs.appendFile(file,JSON.stringify({type:'event_msg',payload:{type:'task_complete'}})+'\n');
    assert.equal((await readSnapshot(file,'codex')).state,'done');
    let received=0;
    watcher=observe({file,provider:'codex'},()=>received++,()=>{});
    watcher.dispose();
    await new Promise(r=>setTimeout(r,30));assert.equal(received,0);
  }finally{watcher?.dispose();await fs.rm(dir,{recursive:true,force:true});}
});
