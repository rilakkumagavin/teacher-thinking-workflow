'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const elements=new Map(),storage=new Map();
function element(id){if(!elements.has(id))elements.set(id,{id,textContent:'',innerHTML:'',value:'',disabled:false,hidden:false,style:{},listeners:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},querySelectorAll(){return[]},addEventListener(name,fn){this.listeners[name]=fn},scrollIntoView(){},focus(){},showModal(){},close(){}});return elements.get(id);}
const ctx=vm.createContext({console,document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>1,clearTimeout(){},window:{confirm:()=>true},navigator:{clipboard:{writeText:async()=>{}}},Date});
for(const name of ['content.js','decisions.js','workshop.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),ctx);
vm.runInContext(`
const old=cleanState({version:2,subject:'social',step:9,unlocked:1,answers:{0:{need:'舊筆記不遺失',compare:'原比較',verify:'原待查'}},completed:[0]});
if(old.answers[0].need!=='舊筆記不遺失'||old.step!==9)throw Error('遷移不應遺失文字或限制活動');
if(Object.keys(old.records).length||old.completed.length)throw Error('舊筆記不能自動視為新示範採用');
const v3=cleanState({version:3,subject:'science',answers:{4:{decision:'原選擇',evidence:'原來源',revision:'原修訂'}},completed:[4]});
if(v3.answers[4].evidence!=='原來源'||v3.records[7])throw Error('v3 文字必須保留，不能杜撰採用');
state=defaultState();render();
for(let i=0;i<10;i++){
 navigate(i);
 if(state.step!==i)throw Error('空白不能導覽第'+(i+1)+'關');
 if(Object.keys(state.records).length)throw Error('瀏覽不應自動採用');
 const prompt=buildPrompt();
 if(i===6&&(!prompt.includes('請現在先直接生成學生版圖片')||!prompt.includes('同一張圖片編輯教師答案版')||prompt.includes('B01')))throw Error('第七關必須直接出圖片、同版教師圖且無題碼');
 if(i===0?prompt!==WARMUP_PROMPT:i===9?(!prompt.includes('教材資料夾')||!prompt.includes('PDF')||!prompt.includes('教師答案')):i===8?(!prompt.includes('第二次')||!prompt.includes('不覆寫第一次')):i===7?(!prompt.includes('SKILL.md')||!prompt.includes('我的步驟')||!prompt.includes('老師')):i===6?(!prompt.includes('10 個')||!prompt.includes('難度：')):i===5?(!prompt.includes('不改變三部分知識邏輯')||!prompt.includes('需要老師確認')):i===4?prompt!==REORGANIZE_PROMPT:i===3?prompt!==CORE_ANALYSIS_PROMPT:i===2?prompt!==SOURCE_CHECK_PROMPT:i===1?(!prompt.startsWith('任教年級：')||!prompt.includes('科目：')||!prompt.includes('今天要處理的課次：')||!prompt.includes('希望學生最後學會什麼：')):(prompt.length<60||!prompt.includes('上傳教材')||!prompt.includes('老師最後確認')||prompt.includes('證據狀態：')||prompt.includes('版本：')))throw Error('完整指令或查核約束缺漏');
 if(i===1?!effectiveContent(i).artifact.includes('希望學生最後學會什麼'):effectiveContent(i).artifact.length<60)throw Error('缺少實際產出');
}
state=defaultState();
for(let i=0;i<10;i++){
 navigate(i);adoptDemo();
 if(state.records[i].choice!=='demo'||!state.records[i].content.artifact)throw Error('採用未保存');
 if(state.review.confirmedAt||state.review.checks.length)throw Error('採用不能宣稱審核完成');
 const restored=cleanState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
 if(restored.records[i].content.artifact!==state.records[i].content.artifact)throw Error('保存還原不一致');
}
if(state.completed.length!==10)throw Error('未完成十關紀錄');
state.review={checks:[0,1,2,3],confirmedAt:'2026-10-29T00:00:00Z'};
recordContent(7,'custom',{...effectiveContent(7),decision:'測試改為口頭作答'});
if(!buildPrompt(7).includes('測試改為口頭作答'))throw Error('本關與後關指令未銜接');
if(state.review.confirmedAt||state.review.checks.length)throw Error('修訂應撤回既有審核');
const snapshot=JSON.stringify(state);const roundtrip=cleanState(JSON.parse(snapshot));
if(roundtrip.records[7].choice!=='custom'||roundtrip.records[7].content.decision!=='測試改為口頭作答')throw Error('調整內容無法還原');
const incompleteReview=cleanState({...JSON.parse(snapshot),review:{checks:[0],confirmedAt:'2026-10-29'}});
if(incompleteReview.review.confirmedAt)throw Error('缺少項目不能還原成審核完成');
let rejected=false;try{cleanState({version:4,subject:'invalid',answers:{}})}catch{rejected=true}if(!rejected)throw Error('未拒絕錯誤匯入');
`,ctx);
for(let i=0;i<10;i++){
 vm.runInContext(`state=defaultState();navigate(${i});`,ctx);
 const markup=element('activity').innerHTML;
 assert.ok(i<=9||markup.includes('id="custom-fields" hidden'),`活動${i+1}調整欄預設收起`);
 assert.ok(!markup.includes(' required'),`活動${i+1}無必填反思`);
 assert.ok(!markup.includes('gate-code'),`活動${i+1}無通關碼`);
 assert.ok(!element('next').disabled||i===9,`活動${i+1}可直接前進`);
}
assert.ok(!fs.readFileSync(path.join(__dirname,'index.html'),'utf8').includes('src="journey.js"'),'頁面不載入舊通關限制');
console.log('通過：十關空白導覽、十關採用保存、完整 Prompt、前關銜接、調整自動保存、修訂撤回審核、v2/v3 遷移、v4 還原、無必填欄與密碼限制。');


vm.runInContext(`state=defaultState();state.step=7;for(let n=0;n<4;n++){skillStage=n;renderSkillWorkshop();if($('activity').innerHTML.includes(' required'))throw Error('Skill教學不應要求必填');}recordContent(7,'custom',{...demoContent(7),skillWorkflow:'先讀教材，再請老師核對'});if(!buildPrompt(7).includes('先讀教材，再請老師核對'))throw Error('自訂步驟未帶入Skill指令');const restored=cleanState(JSON.parse(JSON.stringify(state)));if(restored.records[7].content.skillWorkflow!=='先讀教材，再請老師核對')throw Error('Skill步驟未保存');`,ctx);
