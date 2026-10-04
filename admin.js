const cfg = window.PICU_ANALYTICS_CONFIG || {};
const client = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

const protocolNames = {
  dka:"DKA", anticoagulation:"טרומבוליזה ואנטיקואגולציה", warfarin:"קומדין / Warfarin",
  bivalirudin:"Bivalirudin / Angiomax", bleeding:"דימום לאחר ניתוח לב",
  feeding:"הזנה אנטרלית", chylothorax:"כילותורקס", "air-embolism":"תסחיף אוויר מוחי",
  delirium:"דליריום", pain:"טיפול בכאב", "burn-pain":"כאב בכוויות"
};

let charts = {};
const uniq = arr => new Set(arr.filter(Boolean)).size;
function countBy(rows,key,filterFn=()=>true){const out={};rows.filter(filterFn).forEach(r=>{const v=r[key]||"לא ידוע";out[v]=(out[v]||0)+1});return out}
function entries(obj){return Object.entries(obj).sort((a,b)=>b[1]-a[1])}
function chart(name,type,labels,data,label){
  if(charts[name]) charts[name].destroy();
  charts[name]=new Chart(document.getElementById(name),{
    type,data:{labels,datasets:[{label,data}]},
    options:{responsive:true,plugins:{legend:{display:type!=="bar"}},scales:type==="bar"?{y:{beginAtZero:true,ticks:{precision:0}}}:{}}
  });
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

async function loadDashboard(){
  const days=Number(document.getElementById("range").value);
  const start=new Date(Date.now()-days*86400000).toISOString();
  const {data,error}=await client.from("analytics_events").select("*").gte("created_at",start).order("created_at",{ascending:true});
  if(error){alert("אין הרשאה לנתונים או שהחיבור עדיין לא הוגדר.");console.error(error);return}
  const rows=data||[];
  mActive.textContent=uniq(rows.map(r=>r.installation_id));
  mSessions.textContent=uniq(rows.map(r=>r.session_id));
  mProtocols.textContent=rows.filter(r=>r.event_type==="protocol_open").length;
  mIssues.textContent=rows.filter(r=>r.event_type==="issue_report").length;

  const dayMap={};
  rows.forEach(r=>{const d=r.created_at.slice(0,10);dayMap[d] ||= new Set();dayMap[d].add(r.installation_id)});
  const dayEntries=Object.entries(dayMap).sort((a,b)=>a[0].localeCompare(b[0]));
  chart("trendChart","line",dayEntries.map(x=>x[0]),dayEntries.map(x=>x[1].size),"מכשירים פעילים");

  const protocols=entries(countBy(rows,"protocol_slug",r=>r.event_type==="protocol_open"&&r.protocol_slug));
  chart("protocolChart","bar",protocols.map(x=>protocolNames[x[0]]||x[0]),protocols.map(x=>x[1]),"פתיחות");

  const searches=rows.filter(r=>r.event_type==="search");
  const searchData={
    "הקלדה":searches.filter(r=>r.search_mode==="typed").length,
    "קול":searches.filter(r=>r.search_mode==="voice").length,
    "ללא תוצאה":searches.filter(r=>r.search_term_group==="no-result").length
  };
  chart("searchChart","doughnut",Object.keys(searchData),Object.values(searchData),"חיפושים");

  const issueLabels={content:"תוכן",dose:"מינון/נתון",source:"מסמך מקור",navigation:"ניווט/חיפוש",display:"תצוגה",other:"אחר"};
  const issues=entries(countBy(rows,"issue_category",r=>r.event_type==="issue_report"));
  chart("issueChart","bar",issues.map(x=>issueLabels[x[0]]||x[0]),issues.map(x=>x[1]),"דיווחים");

  const recent=rows.filter(r=>r.event_type==="issue_report").sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,50);
  issuesTable.innerHTML=recent.length?recent.map(r=>`<tr><td>${new Date(r.created_at).toLocaleString("he-IL")}</td><td>${protocolNames[r.protocol_slug]||r.protocol_slug||""}</td><td><span class="badge">${issueLabels[r.issue_category]||r.issue_category||""}</span></td><td>${esc(r.issue_text||"—")}</td></tr>`).join(""):'<tr><td colspan="4">אין דיווחים בתקופה שנבחרה.</td></tr>';
}

async function showAuthState(){
  const {data:{session}}=await client.auth.getSession();
  loginBox.classList.toggle("hidden",!!session);
  dashboard.classList.toggle("hidden",!session);
  if(session) loadDashboard();
}

loginBtn.addEventListener("click",async()=>{
  const email=document.getElementById("email").value.trim();
  if(!email)return;
  const password=document.getElementById("adminPassword").value;
  if(!email || !password){
    loginMsg.querySelector("small").textContent="יש להזין מייל וסיסמה.";
    return;
  }
  const {error}=await client.auth.signInWithPassword({email,password});
  loginMsg.querySelector("small").textContent=error?("שגיאה: " + error.message):"הכניסה הצליחה.";
});
logoutBtn.addEventListener("click",async()=>{await client.auth.signOut();location.reload()});
refreshBtn.addEventListener("click",loadDashboard);
range.addEventListener("change",loadDashboard);
client.auth.onAuthStateChange(()=>showAuthState());
showAuthState();
