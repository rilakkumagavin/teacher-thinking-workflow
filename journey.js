'use strict';
const Journey = (()=>{
 const codes=['LOOK-27','NEED-46','MAP-83','PROOF-52','MAKE-39','TRY-64','TEAM-78','RULE-25','RETEST-93','DESIGN-ALL'];
 const normalizeCode=value=>String(value??'').normalize('NFKC').toUpperCase().replace(/[\s\-‐‑‒–—﹣－]/g,'');
 function normalize(value={}){
  const awarded=[...new Set((Array.isArray(value.awarded)?value.awarded:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<10))].sort((a,b)=>a-b);
  const requested=Number.isInteger(value.unlocked)?value.unlocked:1;
  const allUnlocked=value.allUnlocked===true;
  const unlocked=allUnlocked?10:Math.max(1,Math.min(10,requested));
  return {unlocked,awarded:awarded.filter(n=>n<=unlocked-1),allUnlocked};
 }
 function redeem(progress,target,input){
  const p=normalize(progress);
  if(p.allUnlocked)return {ok:true,already:true,progress:p};
  if(normalizeCode(input)===normalizeCode(codes[9]))return {ok:true,progress:{...p,unlocked:10,allUnlocked:true}};
  if(!Number.isInteger(target)||target<1||target>10)return {ok:false,message:'請從目前開放的關卡繼續。'};
  if(target<p.unlocked)return {ok:true,already:true,progress:p};
  if(target!==p.unlocked)return {ok:false,message:'請依講師指示，從目前開放的關卡繼續。'};
  if(normalizeCode(input)!==normalizeCode(codes[target-1]))return {ok:false,message:'代碼不正確，請確認講師提供的通關密碼。'};
  return {ok:true,progress:{...p,unlocked:Math.min(10,p.unlocked+1),allUnlocked:target===10}};
 }
 return Object.freeze({codeFor:i=>codes[i],normalizeCode,normalize,redeem,canAccess:(p,i)=>Number.isInteger(i)&&i>=0&&i<10&&(p.allUnlocked||i<p.unlocked)});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=Journey;
