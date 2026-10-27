const assert=require('node:assert/strict');
const Journey=require('./journey.js');
let p={unlocked:1,awarded:[],allUnlocked:false};
assert.equal(Journey.canAccess(p,0),true);
assert.equal(Journey.canAccess(p,1),false);
assert.equal(Journey.redeem(p,1,Journey.codeFor(0)).ok,false,'尚未完成不能只靠正確密碼通關');
assert.equal(Journey.redeem(p,9,Journey.codeFor(8)).ok,false,'不能跳過前面的關卡');
for(let i=0;i<10;i++){
 p.awarded.push(i);
 assert.equal(Journey.redeem(p,i+1,'WRONG').ok,false);
 const code=Journey.codeFor(i).toLowerCase().replace('-',' ');
 const result=Journey.redeem(p,i+1,code);
 assert.equal(result.ok,true,`第${i+1}關可依序通關`);
 p=result.progress;
 if(i<9){assert.equal(p.unlocked,i+2);assert.equal(p.allUnlocked,false);}
}
assert.equal(p.allUnlocked,true,'只有最後密碼輸入後才全開');
assert.equal([...Array(10)].every((_,i)=>Journey.canAccess(p,i)),true);
assert.deepEqual(Journey.normalize(JSON.parse(JSON.stringify(p))),p,'保存與匯入可恢復已解鎖進度');
assert.equal(Journey.normalize({unlocked:10,awarded:[],allUnlocked:true}).allUnlocked,false,'不接受缺少通關紀錄的全開狀態');
assert.equal(Journey.normalize({unlocked:10,awarded:[0,2,4]}).unlocked,2,'不連續紀錄不能越級');
assert.equal(Journey.normalizeCode('  ｌｏｏｋ－２７ '),'LOOK27');
assert.equal(Journey.canAccess(p,-1),false);
assert.equal(Journey.canAccess(p,10),false);
console.log('通過：逐關、錯誤密碼、防跳關、最後全開、備份還原與輸入格式。');

