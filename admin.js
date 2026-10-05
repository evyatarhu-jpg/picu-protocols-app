const cfg = window.PICU_ANALYTICS_CONFIG || {};
const client = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

const TRACKING_START_UTC = "2026-09-30T21:00:00.000Z"; // 01.10.2026 00:00 Israel
const TRACKING_START_MONTH = "2026-10";
const TZ = "Asia/Jerusalem";

const protocolNames = {
  dka:"DKA",
  anticoagulation:"טרומבוליזה ואנטיקואגולציה",
  warfarin:"קומדין / Warfarin",
  bivalirudin:"Bivalirudin / Angiomax",
  bleeding:"דימום לאחר ניתוח לב",
  feeding:"הזנה אנטרלית",
  chylothorax:"כילותורקס",
  "air-embolism":"תסחיף אוויר מוחי",
  delirium:"דליריום",
  pain:"טיפול בכאב",
  "burn-pain":"כאב בכוויות"
};

const issueLabels = {
  content:"תוכן",
  dose:"מינון/נתון",
  source:"מסמך מקור",
  navigation:"ניווט/חיפוש",
  display:"תצוגה",
  other:"אחר"
};

const issueOrder = ["content","dose","source","navigation","display","other"];

const protocolPalette = [
  "#1565c0","#7b1fa2","#2e7d32","#ef6c00","#c62828","#00838f",
  "#5d4037","#3949ab","#6a1b9a","#0277bd","#558b2f","#ad1457"
];

let allRows = [];
let charts = {};
let selectedPeriodKey = null;

const $ = id => document.getElementById(id);
const uniq = arr => new Set(arr.filter(Boolean)).size;

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function shortDevice(id){
  return id ? "מכשיר " + id.replace(/-/g,"").slice(0,6).toUpperCase() : "—";
}

function countBy(rows,key,filterFn=()=>true){
  const out={};
  rows.filter(filterFn).forEach(r=>{
    const v=r[key]||"לא ידוע";
    out[v]=(out[v]||0)+1;
  });
  return out;
}

function sortedEntries(obj){
  return Object.entries(obj).sort((a,b)=>b[1]-a[1]);
}

function destroyChart(name){
  if(charts[name]) charts[name].destroy();
}

function drawLineChart(name,labels,data,label){
  destroyChart(name);
  charts[name]=new Chart($(name),{
    type:"line",
    data:{labels,datasets:[{
      label,
      data,
      tension:.25,
      fill:false
    }]},
    options:{
      responsive:true,
      plugins:{legend:{display:true}},
      scales:{
        y:{beginAtZero:true,ticks:{precision:0}},
        x:{ticks:{autoSkip:false,maxRotation:45,minRotation:0}}
      }
    }
  });
}

function drawBarChart(name,labels,data,label,backgroundColor=null){
  destroyChart(name);
  charts[name]=new Chart($(name),{
    type:"bar",
    data:{labels,datasets:[{
      label,
      data,
      backgroundColor:backgroundColor || undefined,
      borderWidth:0
    }]},
    options:{
      responsive:true,
      plugins:{legend:{display:false}},
      scales:{
        y:{beginAtZero:true,ticks:{precision:0}},
        x:{ticks:{autoSkip:false,maxRotation:45,minRotation:0}}
      }
    }
  });
}

function israelParts(dateLike,withHour=false){
  const options={timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"};
  if(withHour) options.hour="2-digit";
  const parts=new Intl.DateTimeFormat("en-CA",options).formatToParts(new Date(dateLike));
  const o={};
  parts.forEach(p=>o[p.type]=p.value);
  const result={year:+o.year,month:+o.month,day:+o.day};
  if(withHour) result.hour=Number(o.hour)%24;
  return result;
}

function localDate(p){
  return new Date(Date.UTC(p.year,p.month-1,p.day));
}

function monthKey(r){
  const p=israelParts(r.created_at);
  return `${p.year}-${String(p.month).padStart(2,"0")}`;
}

function monthLabel(k){
  const [y,m]=k.split("-").map(Number);
  return new Intl.DateTimeFormat("he-IL",{month:"long",year:"numeric",timeZone:"UTC"})
    .format(new Date(Date.UTC(y,m-1,1)));
}

function addMonthsToKey(key,delta){
  const [y,m]=key.split("-").map(Number);
  const d=new Date(Date.UTC(y,m-1+delta,1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`;
}

function compareMonthKeys(a,b){
  return a.localeCompare(b);
}

function monthRange(startKey,endKey){
  const out=[];
  let k=startKey;
  while(compareMonthKeys(k,endKey)<=0){
    out.push(k);
    k=addMonthsToKey(k,1);
  }
  return out;
}

function currentMonthKey(){
  const p=israelParts(new Date().toISOString());
  return `${p.year}-${String(p.month).padStart(2,"0")}`;
}

function weekKey(r){
  const d=localDate(israelParts(r.created_at));
  const day=(d.getUTCDay()+6)%7; // Monday=0
  const monday=new Date(d);
  monday.setUTCDate(d.getUTCDate()-day);
  return monday.toISOString().slice(0,10);
}

function fmtDay(d){
  return new Intl.DateTimeFormat("he-IL",{
    day:"2-digit",month:"2-digit",year:"numeric",timeZone:"UTC"
  }).format(d);
}

function weekLabel(k){
  const s=new Date(k+"T00:00:00Z");
  const e=new Date(s);
  e.setUTCDate(e.getUTCDate()+6);
  return `${fmtDay(s)}–${fmtDay(e)}`;
}

function periodKey(r,mode){
  return mode==="week" ? weekKey(r) : monthKey(r);
}

function periodLabel(k,mode){
  return mode==="week" ? weekLabel(k) : monthLabel(k);
}

function summarize(rows){
  return {
    active:uniq(rows.map(r=>r.installation_id)),
    visits:uniq(rows.map(r=>r.session_id)),
    protocolOpens:rows.filter(r=>r.event_type==="protocol_open").length,
    issues:rows.filter(r=>r.event_type==="issue_report").length
  };
}

function groups(mode){
  const g={};
  allRows.forEach(r=>{
    const k=periodKey(r,mode);
    (g[k]||=[]).push(r);
  });
  return Object.entries(g).sort((a,b)=>a[0].localeCompare(b[0]));
}

function renderKPIs(){
  $("mActive").textContent=uniq(allRows.map(r=>r.installation_id));
  $("mVisits").textContent=uniq(allRows.map(r=>r.session_id));
  $("mProtocols").textContent=allRows.filter(r=>r.event_type==="protocol_open").length;
  $("mIssues").textContent=allRows.filter(r=>r.event_type==="issue_report").length;
}

function renderOverview(){
  const protocols=sortedEntries(countBy(
    allRows,
    "protocol_slug",
    r=>r.event_type==="protocol_open"&&r.protocol_slug
  ));

  drawBarChart(
    "protocolChart",
    protocols.map(x=>protocolNames[x[0]]||x[0]),
    protocols.map(x=>x[1]),
    "פתיחות",
    protocols.map((_,i)=>protocolPalette[i%protocolPalette.length])
  );


  const issueCounts=countBy(allRows,"issue_category",r=>r.event_type==="issue_report");
  drawBarChart(
    "issueChart",
    issueOrder.map(k=>issueLabels[k]),
    issueOrder.map(k=>issueCounts[k]||0),
    "מספר דיווחים"
  );
}

function renderPeriods(){
  const mode=$("periodMode").value;
  const g=groups(mode);
  $("trendModeLabel").textContent=mode==="week"?"שבועי":"חודשי";

  $("periodTable").innerHTML=g.length
    ? g.map(([k,rows])=>{
        const s=summarize(rows);
        return `<tr class="period-row ${k===selectedPeriodKey?"selected":""}" data-key="${esc(k)}">
          <td><strong>${esc(periodLabel(k,mode))}</strong></td>
          <td>${s.active}</td>
          <td>${s.visits}</td>
          <td>${s.protocolOpens}</td>
          <td>${s.issues}</td>
        </tr>`;
      }).join("")
    : '<tr><td colspan="6">אין עדיין נתונים.</td></tr>';

  let trendKeys=[];
  let trendValues=[];

  if(mode==="month"){
    const groupMap=Object.fromEntries(g);
    const latestDataKey=g.length ? g[g.length-1][0] : TRACKING_START_MONTH;
    const futureEnd=addMonthsToKey(currentMonthKey(),5);
    const endKey=compareMonthKeys(latestDataKey,futureEnd)>0 ? latestDataKey : futureEnd;
    trendKeys=monthRange(TRACKING_START_MONTH,endKey);
    trendValues=trendKeys.map(k=>summarize(groupMap[k]||[]).active);
  } else {
    trendKeys=g.map(([k])=>k);
    trendValues=g.map(([,rows])=>summarize(rows).active);
  }

  drawBarChart(
    "trendChart",
    trendKeys.map(k=>periodLabel(k,mode)),
    trendValues,
    "מכשירים/התקנות ייחודיים"
  );

  document.querySelectorAll(".period-row").forEach(tr=>{
    tr.addEventListener("click",()=>{
      selectedPeriodKey=tr.dataset.key;
      renderPeriods();
      renderSelected();
    });
  });

  if(!selectedPeriodKey&&g.length){
    selectedPeriodKey=g[g.length-1][0];
    renderPeriods();
    renderSelected();
    return;
  }

  if(selectedPeriodKey&&!g.some(([k])=>k===selectedPeriodKey)&&g.length){
    selectedPeriodKey=g[g.length-1][0];
    renderPeriods();
    renderSelected();
  }
}

function selectedRows(){
  const mode=$("periodMode").value;
  return selectedPeriodKey
    ? allRows.filter(r=>periodKey(r,mode)===selectedPeriodKey)
    : [];
}

function renderDaypartChart(rows){
  const appOpenRows=rows.filter(r=>r.event_type==="app_open");
  const buckets={
    morning:{label:"בוקר 07:00–15:00",visits:new Set(),opens:0},
    evening:{label:"ערב 15:00–23:00",visits:new Set(),opens:0},
    night:{label:"לילה 23:00–07:00",visits:new Set(),opens:0}
  };

  appOpenRows.forEach(r=>{
    const hour=israelParts(r.created_at,true).hour;
    const key=(hour>=7&&hour<15)?"morning":((hour>=15&&hour<23)?"evening":"night");
    const b=buckets[key];
    b.opens++;
    if(r.session_id) b.visits.add(r.session_id);
  });

  const ordered=[buckets.morning,buckets.evening,buckets.night];
  drawBarChart(
    "daypartChart",
    ordered.map(b=>b.label),
    ordered.map(b=>b.visits.size || b.opens),
    "מספר ביקורים"
  );
}
function renderSelected(){
  const mode=$("periodMode").value;
  const label=selectedPeriodKey?periodLabel(selectedPeriodKey,mode):"—";
  ["selectedPeriodA","selectedPeriodB","selectedPeriodC","selectedPeriodD"].forEach(id=>$(id).textContent=label);

  const rows=selectedRows();

  const protocols=sortedEntries(countBy(
    rows,
    "protocol_slug",
    r=>r.event_type==="protocol_open"&&r.protocol_slug
  ));

  $("selectedProtocolTable").innerHTML=protocols.length
    ? protocols.map(([slug,n])=>`<tr><td>${esc(protocolNames[slug]||slug)}</td><td><strong>${n}</strong></td></tr>`).join("")
    : '<tr><td colspan="2">אין פתיחות פרוטוקולים בתקופה זו.</td></tr>';

  const byDevice={};
  rows.forEach(r=>{
    if(!r.installation_id) return;
    const d=byDevice[r.installation_id]||={visits:new Set(),protocols:0,last:null};
    if(r.session_id) d.visits.add(r.session_id);
    if(r.event_type==="protocol_open") d.protocols++;
    if(!d.last||r.created_at>d.last) d.last=r.created_at;
  });

  const devices=Object.entries(byDevice)
    .sort((a,b)=>(b[1].last||"").localeCompare(a[1].last||""));

  $("deviceTable").innerHTML=devices.length
    ? devices.map(([id,d])=>`<tr>
        <td>${esc(shortDevice(id))}</td>
        <td>${d.visits.size}</td>
        <td>${d.protocols}</td>
        <td>${d.last?new Date(d.last).toLocaleString("he-IL",{timeZone:TZ}):"—"}</td>
      </tr>`).join("")
    : '<tr><td colspan="4">אין נתונים.</td></tr>';

  renderDaypartChart(rows);

  const opens=rows
    .filter(r=>r.event_type==="protocol_open")
    .sort((a,b)=>b.created_at.localeCompare(a.created_at));

  $("openLogTable").innerHTML=opens.length
    ? opens.map(r=>`<tr>
        <td>${new Date(r.created_at).toLocaleString("he-IL",{timeZone:TZ})}</td>
        <td>${esc(protocolNames[r.protocol_slug]||r.protocol_slug||"")}</td>
        <td>${esc(shortDevice(r.installation_id))}</td>
      </tr>`).join("")
    : '<tr><td colspan="3">אין פתיחות פרוטוקולים בתקופה זו.</td></tr>';
}

function renderIssues(){
  const rows=allRows
    .filter(r=>r.event_type==="issue_report")
    .sort((a,b)=>b.created_at.localeCompare(a.created_at))
    .slice(0,50);

  $("issuesTable").innerHTML=rows.length
    ? rows.map(r=>`<tr>
        <td>${new Date(r.created_at).toLocaleString("he-IL",{timeZone:TZ})}</td>
        <td>${esc(protocolNames[r.protocol_slug]||r.protocol_slug||"")}</td>
        <td><span class="badge">${esc(issueLabels[r.issue_category]||r.issue_category||"")}</span></td>
        <td>${esc(r.issue_text||"—")}</td>
      </tr>`).join("")
    : '<tr><td colspan="4">אין דיווחים.</td></tr>';
}

async function loadDashboard(){
  const {data,error}=await client
    .from("analytics_events")
    .select("*")
    .gte("created_at",TRACKING_START_UTC)
    .order("created_at",{ascending:true});

  if(error){
    alert("אין הרשאה לנתוני הדשבורד או שהחיבור עדיין לא הוגדר.");
    console.error(error);
    return;
  }

  allRows=data||[];
  renderKPIs();
  renderOverview();
  selectedPeriodKey=null;
  renderPeriods();
  renderIssues();
}

async function showAuthState(){
  const {data:{session}}=await client.auth.getSession();
  $("loginBox").classList.toggle("hidden",!!session);
  $("dashboard").classList.toggle("hidden",!session);
  if(session) loadDashboard();
}

$("loginBtn").addEventListener("click",async()=>{
  const email=$("adminEmail").value.trim();
  const password=$("adminPassword").value;
  if(!email||!password){
    $("loginMsg").querySelector("small").textContent="יש להזין מייל וסיסמה.";
    return;
  }
  const {error}=await client.auth.signInWithPassword({email,password});
  $("loginMsg").querySelector("small").textContent=error?("שגיאה: "+error.message):"הכניסה הצליחה.";
});

$("logoutBtn").addEventListener("click",async()=>{
  await client.auth.signOut();
  location.reload();
});

$("refreshBtn").addEventListener("click",loadDashboard);

$("periodMode").addEventListener("change",()=>{
  selectedPeriodKey=null;
  renderPeriods();
});

client.auth.onAuthStateChange(()=>showAuthState());
showAuthState();
