'use strict';
const InstructorAccess=Object.freeze({
 async authenticate(password){
  if(typeof password!=='string'||!password)return false;
  const digest=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(password));
  const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  return hash==='4c9bc59fc0e6bc2a283a7d9e3b92f4120850d837a465f21171c33f1c33cdcbd9';
 }
});
if(typeof module!=='undefined'&&module.exports)module.exports=InstructorAccess;
