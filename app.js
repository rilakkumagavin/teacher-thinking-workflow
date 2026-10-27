'use strict';
const $ = id => document.getElementById(id);
const STORAGE_KEY='teacher-thinking-studio-v1';
const defaultState=()=>({version:2,subject:'social',step:0,teacher:false,answers:{},completed:[],bonus:false,unlocked:1,awarded:[],allUnlocked:false});
let state=defaultState(),canStore=true,timer,gateTarget=null,teacherAuthorized=false;
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function cleanState(value){
 if(!value||![1,2].includes(value.version)||!SUBJECTS[value.subject]||!value.answers||typeof value.answers!=='object')throw Error('這份檔案不是可辨識的設計筆記。');
 const s=defaultState();s.subject=value.subject;s.step=Number.isInteger(value.step)&&value.step>=0&&value.step<10?value.step:0;s.teacher=false;s.bonus=value.bonus===true;
 s.completed=Array.isArray(value.completed)?[...new Set(value.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<10))]:[];
 STEPS.forEach((step,i)=>{s.answers[i]={};step.fields.forEach(([key])=>{const v=value.answers[i]?.[key];if(typeof v==='string')s.answers[i][key]=v.slice(0,6000);});});
 const progress=Journey.normalize(value.version===2?value:{});Object.assign(s,progress);s.step=Math.min(s.step,s.unlocked-1);s.bonus=s.allUnlocked&&s.bonus;s.completed=s.completed.filter(i=>Journey.canAccess(s,i)&&STEPS[i].fields.every(([key])=>s.answers[i]?.[key]?.trim()));return s;
}
try{const saved=localStorage.getItem(STORAGE_KEY);if(saved)state=cleanState(JSON.parse(saved));}catch{canStore=false;}
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({...state,teacher:false}));canStore=true;}catch{canStore=false;}$('save-status').textContent=canStore?'已儲存在目前瀏覽器':'儲存不可用，請匯出備份';}
function response(i,key){return state.answers[i]?.[key]?.trim()||'';}
function stepFilled(i){return STEPS[i].fields.some(([key])=>response(i,key));}
function stepReady(i){return STEPS[i].fields.every(([key])=>response(i,key));}
function summaryOf(i){return STEPS[i].fields.map(([key,label])=>`${label}：${response(i,key)||'待確認'}`).join('\n');}
function buildPrompt(){
 const s=STEPS[state.step],subject=SUBJECTS[state.subject];
 const jobs=[
  '協助我比較兩份同源教材作品各支持的學生操作。依我提供的學生需要提出追問；沒有實際作品時，不猜測 A、B 的優劣，也不宣稱學生學習成效。',
  '協助將學生卡點轉成可觀察的學習目標與任務指令 V1，保留教師的學生需求判斷。分清題量、支持程度與思考難度。',
  '只依我提供且版本相符的教材整理核心問題、概念與關係。先確認版本、課名與頁碼，再選分類、比較、因果或先後等結構；區塊數由教材決定，不硬湊三部分。',
  '逐條核對教材內容與來源，分成教材明示、有據推論、未知。每項列檔名、印刷頁、教冊頁與 PDF 頁序；未能取得原頁就標無法確認，不推算。',
  '依已核對題面與教師需求產生學生圖文學習單。先列題面、實際格數、各區分配與獨立答案表；不新增教材事實。學生圖不印答案、來源表與製作說明。圖像要承接概念關係，文字與留白可讀可寫，擁擠時拆頁。先做學生版供檢查。',
  '依試用紀錄做具體修訂。先列本次修改項目與保持不變項目；保留題號及已核對的概念，修後逐項核對全份。學生圖檢查後，才從同版另做教師答案版。',
  '把我已走過的流程整理為人與 AI 分工表：可交辦操作、輸入、產出、驗收點、教師保留決策及遇到疑點的回報方式。',
  '依本次經驗寫一份可重用的工作規格／SKILL.md 草稿，包含適用範圍、輸入條件、科目分流、步驟、輸出、未知處理與驗收。保留教師判斷，規則需透過實際試跑修訂，不宣稱安裝或執行成功。',
  '依相同教材版本、範圍、需求與驗收標準重測，整理兩次結果的一致與差異。根據觀察建議修訂規則；沒有兩次結果時，先列需要的資料，不臆測。',
  '整理可交接的教學製作包清單與使用說明：適用學生、目標、教材版本、來源、學生版、教師答案、製作指令、QA、版本紀錄與待確認項目。分清已核對、已目視、已實體列印、已學生試作及教師已確認狀態。'
 ];
 return `你是教師的教材轉譯協作者。這次只處理「活動 ${String(state.step+1).padStart(2,'0')}：${s.title}」。\n\n科目：${subject.name}\n科目脈絡：${subject.prompt}\n\n教師這一步的判斷：\n${summaryOf(state.step)}\n\n先前的學生需求與教材範圍（未填者不猜）：\n${summaryOf(1)}\n${summaryOf(2)}\n\n本次任務：\n${jobs[state.step]}\n\n共同原則：\n1. 教材事實僅依實際提供的原始來源，未提供時寫「教材未明確提供」或列待確認。\n2. 不因科目同名就沿用其他版次；不把教學示意當課本內容。\n3. 所有內容重點、題面與答案都要能對應來源；學生版不得直接露答案。\n4. 保留限定語與合理同義表述，不以唯一版面或固定字詞替代概念理解。\n5. 不覆寫教師已確認的檔案，修訂另存版本；不宣稱已操作服務、已驗證圖片或已完成紙本試用。\n6. 最後回報完成內容、依據、待查項目與下一個教師判斷。`;
}
function gateForm(target){
 const final=target===10;
 return `<form id="gate-form" class="gate-form" data-target="${target}" novalidate><label for="gate-code">${final?'輸入最後一組密碼':'輸入講師提供的第'+String(target+1).padStart(2,'0')+'關密碼'}</label><div class="gate-input-row"><input id="gate-code" name="code" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="40" placeholder="輸入通關代碼" aria-describedby="gate-feedback"><button class="primary" type="submit">${final?'解鎖全部步驟':'解鎖第'+String(target+1).padStart(2,'0')+'關'} →</button></div><p id="gate-feedback" class="gate-feedback" role="status">大小寫與連字號不影響判定，輸入後按 Enter 也可通關。</p></form>`;
}
function bindGate(){
 document.getElementById('gate-form')?.addEventListener('submit',e=>{
  e.preventDefault();const input=$('gate-code');const target=Number(e.currentTarget.dataset.target);const result=Journey.redeem(state,target,input.value);
  if(!result.ok){$('gate-feedback').textContent=result.message;input.setAttribute('aria-invalid','true');input.focus();return;}
  Object.assign(state,result.progress);gateTarget=null;if(result.progress.allUnlocked)state.step=9;else if(target<10)state.step=target;save();render();$('workbench').scrollIntoView({block:'start',behavior:'smooth'});toast(result.progress.allUnlocked?'全部步驟與最後彩蛋都已解鎖，可自由回看。':'密碼正確，第'+String(target+1).padStart(2,'0')+'關已開放。');
 });

}
function renderGate(){
 const slot=document.getElementById('journey-slot');if(!slot)return;
 if(state.allUnlocked){slot.innerHTML='<section class="journey-success"><span>✓ 完成整段旅程</span><h3>全部步驟已解鎖。</h3><p>現在可以自由回看與修訂十個活動，已解鎖的關卡會保留。最後一個活動也開放了兩步驟彩蛋。</p></section>';return;}
 const target=state.step+1,recorded=state.completed.includes(state.step);
 slot.innerHTML=`<section class="journey-pass"><p class="eyebrow">講師發碼 · 依現場節奏前進</p><h3>${recorded?'紀錄已完成，等待講師發碼。':'通關密碼，由講師提供。'}</h3><p class="gate-note">${target===10?'完成最後的回顧後，向講師取得最後一組密碼；輸入後即可解鎖全部步驟與彩蛋。':'先完成本關思考與討論，再依講師指示輸入下一關密碼。網站不會自行產生或顯示通關代碼。'}</p>${target<state.unlocked?'<p class="gate-note">下一關已解鎖，可使用導覽回到已開放的活動。</p>':gateForm(target)}</section>`;bindGate();
}
function renderLocked(){
 const target=gateTarget;
 $('activity').innerHTML=`<div class="activity-card locked-card">${state.teacher&&teacherAuthorized?instructorCodes():''}<span class="lock-emblem" aria-hidden="true">⌁</span><p class="eyebrow">一步一步，留下自己的判斷</p><h2>第 ${String(target+1).padStart(2,'0')} 關，等待你的通關密碼。</h2><p class="activity-intro">請先完成前一關的思考與討論，等待講師提供密碼。已拿到講師給的密碼，即可在下方輸入；不需另行完成本機填寫才能解鎖。</p>${gateForm(target)}<button id="return-open" class="secondary">← 回到第 ${String(state.step+1).padStart(2,'0')} 關</button></div>`;
 bindGate();$('return-open').addEventListener('click',()=>{gateTarget=null;render();});updateFooter();
}
function renderNav(){
 $('step-nav').innerHTML=CYCLES.map((c,ci)=>`<div class="nav-cycle">${String(ci+1).padStart(2,'0')} / ${c.name}</div>`+STEPS.slice(ci*2,ci*2+2).map((s,j)=>{const i=ci*2+j;return `<button class="step-link ${i===state.step?'active':''}" data-step="${i}" ${i===state.step?'aria-current="step"':''}><span class="num">${String(i+1).padStart(2,'0')}</span>${s.short}${!Journey.canAccess(state,i)?'<span class="locked-label" aria-label="尚未解鎖">鎖定</span>':(state.allUnlocked||i<state.unlocked-1)?'<span class="done" aria-label="已通關">✓</span>':''}</button>`;}).join('')).join('');
 $('step-nav').querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>navigate(Number(b.dataset.step))));
 $('progress-label').textContent=state.allUnlocked?'全部步驟已解鎖':`${state.unlocked-1} / 10 已通關`;$('progress-fill').style.width=`${state.allUnlocked?100:(state.unlocked-1)*10}%`;
 document.querySelectorAll('[data-cycle]').forEach(a=>{const locked=!Journey.canAccess(state,Number(a.dataset.cycle)*2);a.classList.toggle('cycle-locked',locked);a.setAttribute('aria-label',`${a.textContent}${locked?'，尚未解鎖':''}`);});
}
function lensText(){const v=SUBJECTS[state.subject];if(state.step<=1)return v.question+' 可觀察的學生操作：'+v.verbs+'。';if(state.step===2)return v.structure;if(state.step===3)return '查核焦點：'+v.trap+' 每項概念與答案仍需回到實際來源。';if(state.step===4)return v.blank+' '+v.visual;if(state.step===5)return '試用時特別注意：'+v.trap+' 檢查學生是否真的完成「'+v.verbs+'」的任務。';return '固定保留來源查核、答案一致與版本紀錄；依科目改變脈絡：'+v.structure;}
function instructorCodes(){
 if(!teacherAuthorized||!state.teacher)return '';
 return `<details class="instructor-codes"><summary>講師通關代碼｜本關與完整對照</summary><p class="instructor-current">${state.step===9?'本關後解鎖全部與彩蛋':'本關後開啟第 '+String(state.step+2).padStart(2,'0')+' 關'}：<code>${Journey.codeFor(state.step)}</code></p><table><thead><tr><th>解鎖目標</th><th>講師提供的代碼</th></tr></thead><tbody>${Array.from({length:10},(_,i)=>`<tr><td>${i===9?'全部步驟與彩蛋':'第 '+String(i+2).padStart(2,'0')+' 關'}</td><td><code>${Journey.codeFor(i)}</code></td></tr>`).join('')}</tbody></table><p>請依現場進度發放。學員模式不會顯示這份代碼表。</p></details>`;
}
function teacherPanel(){const s=STEPS[state.step],c=CYCLES[Math.floor(state.step/2)];return `<section class="teacher-notes"><h3>講師帶領筆記</h3><div class="timing">循環 ${Math.floor(state.step/2)+1} · ${c.time} ｜ 本活動約 30 分鐘</div><p>${s.teacher}</p>${instructorCodes()}<p>說明 10 分鐘：情境 3、示範與追問 4、產出標準 3。操作 20 分鐘：先自己寫 5、試跑或討論 10、查核保存 5。</p><div class="paths"><div><strong>初學路徑</strong>${s.basic}</div><div><strong>進階路徑</strong>${s.advanced}</div></div></section>`;}
function bonusPanel(){return `<section class="bonus"><p class="eyebrow">你已走到最後一個活動</p><h3>留到最後的一個彩蛋。</h3><p>回頭看，你已經作了哪些設計判斷？現在，再看看熟悉的操作可以怎樣收斂。</p><button id="bonus-open" class="bonus-open" aria-expanded="${state.bonus}" aria-controls="bonus-content">${state.bonus?'收起彩蛋 ↑':'打開最後的彩蛋 ↗'}</button><div id="bonus-content" class="bonus-content" ${state.bonus?'':'hidden'}><h3>原來，可以收斂成兩步驟。</h3><div class="bonus-step"><b>01</b><p><strong>NotebookLM：拆解教材、核對來源。</strong><br>帶著學生需求與科目脈絡，確認版本、概念、題面與答案依據。</p></div><div class="bonus-step"><b>02</b><p><strong>ChatGPT：讓圖像承接教材關係。</strong><br>以已核對底稿製作學生圖，檢查後再編輯同版教師答案圖。</p></div><p>被濃縮的是操作入口。學生需求、版本確認、學科脈絡、原頁查核與試用修訂，仍由老師作判斷。</p><a class="bonus-link" href="https://rilakkumagavin.github.io/ai-worksheet-two-steps/index.html?v=dfe0d6f#workspace" target="_blank" rel="noopener noreferrer">帶著我的判斷，開啟兩步驟工具 ↗</a><p class="reset-note">開啟的是外部工具，不會自動傳送本頁筆記。先匯出設計紀錄，再依需要帶入。</p></div></section>`;}
function renderActivity(){
 if(gateTarget!==null){renderLocked();return;}
 const s=STEPS[state.step],v=SUBJECTS[state.subject];
 $('activity').innerHTML=`<div class="activity-card">${state.teacher&&teacherAuthorized?teacherPanel():''}<div class="activity-meta"><span class="activity-number">活動 ${String(state.step+1).padStart(2,'0')}</span><span>循環 ${Math.floor(state.step/2)+1} · ${CYCLES[Math.floor(state.step/2)].name}</span></div><h2>${s.title}</h2><p class="activity-intro">${s.intro}</p><div class="thinking-question"><span>先問自己</span>${s.question}</div><div class="output-line"><span>這一步帶走</span>${s.output}</div><div class="subject-lens"><div class="lens-top"><strong>${v.name}的思考鏡頭</strong><span>${v.tag}</span></div><p>${lensText()}</p>${state.step===2?`<div class="relation-map">${v.map.map((n,i)=>(i?'<span class="relation-arrow" aria-hidden="true">→</span>':'')+`<span class="relation-node">${n}</span>`).join('')}</div><span class="map-caption">上圖是組織示意；實際概念與關係由本課教材決定。</span>`:''}</div><div class="reflection-fields">${s.fields.map(([key,label,placeholder],i)=>`<label class="field"><span class="field-label"><b>${String(i+1).padStart(2,'0')}</b>${label}</span><textarea id="answer-${key}" data-answer="${key}" maxlength="6000" placeholder="${escapeHTML(placeholder)}">${escapeHTML(response(state.step,key))}</textarea></label>`).join('')}</div><details><summary>先想過，再看一個設計示例</summary><div class="example-body"><span class="example-stamp">教學設計示意 · 不作為任何課本的事實或答案</span><p>${s.example}</p><p><strong>${v.name}可追問：</strong>${v.example}</p>${state.step===0?'<div class="task-compare"><div><strong>A / 關係填空</strong><p>概念 ──【關係詞】── 概念</p><span>學生需要解釋兩者怎樣連。</span></div><div><strong>B / 特徵比較</strong><p>找特徵 → 對照差異 → 說明理由</p><span>學生需要逐項觀察與比較。</span></div></div>':''}</div></details><details id="prompt-details"><summary>把我的判斷，整理成這一步的 AI 任務</summary><p class="prompt-warning">先留下一項思考紀錄，再複製指令。此網頁只整理任務，不會自動傳送或生成教材。</p><pre class="prompt-box" id="prompt-preview"></pre><div class="prompt-tools"><button class="copy-button" id="copy-prompt">複製本步指令</button><span id="prompt-status" class="prompt-warning"></span></div></details>${state.allUnlocked&&state.step===9?bonusPanel():''}<div id="journey-slot"></div></div>`;
 $('activity').querySelectorAll('[data-answer]').forEach(el=>el.addEventListener('input',()=>{state.answers[state.step]??={};state.answers[state.step][el.dataset.answer]=el.value;state.completed=state.completed.filter(n=>n<state.step);save();renderNav();updatePrompt();updateFooter();renderGate();}));
 $('copy-prompt').addEventListener('click',()=>copyText(buildPrompt()));
 if($('bonus-open'))$('bonus-open').addEventListener('click',()=>{state.bonus=!state.bonus;save();$('bonus-content').hidden=!state.bonus;$('bonus-open').textContent=state.bonus?'收起彩蛋 ↑':'打開最後的彩蛋 ↗';$('bonus-open').setAttribute('aria-expanded',String(state.bonus));});
 updatePrompt();updateFooter();renderGate();
}
function updatePrompt(){const filled=stepFilled(state.step);$('prompt-preview').textContent=filled?buildPrompt():'先在上方留下一項自己的觀察或判斷，這裡就會帶入你的內容。';$('copy-prompt').disabled=!filled;$('prompt-status').textContent=filled?'請核對內容，再帶到你使用的 AI 工具。':'尚未留下思考紀錄。';}
function updateFooter(){
 $('prev').hidden=gateTarget!==null;$('next').hidden=gateTarget!==null;$('complete').hidden=gateTarget!==null;
 $('prev').disabled=state.step===0;$('next').disabled=state.step===9&&state.allUnlocked;
 $('next').textContent=state.step===9?(state.allUnlocked?'全部步驟已解鎖':'輸入最後密碼，解鎖全部 →'):Journey.canAccess(state,state.step+1)?'下一個思考 →':'輸入密碼，前往下一關 →';
 $('complete').classList.toggle('recorded',state.completed.includes(state.step));$('complete').textContent=state.completed.includes(state.step)?'✓ 已完成本關任務':'✓ 完成本關紀錄';
}
function render(){renderNav();renderActivity();document.querySelectorAll('[data-subject]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.subject===state.subject)));$('teacher-toggle').setAttribute('aria-pressed',String(state.teacher));$('teacher-toggle').innerHTML=state.teacher?'離開講師模式 <span aria-hidden="true">↗</span>':'講師帶領模式 <span aria-hidden="true">↗</span>';}
function navigate(i){if(!Journey.canAccess(state,i)){gateTarget=state.unlocked;render();$('workbench').scrollIntoView({block:'start',behavior:'smooth'});return;}gateTarget=null;state.step=i;save();render();$('workbench').scrollIntoView({block:'start',behavior:'smooth'});}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast('指令已複製，請帶到你選用的 AI 工具。');}catch{const box=$('prompt-preview');if(box){const sel=window.getSelection(),range=document.createRange();range.selectNodeContents(box);sel.removeAllRanges();sel.addRange(range);}toast('無法自動複製，請選取顯示的文字手動複製。');}}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportMarkdown(){
 const v=SUBJECTS[state.subject];let md=`# AI 輔助教材轉譯｜我的設計筆記\n\n科目：${v.name}\n紀錄日期：${new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei'}).format(new Date())}\n已標記紀錄：${state.completed.length}/10（不代表教材或作品已通過驗收）\n\n筆記內容由使用者填寫；原教材、作品及來源原頁需另行保存。\n`;
 STEPS.forEach((s,i)=>{if(!Journey.canAccess(state,i)){md+=`\n## 活動 ${String(i+1).padStart(2,'0')}｜尚未解鎖\n`;return;}md+=`\n## 活動 ${String(i+1).padStart(2,'0')}｜${s.title}\n\n思考問題：${s.question}\n\n${summaryOf(i)}\n\n預期產出：${s.output}\n紀錄狀態：${state.completed.includes(i)?'已記錄':'待完成'}\n`;});
 md+=`\n## 本科轉譯原則\n\n${v.structure}\n\n填空：${v.blank}\n\n圖像：${v.visual}\n\n## 交付提醒\n\n- 來源版本與範圍需相符，印刷頁碼與 PDF 頁序分開。\n- 學生題面、教師答案與來源逐題對齊，合理同義表述可接受。\n- 區分教材明示、有據推論與未知；原頁無法取得時不宣稱已核對。\n- 分清圖片目視、實體列印、學生試作與教師確認狀態。\n- 已確認版本另存保留，修改留下紀錄。\n`;
 if(state.allUnlocked&&state.bonus)md+='\n## 最後的彩蛋：兩步驟工具\n\nNotebookLM 拆解與核對 → ChatGPT 圖像製作與修訂。\n工具入口：https://rilakkumagavin.github.io/ai-worksheet-two-steps/index.html?v=dfe0d6f#workspace\n濃縮操作，不省略教師的需求判斷、學科脈絡、來源查核及試用。\n';
 download(`教材轉譯設計筆記-${v.name}.md`,md,'text/markdown;charset=utf-8');toast('設計筆記已匯出。');
}
$('cycle-overview').innerHTML=CYCLES.map((c,i)=>`<a href="#workbench" class="cycle-card" data-cycle="${i}"><span>循環 ${String(i+1).padStart(2,'0')}</span><strong>${c.name}</strong><p>${c.sub}</p></a>`).join('');
document.querySelectorAll('[data-cycle]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();navigate(Number(a.dataset.cycle)*2);}));
document.querySelectorAll('[data-subject]').forEach(b=>b.addEventListener('click',()=>{if(state.subject===b.dataset.subject)return;state.subject=b.dataset.subject;state.completed=[];save();render();toast('已切換科目提示；保留筆記與已解鎖關卡，請重新確認內容是否適用。');}));
$('teacher-toggle').addEventListener('click',()=>{
 if(state.teacher&&teacherAuthorized){teacherAuthorized=false;state.teacher=false;save();render();toast('已離開講師模式，代碼已隱藏。');return;}
 $('teacher-password').value='';$('teacher-login-status').textContent='請輸入講師提供的管理密碼。';$('teacher-password').removeAttribute('aria-invalid');$('teacher-login').showModal();$('teacher-password').focus();
});
$('teacher-login-cancel').addEventListener('click',()=>$('teacher-login').close());
$('teacher-login').addEventListener('close',()=>{$('teacher-password').value='';});
$('teacher-login-form').addEventListener('submit',async e=>{
 e.preventDefault();$('teacher-login-submit').disabled=true;
 try{if(!await InstructorAccess.authenticate($('teacher-password').value)){$('teacher-login-status').textContent='密碼不正確，請重新輸入。';$('teacher-password').setAttribute('aria-invalid','true');$('teacher-password').focus();$('teacher-password').select();return;}
 teacherAuthorized=true;state.teacher=true;$('teacher-login').close();save();render();toast('已進入講師模式，可查看各關代碼。');
 }catch{$('teacher-login-status').textContent='此瀏覽器無法完成驗證，請使用支援 HTTPS 的新版瀏覽器。';}finally{$('teacher-login-submit').disabled=false;}
});
$('prev').addEventListener('click',()=>{if(state.step>0)navigate(state.step-1);});$('next').addEventListener('click',()=>{if(state.step<9)navigate(state.step+1);else if(!state.allUnlocked){document.getElementById('gate-code')?.focus();document.getElementById('journey-slot')?.scrollIntoView({block:'center',behavior:'smooth'});}});
$('complete').addEventListener('click',()=>{
 if(gateTarget!==null)return;
 if(!stepReady(state.step)){const missing=STEPS[state.step].fields.find(([key])=>!response(state.step,key));toast('請完成本關三項思考紀錄，再標記完成。');$('answer-'+missing[0]).focus();return;}
 if(!state.completed.includes(state.step))state.completed.push(state.step);
 save();renderNav();updateFooter();renderGate();$('journey-slot').scrollIntoView({block:'center',behavior:'smooth'});toast('本關紀錄已保存，請依講師指示取得通關密碼。');
});
$('export').addEventListener('click',exportMarkdown);$('download-json').addEventListener('click',()=>download('教材轉譯設計筆記-備份.json',JSON.stringify(state,null,2),'application/json'));
$('import').addEventListener('click',()=>$('import-file').click());$('import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>250000)throw Error('檔案過大，請選擇本頁匯出的 JSON 筆記。');const next=cleanState(JSON.parse(await file.text()));if(STEPS.some((_,i)=>stepFilled(i))&&!window.confirm('匯入會取代目前瀏覽器中的筆記。請先匯出備份；確定要取代嗎？'))return;state=next;teacherAuthorized=false;state.teacher=false;gateTarget=null;save();render();toast('筆記已匯入。');}catch(err){toast(err.message||'匯入失敗，請檢查備份檔案。');}finally{e.target.value='';}});
$('begin').addEventListener('click',()=>navigate(0));
render();save();
