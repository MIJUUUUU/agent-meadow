const {test}=require('node:test');
const assert=require('node:assert/strict');
const {claudeState}=require('../src/state');
test('plan and question tools wait for a person, then resume only on a real tool result',()=>{
  for(const tool_name of ['ExitPlanMode','AskUserQuestion']){
    assert.equal(claudeState({hook_event_name:'PreToolUse',tool_name})[0],'waiting');
    assert.equal(claudeState({hook_event_name:'PostToolUse',tool_name})[0],'thinking');
  }
});
test('ordinary notifications do not create false permission alerts',()=>{
  assert.equal(claudeState({hook_event_name:'Notification',notification_type:'auth_success'}),null);
  assert.equal(claudeState({hook_event_name:'Notification',notification_type:'permission_prompt'})[0],'waiting');
});
test('idle, success, and disconnection are distinct states',()=>{
  assert.equal(claudeState({hook_event_name:'SessionStart'})[0],'idle');
  assert.equal(claudeState({hook_event_name:'Stop'})[0],'done');
  assert.equal(claudeState({hook_event_name:'SessionEnd'})[0],'sleeping');
});
