(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const l of o.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&n(l)}).observe(document,{childList:!0,subtree:!0});function a(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(s){if(s.ep)return;s.ep=!0;const o=a(s);fetch(s.href,o)}})();const j="meditrack_data_v2",x={medicines:[],medicineLogs:[],hydrationLogs:[],moodEntries:[],vitalsLogs:[],sleepLogs:[],appointments:[],settings:{hydrationGoal:2e3,notificationsEnabled:!1,reminderTimes:["09:00","14:00","20:00"],theme:"light"}};function y(){return new Date().toISOString().split("T")[0]}function K(e){const t=y();return e<t}function z(){const e=localStorage.getItem(j);if(!e)return{...x};try{const t=JSON.parse(e);return{...x,...t,settings:{...x.settings,...t.settings}}}catch(t){return console.error("Failed to parse app data",t),{...x}}}let H=null;function f(){return H||(H=z()),H}function b(e){H=e,localStorage.setItem(j,JSON.stringify(e))}function U(){return f().medicines}function X(e){const t=f();t.medicines.push(e),b(t)}function Z(e){const t=f();t.medicines=t.medicines.filter(a=>a.id!==e),b(t)}function V(){const e=y(),a=f().hydrationLogs.find(n=>n.date===e);return a?a.amount:0}function C(e){const t=f(),a=y();let n=t.hydrationLogs.find(s=>s.date===a);n?n.amount=Math.max(0,n.amount+e):(n={date:a,amount:Math.max(0,e),goal:t.settings.hydrationGoal},t.hydrationLogs.push(n)),b(t)}function ee(){const e=y(),t=f(),a=t.hydrationLogs[t.hydrationLogs.length-1];a&&a.date}function Y(){return f().moodEntries.sort((e,t)=>new Date(t.date).getTime()-new Date(e.date).getTime())}function te(e){const t=f(),a=t.moodEntries.findIndex(n=>n.date===e.date);a!==-1?t.moodEntries[a]=e:t.moodEntries.push(e),t.moodEntries.sort((n,s)=>new Date(s.date).getTime()-new Date(n.date).getTime()).slice(0,90),b(t)}function W(){const e=y();return f().moodEntries.find(t=>t.date===e)||null}function R(){return`${Date.now()}-${Math.random().toString(36).substr(2,9)}`}function N(e){const[t,a]=e.split(":"),n=parseInt(t,10),s=n>=12?"PM":"AM";return`${n%12||12}:${a} ${s}`}function ne(){return new Date().getDay()}function ae(e,t){const a=ne();return e==="daily"?!0:e==="weekdays"?a>=1&&a<=5:e==="weekends"?a===0||a===6:e==="custom"&&t?t.includes(a):!1}function se(e){const t=[];return e.moodAvg&&e.moodAvg>=4?t.push("Your mood has been great lately! 🌟"):e.moodAvg&&e.moodAvg<=2.5&&t.push("Consider taking extra care of yourself today. 💙"),e.sleepAvg&&e.sleepAvg<7?t.push("Try to get more rest tonight. 😴"):e.sleepAvg&&e.sleepAvg>=8&&t.push("Your sleep habits are excellent! 🌙"),e.waterIntake&&e.waterIntake<1500&&t.push("Don't forget to drink more water! 💧"),e.medicineAdherence&&e.medicineAdherence>=90&&t.push("Amazing consistency with your medications! 💊"),t.length===0?"You're doing great! Keep it up! 👏":t.join(" ")}let I;function ie(e){I=e}function oe(e=30){const t=new Date(y()),a=[];for(let n=e-1;n>=0;n--){const s=new Date(t);s.setDate(s.getDate()-n);const o=s.toISOString().split("T")[0],l=I.vitalsLogs.filter(u=>u.date===o);l.length>0&&a.push(l.sort((u,d)=>new Date(d.timestamp).getTime()-new Date(u.timestamp).getTime())[0])}return a}function de(e){const t={...e,id:R(),date:y(),timestamp:new Date().toISOString()};return I.vitalsLogs.push(t),b(I),t}function le(){return I.vitalsLogs.length===0?null:I.vitalsLogs.sort((e,t)=>new Date(t.timestamp).getTime()-new Date(e.timestamp).getTime())[0]}function ce(e=7){const t=oe(e),a=t.filter(d=>d.heartRate).map(d=>d.heartRate),n=t.filter(d=>d.weight).map(d=>d.weight),s=t.filter(d=>d.temperature).map(d=>d.temperature),o=t.filter(d=>d.bloodPressure).map(d=>d.bloodPressure),l=d=>d.length>0?Math.round(d.reduce((h,E)=>h+E,0)/d.length*10)/10:null;let u=null;return o.length>0&&(u={systolic:Math.round(o.reduce((d,h)=>d+h.systolic,0)/o.length),diastolic:Math.round(o.reduce((d,h)=>d+h.diastolic,0)/o.length)}),{avgHeartRate:l(a),avgWeight:l(n),avgTemperature:l(s),avgBloodPressure:u}}let T;function re(e){T=e}function ue(e=30){const t=new Date(y()),a=[];for(let n=e-1;n>=0;n--){const s=new Date(t);s.setDate(s.getDate()-n);const o=s.toISOString().split("T")[0],l=T.sleepLogs.find(u=>u.date===o);l&&a.push(l)}return a}function me(e){const t=new Date(`2000-01-01T${e.bedtime}`);let n=(new Date(`2000-01-01T${e.wakeTime}`).getTime()-t.getTime())/(1e3*60*60);n<0&&(n+=24);const s={...e,id:R(),date:y(),duration:Math.round(n*10)/10};return T.sleepLogs.push(s),b(T),s}function pe(){return T.sleepLogs.length===0?null:T.sleepLogs.sort((e,t)=>new Date(t.date).getTime()-new Date(e.date).getTime())[0]}function ge(e=7){const t=ue(e);if(t.length===0)return{avgDuration:null,avgQuality:null};const a=t.reduce((s,o)=>s+o.duration,0),n=t.reduce((s,o)=>s+o.quality,0);return{avgDuration:Math.round(a/t.length*10)/10,avgQuality:Math.round(n/t.length*10)/10}}let G;function ve(e){G=e}function ye(e=30){return[...G.moodEntries].sort((a,n)=>new Date(n.date).getTime()-new Date(a.date).getTime()).slice(0,e)}function he(e=7){const t=ye(e);if(t.length===0)return null;const a=t.reduce((n,s)=>n+s.mood,0);return Math.round(a/t.length*10)/10}let J;function fe(e){J=e}function be(){return J.settings.hydrationGoal}let v;function we(e){v=e}function Q(){const e=y(),t=v.medicines.filter(n=>ae(n.frequency,n.specificDays)),a=v.medicineLogs.filter(n=>n.date===e);return t.map(n=>{const s=a.find(o=>o.medicineId===n.id);return{medicine:n,log:s}})}function ke(e){const t=y();let a=v.medicineLogs.find(s=>s.medicineId===e&&s.date===t);a?(a.taken=!0,a.takenAt=new Date().toISOString(),a.skipped=!1):(a={medicineId:e,date:t,taken:!0,takenAt:new Date().toISOString()},v.medicineLogs.push(a));const n=v.medicines.find(s=>s.id===e);n&&(n.inventory=Math.max(0,n.inventory-1)),b(v)}function Ee(e){const t=y();let a=v.medicineLogs.find(n=>n.medicineId===e&&n.date===t);a?(a.skipped=!0,a.taken=!1):(a={medicineId:e,date:t,taken:!1,skipped:!0},v.medicineLogs.push(a)),b(v)}function De(e){const t=y(),a=v.medicineLogs.findIndex(n=>n.medicineId===e&&n.date===t);a!==-1&&(v.medicineLogs.splice(a,1),b(v))}function Se(){const e=Q(),t=e.filter(({log:s})=>s==null?void 0:s.taken).length,a=e.length,n=a>0?Math.round(t/a*100):0;return{taken:t,total:a,percentage:n}}let P;function Le(e){P=e}function Ie(){return P.appointments.sort((e,t)=>new Date(e.date+"T"+e.time).getTime()-new Date(t.date+"T"+t.time).getTime())}function Te(){return Ie().filter(e=>!K(e.date))}function $e(e){const t={...e,id:R(),createdAt:new Date().toISOString()};return P.appointments.push(t),b(P),t}function Ae(){const e=Te();return e.length>0?e[0]:null}const Me=document.querySelector("#app");let p={currentMood:0,currentSymptoms:[],isDarkMode:!1};function Be(){const e=f();p.isDarkMode=e.settings.theme==="dark",p.isDarkMode&&document.documentElement.classList.add("dark-mode"),ie(e),re(e),ve(e),fe(e),we(e),Le(e);const t=W();t&&(p.currentMood=t.mood,p.currentSymptoms=[...t.symptoms])}function Oe(){const e=f();e.settings.theme=p.isDarkMode?"dark":"light",b(e)}function g(){ee(),f(),U();const e=V(),t=be(),a=Math.min(e/t*100,100),n=Y(),s=le(),o=pe(),l=Ae(),u=Se(),d=u.percentage,h=ge(7),E=he(7);ce(7);const D=He(n),S=Q(),w=S.filter(({log:i})=>!(i!=null&&i.taken)).sort((i,m)=>i.medicine.time.localeCompare(m.medicine.time))[0],k=n[0],A=new Intl.DateTimeFormat("en-US",{weekday:"long",month:"long",day:"numeric"}).format(new Date),M=se({moodAvg:E,sleepAvg:h.avgQuality,waterIntake:e,medicineAdherence:d}),B=S.map(({medicine:i,log:m})=>`
    <div class="medicine-item ${m!=null&&m.taken?"taken":""}">
      <div class="med-info">
        <strong>${i.name}</strong> <span class="dosage">(${i.dosage})</span>
        <div class="time">🕐 ${N(i.time)}${(w==null?void 0:w.medicine.id)===i.id&&!(m!=null&&m.taken)?" · Next":""}</div>
        ${i.inventory<=5?`<div class="low-stock">⚠️ Low stock: ${i.inventory} left</div>`:""}
      </div>
      <div class="med-actions">
        ${m!=null&&m.taken?`
          <button class="action-btn undo-btn" data-id="${i.id}" title="Undo">↩</button>
        `:`
          <button class="action-btn take-btn" data-id="${i.id}" title="Mark as taken">✓</button>
          <button class="action-btn skip-btn" data-id="${i.id}" title="Skip today">⊘</button>
        `}
        <button class="delete-btn" data-id="${i.id}">🗑</button>
      </div>
    </div>
  `).join(""),O=[{val:1,icon:"😫",label:"Terrible"},{val:2,icon:"😕",label:"Bad"},{val:3,icon:"😐",label:"Okay"},{val:4,icon:"🙂",label:"Good"},{val:5,icon:"😄",label:"Great"}],q=["Headache","Fatigue","Nausea","Pain","Anxiety","Dizziness"],c=W(),r=c?c.notes:"";Me.innerHTML=`
    <div class="container">
      <header class="main-header">
        <div class="brand-lockup">
          <div class="brand-mark">✚</div>
          <div>
            <p class="eyebrow">PERSONAL HEALTH DASHBOARD</p>
            <h1>MediTrack</h1>
            <p class="subtitle">Your complete health companion</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" id="toggle-theme-btn" title="Toggle Dark Mode">
            ${p.isDarkMode?"☀️":"🌙"}
          </button>
          <button class="icon-btn" id="export-data-btn" title="Export Data">💾</button>
          <label class="icon-btn" for="import-file" title="Import Data">📁</label>
          <input type="file" id="import-file" accept=".json" style="display:none" />
        </div>
      </header>

      <div class="date-strip">
        <span class="status-dot"></span>
        <span>${A}</span>
        <span class="date-strip-note">${M}</span>
      </div>

      <section class="welcome-panel">
        <div>
          <p class="eyebrow">GOOD TO SEE YOU</p>
          <h2>Take the day one small step at a time.</h2>
          <p>${w?`Next up: <strong>${w.medicine.name}</strong> at ${N(w.medicine.time)}.`:"Your schedule is clear. Add a medicine when you are ready."}${l?`<br><strong>📅 ${l.title}</strong> with ${l.doctor} on ${new Date(l.date+"T"+l.time).toLocaleDateString()}`:""}</p>
        </div>
        <div class="welcome-orbit" aria-hidden="true"><span>✦</span></div>
      </section>

      <!-- Statistics Card -->
      <section class="card stats-card">
        <div class="section-heading light-heading"><div><p class="eyebrow">AT A GLANCE</p><h2>Today's overview</h2></div><span class="section-kicker">LIVE</span></div>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${d}%</div>
            <div class="stat-label">Medicine Adherence</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${e}ml</div>
            <div class="stat-label">Water Intake</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${h.avgDuration?h.avgDuration+"h":"--"}</div>
            <div class="stat-label">Avg Sleep</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${D} days</div>
            <div class="stat-label">Check-in Streak</div>
          </div>
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="card quick-actions">
        <div class="section-heading"><div><p class="eyebrow">QUICK LOG</p><h2>Record vitals & sleep</h2></div></div>
        <div class="quick-grid">
          <button class="quick-btn" id="show-vitals-btn">❤️ Vitals</button>
          <button class="quick-btn" id="show-sleep-btn">😴 Sleep Log</button>
          <button class="quick-btn" id="show-appointment-btn">📅 Appointment</button>
        </div>
      </section>

      <!-- Water Tracker -->
      <section class="card water-card">
        <div class="section-heading light-heading"><div><p class="eyebrow">BODY RHYTHM</p><h2>Hydration</h2></div><span class="water-icon">◌</span></div>
        <p class="card-intro">Small sips add up. You are ${e>=t?"at your daily goal":`${t-e}ml from your goal`}.</p>
        <div class="water-progress">
          <div class="progress-bar" style="width: ${a}%"></div>
        </div>
        <div class="water-stats">
          <span>${e}ml / ${t}ml</span>
          <span>${Math.round(a)}%</span>
        </div>
        <div class="water-actions"><button class="btn-water secondary-water" id="remove-water-btn" aria-label="Remove 250ml">−</button><button class="btn-water" id="add-water-btn">Add 250ml <span>+</span></button></div>
      </section>

      <!-- Mood & Symptom Journal -->
      <section class="card mood-card">
        <div class="section-heading"><div><p class="eyebrow">MENTAL CHECK-IN</p><h2>How are you feeling?</h2></div><span class="section-icon">☼</span></div>
        <p class="mood-prompt">How are you feeling today?</p>
        <div class="emoji-grid">
          ${O.map(i=>`
            <button class="emoji-btn ${p.currentMood===i.val?"selected":""}" data-mood="${i.val}">
              <span class="emoji-icon">${i.icon}</span>
              <span class="emoji-label">${i.label}</span>
            </button>
          `).join("")}
        </div>

        <p class="mood-prompt">Any symptoms?</p>
        <div class="symptom-grid">
          ${q.map(i=>`
            <button class="symptom-btn ${p.currentSymptoms.includes(i)?"selected":""}" data-symptom="${i}">
              ${i}
            </button>
          `).join("")}
        </div>

        <textarea id="mood-notes" placeholder="Add notes (optional)..." rows="3">${r}</textarea>
        <button class="btn-primary" id="save-mood-btn">Save today's check-in <span>→</span></button>
      </section>

      <!-- Latest Vitals Display -->
      ${s?`
      <section class="card vitals-display">
        <div class="section-heading"><div><p class="eyebrow">LATEST VITALS</p><h2>Your recent readings</h2></div></div>
        <div class="vitals-grid">
          ${s.heartRate?`<div class="vital-item"><span class="vital-label">Heart Rate</span><span class="vital-value">${s.heartRate} bpm</span></div>`:""}
          ${s.bloodPressure?`<div class="vital-item"><span class="vital-label">Blood Pressure</span><span class="vital-value">${s.bloodPressure.systolic}/${s.bloodPressure.diastolic}</span></div>`:""}
          ${s.weight?`<div class="vital-item"><span class="vital-label">Weight</span><span class="vital-value">${s.weight} kg</span></div>`:""}
          ${s.temperature?`<div class="vital-item"><span class="vital-label">Temperature</span><span class="vital-value">${s.temperature}°C</span></div>`:""}
        </div>
      </section>
      `:""}

      <!-- Latest Sleep Display -->
      ${o?`
      <section class="card sleep-display">
        <div class="section-heading"><div><p class="eyebrow">LAST NIGHT'S SLEEP</p><h2>Sleep summary</h2></div></div>
        <div class="sleep-summary">
          <div class="sleep-stat"><span class="sleep-value">${o.duration}h</span><span class="sleep-label">Duration</span></div>
          <div class="sleep-stat"><span class="sleep-value">${"😴".repeat(o.quality)}${"🌑".repeat(5-o.quality)}</span><span class="sleep-label">Quality</span></div>
          <div class="sleep-stat"><span class="sleep-value">${N(o.bedtime)} - ${N(o.wakeTime)}</span><span class="sleep-label">Schedule</span></div>
        </div>
      </section>
      `:""}

      <section class="insight-row">
        <div class="card insight-card">
          <p class="eyebrow">RECENT NOTE</p>
          <h3>${k?`${k.notes||"You checked in today."}`:"Your journal is ready when you are."}</h3>
          <p class="muted-copy">${k?`${k.symptoms.length?k.symptoms.join(" · "):"No symptoms logged"} · Mood ${k.mood}/5`:"A short check-in can help you spot patterns over time."}</p>
        </div>
        <div class="card insight-card accent-insight">
          <p class="eyebrow">TODAY'S FOCUS</p>
          <h3>${u.total===0?"Build your routine":d===100?"Routine complete":`${u.total-u.taken} medicine${u.total-u.taken===1?"":"s"} left`}</h3>
          <p class="muted-copy">${D>1?`${D} days of consistent check-ins.`:"Consistency starts with one action."}</p>
        </div>
      </section>

      <!-- Medicine Section -->
      <section class="card add-med-card">
        <div class="section-heading"><div><p class="eyebrow">YOUR ROUTINE</p><h2>Add a medicine</h2></div><span class="section-icon">＋</span></div>
        <form id="add-med-form">
          <input type="text" id="med-name" placeholder="Medicine Name (e.g., Ibuprofen)" required />
          <input type="text" id="med-dosage" placeholder="Dosage (e.g., 200mg)" required />
          <input type="time" id="med-time" required />
          <select id="med-frequency">
            <option value="daily">Daily</option>
            <option value="weekdays">Weekdays only</option>
            <option value="weekends">Weekends only</option>
            <option value="custom">Custom days</option>
          </select>
          <input type="number" id="med-inventory" placeholder="Pill count" min="0" value="30" />
          <button type="submit" class="btn-primary">Add Medicine</button>
        </form>
      </section>

      <section class="card list-card">
        <div class="section-heading"><div><p class="eyebrow">SCHEDULE</p><h2>Today's medicines</h2></div><span class="progress-pill">${u.taken} / ${u.total} done</span></div>
        <div id="medicine-list">
          ${S.length===0?'<p class="empty-state">No medicines scheduled for today.</p>':B}
        </div>
      </section>
    </div>
    
    <!-- Vitals Modal -->
    <dialog id="vitals-modal" class="modal">
      <div class="modal-content">
        <h3>Record Vitals</h3>
        <form id="vitals-form">
          <label>Heart Rate (bpm)<input type="number" id="vitals-hr" placeholder="e.g., 72" /></label>
          <label>Blood Pressure<input type="text" id="vitals-bp" placeholder="120/80" /></label>
          <label>Weight (kg)<input type="number" id="vitals-weight" step="0.1" placeholder="e.g., 70.5" /></label>
          <label>Temperature (°C)<input type="number" id="vitals-temp" step="0.1" placeholder="e.g., 36.6" /></label>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="close-vitals-btn">Cancel</button>
            <button type="submit" class="btn-primary">Save Vitals</button>
          </div>
        </form>
      </div>
    </dialog>
    
    <!-- Sleep Modal -->
    <dialog id="sleep-modal" class="modal">
      <div class="modal-content">
        <h3>Log Sleep</h3>
        <form id="sleep-form">
          <label>Bedtime<input type="time" id="sleep-bedtime" value="23:00" /></label>
          <label>Wake Time<input type="time" id="sleep-waketime" value="07:00" /></label>
          <label>Sleep Quality (1-5)<input type="range" id="sleep-quality" min="1" max="5" value="3" /><span id="quality-display">3</span></label>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="close-sleep-btn">Cancel</button>
            <button type="submit" class="btn-primary">Save Sleep</button>
          </div>
        </form>
      </div>
    </dialog>
    
    <!-- Appointment Modal -->
    <dialog id="appointment-modal" class="modal">
      <div class="modal-content">
        <h3>Add Appointment</h3>
        <form id="appointment-form">
          <label>Title<input type="text" id="appt-title" placeholder="e.g., Check-up" required /></label>
          <label>Doctor<input type="text" id="appt-doctor" placeholder="Dr. Name" required /></label>
          <label>Date<input type="date" id="appt-date" required /></label>
          <label>Time<input type="time" id="appt-time" required /></label>
          <label>Location<input type="text" id="appt-location" placeholder="Clinic/Hospital" /></label>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="close-appt-btn">Cancel</button>
            <button type="submit" class="btn-primary">Add Appointment</button>
          </div>
        </form>
      </div>
    </dialog>
  `,qe()}function qe(){var s,o,l,u,d,h,E,D,S,w,k,A,M,B,O,q;(s=document.getElementById("toggle-theme-btn"))==null||s.addEventListener("click",()=>{p.isDarkMode=!p.isDarkMode,document.documentElement.classList.toggle("dark-mode"),Oe(),g()}),(o=document.getElementById("export-data-btn"))==null||o.addEventListener("click",Pe),(l=document.getElementById("import-file"))==null||l.addEventListener("change",Re);const e=document.getElementById("add-med-form");e==null||e.addEventListener("submit",c=>{c.preventDefault();const r=document.getElementById("med-frequency").value;X({id:Date.now().toString(),name:document.getElementById("med-name").value,dosage:document.getElementById("med-dosage").value,time:document.getElementById("med-time").value,taken:!1,frequency:r,specificDays:[],inventory:parseInt(document.getElementById("med-inventory").value)||30,createdAt:new Date().toISOString()}),g()}),document.querySelectorAll(".take-btn").forEach(c=>{c.addEventListener("click",r=>{const i=r.currentTarget.dataset.id;ke(i),g()})}),document.querySelectorAll(".skip-btn").forEach(c=>{c.addEventListener("click",r=>{const i=r.currentTarget.dataset.id;Ee(i),g()})}),document.querySelectorAll(".undo-btn").forEach(c=>{c.addEventListener("click",r=>{const i=r.currentTarget.dataset.id;De(i),g()})}),document.querySelectorAll(".delete-btn").forEach(c=>{c.addEventListener("click",r=>{const i=r.currentTarget.dataset.id;confirm("Delete this medicine?")&&(Z(i),g())})}),(u=document.getElementById("add-water-btn"))==null||u.addEventListener("click",()=>{C(250),g()}),(d=document.getElementById("remove-water-btn"))==null||d.addEventListener("click",()=>{V()>0&&(C(-250),g())}),document.querySelectorAll(".emoji-btn").forEach(c=>{c.addEventListener("click",r=>{const i=parseInt(r.currentTarget.dataset.mood);p.currentMood=i,xe()})}),document.querySelectorAll(".symptom-btn").forEach(c=>{c.addEventListener("click",r=>{const i=r.currentTarget.dataset.symptom;p.currentSymptoms.includes(i)?p.currentSymptoms=p.currentSymptoms.filter(m=>m!==i):p.currentSymptoms.push(i),Ne()})}),(h=document.getElementById("save-mood-btn"))==null||h.addEventListener("click",()=>{if(p.currentMood===0){alert("Please select how you're feeling first!");return}const c=document.getElementById("mood-notes").value,r=new Date().toISOString().split("T")[0];te({id:Date.now().toString(),date:r,mood:p.currentMood,symptoms:p.currentSymptoms,notes:c,createdAt:new Date().toISOString()}),alert("Check-in saved! 🎉"),g()});const t=document.getElementById("vitals-modal"),a=document.getElementById("sleep-modal"),n=document.getElementById("appointment-modal");(E=document.getElementById("show-vitals-btn"))==null||E.addEventListener("click",()=>{t==null||t.showModal()}),(D=document.getElementById("close-vitals-btn"))==null||D.addEventListener("click",()=>{t==null||t.close()}),(S=document.getElementById("vitals-form"))==null||S.addEventListener("submit",c=>{c.preventDefault();const r=document.getElementById("vitals-hr").value,i=document.getElementById("vitals-bp").value,m=document.getElementById("vitals-weight").value,L=document.getElementById("vitals-temp").value;let $;if(i&&i.includes("/")){const[_,F]=i.split("/").map(Number);$={systolic:_,diastolic:F}}de({heartRate:r?Number(r):void 0,bloodPressure:$,weight:m?Number(m):void 0,temperature:L?Number(L):void 0}),t==null||t.close(),g()}),(w=document.getElementById("show-sleep-btn"))==null||w.addEventListener("click",()=>{a==null||a.showModal()}),(k=document.getElementById("close-sleep-btn"))==null||k.addEventListener("click",()=>{a==null||a.close()}),(A=document.getElementById("sleep-quality"))==null||A.addEventListener("input",c=>{const r=c.target.value;document.getElementById("quality-display").textContent=r}),(M=document.getElementById("sleep-form"))==null||M.addEventListener("submit",c=>{c.preventDefault();const r=document.getElementById("sleep-bedtime").value,i=document.getElementById("sleep-waketime").value,m=parseInt(document.getElementById("sleep-quality").value),L=new Date(`2000-01-01T${r}`);(new Date(`2000-01-01T${i}`).getTime()-L.getTime())/(1e3*60*60),me({bedtime:r,wakeTime:i,quality:m}),a==null||a.close(),g()}),(B=document.getElementById("show-appointment-btn"))==null||B.addEventListener("click",()=>{n==null||n.showModal()}),(O=document.getElementById("close-appt-btn"))==null||O.addEventListener("click",()=>{n==null||n.close()}),(q=document.getElementById("appointment-form"))==null||q.addEventListener("submit",c=>{c.preventDefault();const r=document.getElementById("appt-title").value,i=document.getElementById("appt-doctor").value,m=document.getElementById("appt-date").value,L=document.getElementById("appt-time").value,$=document.getElementById("appt-location").value;$e({title:r,doctor:i,date:m,time:L,location:$,completed:!1}),n==null||n.close(),g()})}function xe(){document.querySelectorAll(".emoji-btn").forEach(e=>{const t=parseInt(e.getAttribute("data-mood"));e.classList.toggle("selected",t===p.currentMood)})}function Ne(){document.querySelectorAll(".symptom-btn").forEach(e=>{const t=e.getAttribute("data-symptom");e.classList.toggle("selected",p.currentSymptoms.includes(t))})}function He(e){if(e.length===0)return 0;let t=0;const a=new Date;for(let n=0;n<e.length;n++){const s=new Date(e[n].date);if(Math.floor((a.getTime()-s.getTime())/(1e3*60*60*24))===n)t++;else break}return t}function Pe(){const e={medicines:U(),moodEntries:Y(),water:localStorage.getItem("meditrack_water"),exportDate:new Date().toISOString()},t=new Blob([JSON.stringify(e,null,2)],{type:"application/json"}),a=URL.createObjectURL(t),n=document.createElement("a");n.href=a,n.download=`meditrack-backup-${new Date().toISOString().split("T")[0]}.json`,n.click(),URL.revokeObjectURL(a)}function Re(e){var n;const t=(n=e.target.files)==null?void 0:n[0];if(!t)return;const a=new FileReader;a.onload=s=>{var o;try{const l=JSON.parse((o=s.target)==null?void 0:o.result);l.medicines&&localStorage.setItem("meditrack_medicines",JSON.stringify(l.medicines)),l.moodEntries&&localStorage.setItem("meditrack_mood",JSON.stringify(l.moodEntries)),l.water&&localStorage.setItem("meditrack_water",l.water),alert("Data imported successfully! 🎉"),g()}catch{alert("Error importing data. Please check the file format.")}},a.readAsText(t)}Be();g();
