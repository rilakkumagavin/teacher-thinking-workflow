'use strict';
const Journey = (()=>{
 const codes=['LOOK-27','NEED-46','MAP-83','PROOF-52','MAKE-39','TRY-64','TEAM-78','RULE-25','RETEST-93','DESIGN-ALL'];
 const normalizeCode=value=>String(value??'').normalize('NFKC').toUpperCase().replace(/[\s\-‐‑‒–—﹣－]/g,'');
 function normalize(value={}){
  const awarded=[...new Set((Array.isArray(value.awarded)?value.awarded:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<10))].sort((a,b)=>a-b);
  let prefix=0;while(awarded.includes(prefix)&&prefix<10)prefix++;
  const requested=Number.isInteger(value.unlocked)?value.unlocked:1;
  const unlocked=Math.max(1,Math.min(10,requested,prefix+1));
  return {unlocked,awarded:awarded.filter(n=>n<=unlocked-1),allUnlocked:value.allUnlocked===true&&unlocked===10&&prefix===10};
 }
 function redeem(progress,target,input){
  const p=normalize(progress);
  if(p.allUnlocked)return {ok:true,already:true,progress:p};
  if(!Number.isInteger(target)||target<1||target>10)return {ok:false,message:'請從目前開放的關卡繼續。'};
  if(target<p.unlocked)return {ok:true,already:true,progress:p};
  if(target!==p.unlocked||!p.awarded.includes(target-1))return {ok:false,message:'請先完成前一關的三項思考紀錄，取得通關代碼。'};
  if(normalizeCode(input)!==normalizeCode(codes[target-1]))return {ok:false,message:'代碼不正確，請對照前一關取得的代碼再試一次。'};
  return {ok:true,progress:{...p,unlocked:Math.min(10,p.unlocked+1),allUnlocked:target===10}};
 }
 return Object.freeze({codeFor:i=>codes[i],normalizeCode,normalize,redeem,canAccess:(p,i)=>Number.isInteger(i)&&i>=0&&i<10&&(p.allUnlocked||i<p.unlocked)});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=Journey;
