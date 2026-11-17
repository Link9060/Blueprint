import {teams,groups,channels,workspace,save,reset,progress} from "./data.js";
import {configured,getUser,googleSignIn,signOut,membership,requestMembership,liveWorkspace,addLiveTask,setLiveTaskStatus,addLiveLog,sendLiveMessage} from "./supabase.js";

const app=document.getElementById("app");
const state={team:sessionStorage.getItem("blueprint-selected-team")||null,view:"overview",filter:"all",channel:"general",modal:null,menu:false,mode:configured()?"live":"demo",user:null,member:null,data:null,loading:false,error:""};
const glyphs={
 overview:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 tasks:'<path d="M9 5h12M9 12h12M9 19h12"/><path d="m3 5 1.3 1.3L6.5 4M3 12l1.3 1.3L6.5 11M3 19l1.3 1.3L6.5 18"/>',
 logs:'<path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5h-4"/><path d="M16 3v5h5M7 13h10M7 17h7"/>',
 projects:'<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
 messages:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 1 1 16.1-4z"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
 people:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.1l2-1.6-2-3.5-2.4.8a7 7 0 0 0-1.8-1L14.3 3h-4.6L9.3 5.6a7 7 0 0 0-1.8 1l-2.4-.8-2 3.5 2 1.6a7 7 0 0 0 0 2.2l-2 1.6 2 3.5 2.4-.8a7 7 0 0 0 1.8 1l.4 2.6h4.6l.4-2.6a7 7 0 0 0 1.8-1l2.4.8 2-3.5-2-1.6A7 7 0 0 0 19 12z"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 close:'<path d="M5 5l14 14M19 5 5 19"/>',
 logout:'<path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M13 16l4-4-4-4M7 12h10"/>',
 check:'<path d="m4 12 5 5L20 6"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
 pencil:'<path d="m3 17 1 4 4-1L20 8a2.2 2.2 0 0 0-4-4L3 17zM13 7l4 4"/>',
 chevron:'<path d="m6 9 6 6 6-6"/>'
};
function icon(name,size=17){return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(glyphs[name]||glyphs.info)+'</svg>';}
function e(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function a(view,label,ico){return '<button type="button" data-view="'+view+'" class="'+(state.view===view?"active":"")+'"><span class="nav-icon">'+icon(ico)+'</span>'+label+'</button>';}
function button(text,action,kind=""){return '<button class="btn '+kind+'" type="button" data-action="'+action+'">'+text+'</button>';}
function currentTeam(){return teams.find(t=>t.id===state.team)||teams[0];}
function initials(name){return String(name||"").split(/\s+/).map(x=>x[0]||"").join("").slice(0,2).toUpperCase();}
function statusName(status){return ({done:"Complete",in_progress:"In progress",todo:"To do",blocked:"Blocked"})[status]||"To do";}
function pill(status){return '<span class="pill '+(status==="done"?"complete":status==="in_progress"?"active":status==="blocked"?"blocked":"")+'">'+statusName(status)+'</span>';}
function notice(message){return '<div class="notice">'+icon("info",15)+'<span>'+message+'</span></div>';}
function sampleNote(){return state.mode==="demo"?notice('<b>Preview workspace.</b> Names, tasks and activity shown here are fictional sample data. Changes are saved locally in this browser only.'):"";}
function heading(eyebrow,title,description,extra=""){return '<header class="page-heading"><div><span class="eyebrow">'+e(eyebrow)+'</span><h1>'+e(title)+'</h1><p>'+e(description)+'</p></div><div class="actions">'+extra+'</div></header>';}
function section(title,action="",content=""){return '<section class="card pad"><div class="section-heading"><h2>'+e(title)+'</h2>'+action+'</div>'+content+'</section>';}
function taskLine(t){
 return '<div class="task"><button class="task-check '+(t.status==="done"?"done":"")+'" data-toggle="'+e(t.id)+'" aria-label="Toggle '+e(t.title)+'"></button><div class="task-body"><b class="'+(t.status==="done"?"strike":"")+'">'+e(t.title)+'</b><small>'+e(t.subgroup)+' · '+e(t.due)+'</small></div>'+pill(t.status)+'</div>';
}
function renderOverview(){
 const d=state.data;
 const open=d.tasks.filter(t=>t.status!=="done").length,done=d.tasks.filter(t=>t.status==="done").length;
 const stats=[["Open tasks",open,"Across all subgroups","tasks"],["Active projects",d.projects.length,"Robot development","projects"],["Log entries",d.logs.length,"Development records","logs"],["Upcoming events",d.events.length,"On the calendar","calendar"]];
 const statHtml=stats.map(s=>'<div class="card stat"><div class="stat-label">'+s[0]+'<em>'+icon(s[3],16)+'</em></div><div class="stat-num">'+s[1]+'</div><small>'+s[2]+'</small></div>').join("");
 const upcoming=d.tasks.filter(t=>t.status!=="done").slice(0,4).map(taskLine).join("")||'<div class="empty">Nothing assigned right now.</div>';
 const updates=d.logs.slice(0,4).map(l=>'<div class="feed"><span class="feed-icon">'+icon("pencil",15)+'</span><div class="feed-text"><b>'+e(l.title)+'</b><p>'+e(l.subgroup)+' · '+e(l.body)+'</p></div><small class="feed-time">'+e(l.time)+'</small></div>').join("")||'<div class="empty">No build entries yet.</div>';
 const p=progress(d);
 return heading("TEAM WORKSPACE","A clearer way to build.","Your projects, people, and progress in one place.",'<span class="demo-label">'+(state.mode==="demo"?"DEMO WORKSPACE":"CONNECTED WORKSPACE")+'</span>')+sampleNote()+'<div class="stats">'+statHtml+'</div><div class="columns"><div class="column-stack">'+section("Your team's priorities",'<button data-view="tasks">View all tasks →</button>',upcoming)+section("Latest build activity",'<button data-view="logs">Open build log →</button>',updates)+'</div><div class="column-stack">'+section("Season progress","",'<div class="progress-head"><b>Task completion</b><span>'+p+'%</span></div><div class="track"><i style="width:'+p+'%"></i></div><p class="hint">'+done+' completed · '+open+' remaining. Keep the next handoff visible.</p>')+section("Coming up",'<button data-view="calendar">Full schedule →</button>',d.events.slice(0,3).map(x=>'<div class="feed"><div class="feed-icon">'+icon("calendar",15)+'</div><div class="feed-text"><b>'+e(x.title)+'</b><p>'+e(x.details)+'</p></div></div>').join("")||'<div class="empty">No upcoming events.</div>')+section("Blueprint brief","",'<div class="hint">The nightly review engine will summarize approved changes, current blockers and next steps once the live backend is configured. No AI summaries are being sent from this preview.</div>')+'</div></div>';
}
function renderTasks(){
 const tasks=state.data.tasks.filter(t=>state.filter==="all"||t.status===state.filter);
 const allowed=canEdit();
 return heading("PROJECT COORDINATION","Tasks & assignments","Keep handoffs, deadlines and progress visible.",allowed?button(icon("plus",15)+" New task","new-task","primary"):"")+sampleNote()+'<div class="filter-row">'+[["all","All tasks"],["todo","To do"],["in_progress","In progress"],["blocked","Blocked"],["done","Complete"]].map(x=>'<button class="filter '+(state.filter===x[0]?"active":"")+'" data-filter="'+x[0]+'">'+x[1]+'</button>').join("")+'</div><div>'+tasks.map(t=>'<div class="card entry"><button data-toggle="'+e(t.id)+'" aria-label="Toggle '+e(t.title)+'" class="task-check '+(t.status==="done"?"done":"")+'"></button><div class="entry-main"><b>'+e(t.title)+'</b><small>'+e(t.subgroup)+' · Due '+e(t.due)+' · '+e(t.priority)+' priority</small></div>'+pill(t.status)+'</div>').join("")+'</div>'+(tasks.length?"":'<div class="empty">No tasks match this filter.</div>');
}
function renderLogs(){
 const entries=state.data.logs.map(l=>'<article class="log"><h3>'+e(l.title)+'</h3><p>'+e(l.body)+'</p><small>'+e(l.subgroup)+' · '+e(l.author)+' · '+e(l.time)+'</small></article>').join("");
 return heading("ENGINEERING HISTORY","Build log","Keep a reliable record of what changed, why it changed, and what comes next.",canEdit()?button(icon("plus",15)+" Add entry","new-log","primary"):"")+sampleNote()+section("Recent changes","",'<div class="timeline">'+(entries||'<div class="empty">No updates yet.</div>')+'</div>');
}
function renderProjects(){
 const cards=state.data.projects.map(p=>'<article class="card project"><div class="project-icon">'+e(p.icon)+'</div><h3>'+e(p.name)+'</h3><p>'+e(p.description)+'</p><div class="project-foot"><small>'+e(p.lead)+' · '+Number(p.progress||0)+'% progress</small><div class="track"><i style="width:'+Math.max(0,Math.min(100,Number(p.progress)||0))+'%"></i></div></div></article>').join("");
 return heading("THE ROBOT","Projects & subsystems","Every mechanism and development effort in view.")+sampleNote()+'<div class="grid-three">'+(cards||'<div class="empty">No projects added yet.</div>')+'</div>';
}
function renderPeople(){
 const cards=state.data.people.map(p=>'<article class="card person"><div class="avatar">'+e(p.initials||initials(p.name))+'</div><div><h3>'+e(p.name)+'</h3><small>'+e(p.role)+' · '+e(p.group)+'</small></div></article>').join("");
 return heading("PEOPLE & ROLES","Team directory","Find the right person or subgroup for the next step.")+sampleNote()+'<div class="people">'+(cards||'<div class="empty">The directory will populate when members join.</div>')+'</div>';
}
function renderCalendar(){
 const cards=state.data.events.map(ev=>'<div class="card event"><div class="event-date"><b>'+e(ev.day)+'</b><small>'+e(ev.month)+'</small></div><div class="event-info"><b>'+e(ev.title)+'</b><small>'+e(ev.details)+'</small></div><span class="pill">'+e(ev.type)+'</span></div>').join("");
 return heading("LOOKING AHEAD","Schedule","Important meetings and milestones, in one place.")+sampleNote()+'<div class="events">'+(cards||'<div class="empty">There are no scheduled events yet.</div>')+'</div>';
}
function renderMessages(){
 const messages=(state.data.messages[state.channel]||[]).map(m=>'<div class="message"><div class="avatar">'+e(m.initials||initials(m.author))+'</div><div><b>'+e(m.author)+'</b><small>'+e(m.time)+'</small><p>'+e(m.text)+'</p></div></div>').join("");
 return heading("CONVERSATIONS","Team messages","Subgroup channels for clear, purposeful coordination.")+sampleNote()+'<div class="card chat"><aside class="channels"><h3>CHANNELS</h3>'+channels.map(c=>'<button class="channel '+(state.channel===c?"active":"")+'" data-channel="'+c+'"># '+e(c)+'</button>').join("")+'</aside><section class="conversation"><div class="chat-head"><b># '+e(state.channel)+'</b><small>Team '+e(state.team)+' · '+(state.mode==="demo"?"Local preview":"Team channel")+'</small></div><div class="messages">'+(messages||'<div class="empty">Start the conversation.</div>')+'</div><form class="compose" id="compose-form"><input class="field" name="body" maxlength="1000" placeholder="Message #'+e(state.channel)+'" aria-label="Message" required><button class="btn primary" type="submit">Send '+icon("arrow",14)+'</button></form></section></div>';
}
function renderSettings(){
 return heading("PREFERENCES","Workspace settings","Your current team and preview configuration.")+'<section class="card pad"><div class="setting-row"><div><b>Current team</b><small>'+e(currentTeam().name)+' · Team '+e(state.team)+'</small></div>'+button("Switch team","switch-team")+'</div><div class="setting-row"><div><b>Data connection</b><small>'+(state.mode==="demo"?"Demo data is stored in this browser only.":"Connected to a configured Supabase project.")+'</small></div><span class="pill">'+(state.mode==="demo"?"Demo":"Supabase")+'</span></div><div class="setting-row"><div><b>Google authentication</b><small>'+(state.mode==="demo"?"Set up a dedicated Supabase project to enable Google sign-in.":"Authentication uses your team's Supabase project.")+'</small></div><span class="pill">'+(state.mode==="demo"?"Not configured":"Configured")+'</span></div>'+(state.mode==="demo"?'<div class="setting-row"><div><b>Reset sample changes</b><small>Restore the original fictional tasks, build logs and messages.</small></div>'+button("Reset preview","reset")+'</div>':"")+'</section>';
}
function canEdit(){return state.mode==="demo"||["lead","captain","mentor","admin"].includes(state.member?.role);}
function sidebar(){
 const navigation=a("overview","Overview","overview")+a("tasks","Tasks","tasks")+a("logs","Build log","logs")+a("projects","Robot projects","projects")+a("messages","Messages","messages")+a("calendar","Calendar","calendar")+a("people","Members","people");
 return '<div class="screen '+(state.menu?"show":"")+'" data-action="close-menu"></div><aside class="side '+(state.menu?"open":"")+'"><div class="wordmark"><span class="logo">b.</span>blueprint<span class="period">.</span></div><button class="team-picker" data-action="switch-team"><span class="team-box">'+e(state.team)+'</span><span><b>'+e(currentTeam().name)+'</b><small>Team workspace</small></span><span class="chev">'+icon("chevron",14)+'</span></button><div class="side-caption">WORKSPACE</div><nav class="nav" aria-label="Workspace">'+navigation+'</nav><div class="side-caption">GENERAL</div><nav class="nav" aria-label="General">'+a("settings","Settings","settings")+'</nav><div class="side-bottom"><span class="avatar">'+(state.mode==="demo"?"BP":e(initials(state.user?.user_metadata?.full_name||"Member")))+'</span><div><b>'+(state.mode==="demo"?"Preview user":e(state.user?.user_metadata?.full_name||"Team member"))+'</b><small>'+(state.mode==="demo"?"Demo workspace":e(state.member?.role||"Member"))+'</small></div><button class="push" data-action="sign-out" aria-label="Leave workspace">'+icon("logout",17)+'</button></div></aside>';
}
function shell(){
 const views={overview:renderOverview,tasks:renderTasks,logs:renderLogs,projects:renderProjects,messages:renderMessages,calendar:renderCalendar,people:renderPeople,settings:renderSettings};
 const labels={overview:"Overview",tasks:"Tasks",logs:"Build log",projects:"Robot projects",messages:"Messages",calendar:"Calendar",people:"Members",settings:"Settings"};
 return '<div class="shell">'+sidebar()+'<main class="main"><div class="bar"><div class="actions"><button class="round-button mobile-toggle" data-action="menu" aria-label="Open menu">'+icon("menu")+'</button><div class="crumb">Team '+e(state.team)+' <span>/</span> '+labels[state.view]+'</div></div><div class="bar-right"><span class="eyebrow" style="letter-spacing:.8px">'+new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})+'</span><button class="round-button" aria-label="Notifications" data-action="notifications">'+icon("bell")+'</button><span class="bar-avatar">'+(state.mode==="demo"?"BP":"TM")+'</span></div></div><div class="content enter">'+(views[state.view]||renderOverview)()+'</div></main></div>';
}
function landing(){
 return '<div class="landing"><div class="landing-top"><div class="wordmark"><span class="logo">b.</span>blueprint<span class="period">.</span></div><small>ROBOTICS TEAM MANAGEMENT</small></div><main class="landing-inner enter"><span class="eyebrow">THE WORK BEHIND THE ROBOT</span><h1>A better place<br>to <em>build together.</em></h1><p class="landing-intro">Tasks, conversations, engineering logs and team progress. Organized around the people actually building the robot.</p><div class="team-choices">'+teams.map(t=>'<button class="team-choice" data-team="'+t.id+'"><strong>'+t.id+'</strong><span>'+e(t.name)+'</span><small>'+(state.mode==="demo"?"OPEN PREVIEW":"CONTINUE TO SIGN IN")+' &nbsp; →</small></button>').join("")+'</div><div style="margin-top:18px"><span class="demo-label">'+(state.mode==="demo"?"PREVIEW MODE · SAMPLE DATA":"SECURE GOOGLE SIGN-IN")+'</span></div></main><footer class="landing-foot"><span>Blueprint · Made for the build season</span><span>Teams 1810 & 9316</span></footer></div>';
}
function authPage(){
 const t=currentTeam();
 const subtitle=state.error?notice('<b>Sign-in issue:</b> '+e(state.error)):"";
 const form=state.user?'<form id="request-form"><div class="form-group"><label>Your name</label><input class="field" name="name" maxlength="80" required placeholder="First and last name" value="'+e(state.user.user_metadata?.full_name||"")+'"></div><div class="form-group"><label>Subgroup</label><select class="field" name="subgroup">'+groups.map(x=>'<option>'+e(x)+'</option>').join("")+'</select></div><button class="btn primary" type="submit">Request team access</button></form>':'<button class="btn primary" data-action="google-signin">Continue with Google →</button>';
 return '<div class="landing"><div class="landing-top"><div class="wordmark"><span class="logo">b.</span>blueprint<span class="period">.</span></div>'+button("Switch team","switch-team")+'</div><main class="landing-inner signin"><span class="team-box">'+e(t.id)+'</span><span class="eyebrow">'+e(t.name)+'</span><h1>'+(!state.user?"Welcome to Blueprint.":"Join the workspace.")+'</h1><p>'+(!state.user?"Sign in with Google to request access to your team's private workspace. New accounts require approval.":"Choose your subgroup and request approval from a team administrator.")+'</p>'+subtitle+form+'</main></div>';
}
function waitingPage(){
 return '<div class="landing"><div class="landing-top"><div class="wordmark"><span class="logo">b.</span>blueprint<span class="period">.</span></div>'+button("Switch team","switch-team")+'</div><main class="landing-inner signin"><span class="eyebrow">ACCESS REQUEST</span><h1>Waiting for approval.</h1><p>Your membership request for Team '+e(state.team)+' has been received. A team administrator must approve access before you can view private information.</p>'+notice('Nothing from the team workspace is available until membership is approved.')+button("Check again","refresh-access","primary")+'</main></div>';
}
function modal(){
 if(!state.modal)return "";
 let title="",body="";
 if(state.modal==="task"){
 title="Create a task";body='<form id="task-form"><div class="form-group"><label>Task title</label><input class="field" name="title" maxlength="140" required placeholder="e.g. Verify intake clearance"></div><div class="form-group"><label>Subgroup</label><select class="field" name="subgroup">'+groups.map(x=>'<option>'+e(x)+'</option>').join("")+'</select></div><div class="form-buttons"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" class="btn primary">Create task</button></div></form>';
 }else if(state.modal==="log"){
 title="Add a build log entry";body='<form id="log-form"><div class="form-group"><label>What changed?</label><input class="field" name="title" maxlength="140" required placeholder="Short summary"></div><div class="form-group"><label>Details</label><textarea class="field" name="body" maxlength="3000" required placeholder="What was done, tested, or found?"></textarea></div><div class="form-group"><label>Subgroup</label><select class="field" name="subgroup">'+groups.map(x=>'<option>'+e(x)+'</option>').join("")+'</select></div><div class="form-buttons"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" class="btn primary">Add entry</button></div></form>';
 }else{
 title="Notifications";body='<p>Automated alerts, email digests and nightly team reviews are planned for a later release. Blueprint will only send these once a team administrator configures and enables them.</p>'+button("Close","close-modal");
 }
 return '<div class="modal-cover" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">'+title+'</h2><p>'+((state.modal==="task"||state.modal==="log")?"Changes are saved only in this preview unless a live backend is connected.":"")+'</p>'+body+'</div></div>';
}
function render(){
 if(state.loading){app.innerHTML='<div class="landing"><div class="landing-top"><div class="wordmark"><span class="logo">b.</span>blueprint<span class="period">.</span></div></div><main class="landing-inner"><span class="eyebrow">LOADING WORKSPACE</span><h1>Setting things up.</h1></main></div>';return;}
 if(!state.team){app.innerHTML=landing();return;}
 if(state.mode==="live"&&(!state.user||!state.member)){app.innerHTML=authPage();return;}
 if(state.mode==="live"&&state.member?.status!=="approved"){app.innerHTML=waitingPage();return;}
 if(!state.data){app.innerHTML=landing();return;}
 app.innerHTML=shell()+modal();
}
function toast(text){
 document.querySelector(".toast")?.remove();
 const el=document.createElement("div");el.className="toast";el.textContent=text;document.body.append(el);setTimeout(()=>el.remove(),3300);
}
async function refresh(){
 if(state.mode==="demo"){state.data=workspace(state.team);render();return;}
 state.loading=true;render();
 try{
  state.user=await getUser();
  state.member=state.user?await membership(state.team,state.user.id):null;
  state.data=state.member?.status==="approved"?await liveWorkspace(state.team):null;
  state.error="";
 }catch(err){state.error=err.message||"Connection failed.";toast(state.error);}
 finally{state.loading=false;render();}
}
async function chooseTeam(team){
 if(!teams.some(t=>t.id===team))return;
 state.team=team;sessionStorage.setItem("blueprint-selected-team",team);state.view="overview";state.channel="general";state.filter="all";state.member=null;state.menu=false;
 await refresh();
}
async function dispatchAction(action){
 if(action==="switch-team"||action==="sign-out"){
  if(action==="sign-out"&&state.mode==="live"){try{await signOut();}catch(err){toast(err.message);}}
  state.team=null;state.user=null;state.member=null;state.data=null;state.menu=false;state.modal=null;sessionStorage.removeItem("blueprint-selected-team");render();return;
 }
 if(action==="menu"){state.menu=!state.menu;render();return;}
 if(action==="close-menu"){state.menu=false;render();return;}
 if(action==="new-task"){state.modal="task";render();return;}
 if(action==="new-log"){state.modal="log";render();return;}
 if(action==="notifications"){state.modal="notifications";render();return;}
 if(action==="close-modal"){state.modal=null;render();return;}
 if(action==="reset"){state.data=reset(state.team);render();toast("Sample data restored.");return;}
 if(action==="google-signin"){try{await googleSignIn();}catch(err){toast(err.message||"Google sign-in failed.");}return;}
 if(action==="refresh-access"){await refresh();return;}
}
app.addEventListener("click",async ev=>{
 if(ev.target.closest(".modal")&&ev.target.closest(".modal-cover")?.dataset.action==="close-modal"&&!ev.target.closest("[data-action]"))return;
 const team=ev.target.closest("[data-team]");if(team){await chooseTeam(team.dataset.team);return;}
 const change=ev.target.closest("[data-view]");if(change){state.view=change.dataset.view;state.menu=false;state.filter="all";state.modal=null;render();return;}
 const filter=ev.target.closest("[data-filter]");if(filter){state.filter=filter.dataset.filter;render();return;}
 const channel=ev.target.closest("[data-channel]");if(channel){state.channel=channel.dataset.channel;render();return;}
 const toggle=ev.target.closest("[data-toggle]");
 if(toggle){
  const task=state.data?.tasks.find(t=>String(t.id)===toggle.dataset.toggle);if(!task)return;
  const status=task.status==="done"?"todo":"done";
  if(state.mode==="demo"){task.status=status;save(state.team,state.data);render();}
  else{try{await setLiveTaskStatus(state.team,task.id,status);await refresh();}catch(err){toast("Update rejected: "+err.message);}}
  return;
 }
 const button=ev.target.closest("[data-action]");
 if(button){await dispatchAction(button.dataset.action);}
});
app.addEventListener("submit",async ev=>{
 const form=ev.target;if(!["task-form","log-form","compose-form","request-form"].includes(form.id))return;
 ev.preventDefault();const f=new FormData(form);
 try{
 if(form.id==="request-form"){
  const name=String(f.get("name")||"").trim().slice(0,80),subgroup=String(f.get("subgroup")||"");
  if(!name||!groups.includes(subgroup))return toast("Enter a valid name and subgroup.");
  await requestMembership(state.team,state.user,name,subgroup);await refresh();toast("Access request submitted.");return;
 }
 if(form.id==="task-form"){
  if(!canEdit())return toast("Only team leads can add tasks.");
  const title=String(f.get("title")||"").trim().slice(0,140),subgroup=String(f.get("subgroup")||"");
  if(!title||!groups.includes(subgroup))return;
  if(state.mode==="demo"){state.data.tasks.unshift({id:"t"+Date.now(),title,subgroup,due:"Not scheduled",status:"todo",priority:"Normal"});save(state.team,state.data);}
  else await addLiveTask(state.team,title,subgroup,state.user.id);
  state.modal=null;state.view="tasks";
 }else if(form.id==="log-form"){
  if(!canEdit())return toast("Only team leads can add log entries.");
  const title=String(f.get("title")||"").trim().slice(0,140),body=String(f.get("body")||"").trim().slice(0,3000),subgroup=String(f.get("subgroup")||"");
  if(!title||!body||!groups.includes(subgroup))return;
  if(state.mode==="demo"){state.data.logs.unshift({id:"l"+Date.now(),title,body,subgroup,author:"You (preview)",time:new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})});save(state.team,state.data);}
  else await addLiveLog(state.team,title,body,subgroup,state.user.id);
  state.modal=null;state.view="logs";
 }else{
  const text=String(f.get("body")||"").trim().slice(0,1000);if(!text)return;
  if(state.mode==="demo"){(state.data.messages[state.channel]||=([])).push({author:"You (preview)",initials:"YP",time:new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}),text});save(state.team,state.data);}
  else await sendLiveMessage(state.team,state.channel,text,state.user.id);
 }
 if(state.mode==="live")await refresh();else render();
 }catch(err){toast("Could not save: "+(err.message||"Unknown error"));}
});
document.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&state.modal){state.modal=null;render();}});
if(state.team)refresh();else render();
