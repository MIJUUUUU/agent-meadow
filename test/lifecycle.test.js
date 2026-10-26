const {test}=require('node:test');
const assert=require('node:assert/strict');
const {removeFamily}=require('../src/lifecycle');
test('ending a session removes descendants but preserves other sessions',()=>{
  const pets=new Map([['a',{id:'a'}],['b',{id:'b',parent:'a'}],['c',{id:'c',parent:'b'}],['other',{id:'other'}]]);
  const cleaned=[];removeFamily(pets,'a',id=>cleaned.push(id));
  assert.deepEqual([...pets.keys()],['other']);assert.deepEqual(cleaned,['a','b','c']);
});
test('ending a helper preserves the parent; duplicate stop is harmless',()=>{
  const pets=new Map([['a',{id:'a'}],['b',{id:'b',parent:'a'}]]);
  removeFamily(pets,'b');removeFamily(pets,'b');assert.deepEqual([...pets.keys()],['a']);
});
