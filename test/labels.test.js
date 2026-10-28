const {test}=require('node:test');
const assert=require('node:assert/strict');
const {taskLabel}=require('../src/labels');
test('task label uses first nonempty line, normalizes spacing, limits length',()=>{
  assert.equal(taskLabel('\n 로그인   화면 수정\n추가 상세 정보'),'로그인 화면 수정');
  assert.equal(taskLabel(undefined),'작업 대기');
  assert.equal(taskLabel('x'.repeat(40)),'x'.repeat(24)+'…');
  assert.equal(taskLabel('Explore'),'Explore');
});
