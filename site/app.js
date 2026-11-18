import {teams,groups,channels,workspace,save,reset,progress} from "./data.js";
import {configured,getUser,googleSignIn,signOut,membership,requestMembership,liveWorkspace,addLiveTask,editLiveTask,setLiveTaskStatus,addLiveLog,sendLiveMessage,approveMembership,updateMemberRole,sendMagicLink,addLiveProject,editLiveProject,addLiveEvent,addLiveAnnouncement,subscribeTeam} from "./supabase.js";

const app=document.getElementById("app");
const state={team:sessionStorage.getItem("blueprint-selected-team")||null,view:"overview",filter:"all",channel:"general",modal:null,menu:false,editingTaskId:null,editingProjectId:null,authNotice:"",unsubscribe:null,subscriptionTeam:null,refreshBusy:false,realtimeTimer:null,taskScope:"all",mode:configured()?"live":"demo",user:null,member:null,data:null,loading:false,error:""};
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
function canToggle(t){return state.mode==="demo"||canEdit()||(t.assigned_to&&t.assigned_to===state.user?.id);}
function assignee(t){return state.data.people.find(p=>p.id===t.assigned_to)?.name||"Unassigned";}
function taskLine(t){
 return '<div class="task"><button class="task-check '+(t.status==="done"?"done":"")+'" data-toggle="'+e(t.id)+'" aria-label="Toggle '+e(t.title)+'" '+(canToggle(t)?"":"disabled title=\"Only assignees and leads can update status\"")+'></button><div class="task-body"><b class="'+(t.status==="done"?"strike":"")+'">'+e(t.title)+'</b><small>'+e(t.subgroup)+' · '+e(assignee(t))+' · '+e(t.due)+'</small></div>'+pill(t.status)+'</div>';
}
function renderOverview(){
 const d=state.data;
 const open=d.tasks.filter(t=>t.status!=="done").length,done=d.tasks.filter(t=>t.status==="done").length;
 const stats=[["Open tasks",open,"Across all subgroups","tasks"],["Active projects",d.projects.length,"Robot development","projects"],["Log entries",d.logs.length,"Development records","logs"],["Upcoming events",d.events.length,"On the calendar","calendar"]];
 const statHtml=stats.map(s=>'<div class="card stat"><div class="stat-label">'+s[0]+'<em>'+icon(s[3],16)+'</em></div><div class="stat-num">'+s[1]+'</div><small>'+s[2]+'</small></div>').join("");
 const upcoming=d.tasks.filter(t=>t.status!=="done").slice(0,4).map(taskLine).join("")||'<div class="empty">Nothing assigned right now.</div>';
 const updates=d.logs.slice(0,4).map(l=>'<div class="feed"><span class="feed-icon">'+icon("pencil",15)+'</span><div class="feed-text"><b>'+e(l.title)+'</b><p>'+e(l.subgroup)+' · '+e(l.body)+'</p></div><small class="feed-time">'+e(l.time)+'</small></div>').join("")||'<div class="empty">No build entries yet.</div>';
 const p=progress(d);
 return heading("TEAM WORKSPACE","A clearer way to build.","Your projects, people, and progress in one place.",'<span class="demo-label">'+(state.mode==="demo"?"DEMO WORKSPACE":"CONNECTED WORKSPACE")+'</span>')+sampleNote()+'<div class="stats">'+statHtml+'</div><div class="columns"><div class="column-stack">'+section("Your team's priorities",'<button data-view="tasks">View all tasks →</button>',upcoming)+section("Latest build activity",'<button data-view="logs">Open build log →</button>',updates)+'</div><div class="column-stack">'+section("Season progress","",'<div class="progress-head"><b>Task completion</b><span>'+p+'%</span></div><div class="track"><i style="width:'+p+'%"></i></div><p class="hint">'+done+' completed · '+open+' remaining. Keep the next handoff visible.</p>')+section("Coming up",'<button data-view="calendar">Full schedule →</button>',d.events.slice(0,3).map(x=>'<div class="feed"><div class="feed-icon">'+icon("calendar",15)+'</div><div class="feed-text"><b>'+e(x.title)+'</b><p>'+e(x.details)+'</p></div></div>').join("")||'<div class="empty">No upcoming events.</div>')+section("Team notices",'<button data-view="announcements">View all →</button>',(d.announcements||[]).slice(0,2).map(x=>'<div class="feed"><div class="feed-icon">'+icon("bell",15)+'</div><div class="feed-text"><b>'+e(x.title)+'</b><p>'+e(x.body)+'</p></div></div>').join("")||'<div class="empty">No announcements yet.</div>')+section("Blueprint brief","",'<div class="hint">The nightly review engine will summarize approved changes, current blockers and next steps once the live backend is configured. No AI summaries are being sent from this preview.</div>')+'</div></div>';
}
function renderTasks(){
 const tasks=state.data.tasks.filter(t=>(state.filter==="all"||t.status===state.filter)&&(state.taskScope==="all"||(state.mode==="demo"?t.assigned_to!=null:t.assigned_to===state.user?.id)));
 const allowed=canEdit();
 const statusFilters=[["all","All statuses"],["todo","To do"],["in_progress","In progress"],["blocked","Blocked"],["done","Complete"]];
 const scope='<div class="scope-switch"><button data-task-scope="all" class="'+(state.taskScope==="all"?"active":"")+'">Team tasks</button><button data-task-scope="mine" class="'+(state.taskScope==="mine"?"active":"")+'">'+(state.mode==="demo"?"Assigned tasks":"My tasks")+'</button></div>';
 return heading("PROJECT COORDINATION","Tasks & assignments","Clear ownership, useful deadlines, fewer missed handoffs.",allowed?button(icon("plus",15)+" New task","new-task","primary"):"")+sampleNote()+'<div class="task-toolbar">'+scope+'<div class="filter-row">'+statusFilters.map(x=>'<button class="filter '+(state.filter===x[0]?"active":"")+'" data-filter="'+x[0]+'">'+x[1]+'</button>').join("")+'</div></div><div>'+tasks.map(t=>'<div class="card entry"><button data-toggle="'+e(t.id)+'" aria-label="Toggle '+e(t.title)+'" class="task-check '+(t.status==="done"?"done":"")+'" '+(canToggle(t)?"":"disabled")+'></button><div class="entry-main"><b>'+e(t.title)+'</b><small>'+e(t.subgroup)+' · '+e(assignee(t))+' · Due '+e(t.due)+' · '+e(t.priority)+' priority</small></div>'+pill(t.status)+(allowed?'<div class="entry-actions"><button type="button" class="btn small" data-edit-task="'+e(t.id)+'">'+icon("pencil",13)+' Edit</button></div>':"")+'</div>').join("")+'</div>'+(tasks.length?"":'<div class="empty">No tasks match this view.</div>');
}
function renderLogs(){
 const entries=state.data.logs.map(l=>'<article class="log"><h3>'+e(l.title)+'</h3><p>'+e(l.body)+'</p><small>'+e(l.subgroup)+' · '+e(l.author)+' · '+e(l.time)+'</small></article>').join("");
 return heading("ENGINEERING HISTORY","Build log","Keep a reliable record of what changed, why it changed, and what comes next.",canEdit()?button(icon("plus",15)+" Add entry","new-log","primary"):"")+sampleNote()+section("Recent changes","",'<div class="timeline">'+(entries||'<div class="empty">No updates yet.</div>')+'</div>');
}
function renderProjects(){
 const cards=state.data.projects.map(p=>'<article class="card project"><div class="project-icon">'+e(p.icon||"◇")+'</div><h3>'+e(p.name)+'</h3><p>'+e(p.description)+'</p><div class="project-foot"><small>'+e(p.lead||p.subgroup||"General")+' · '+Number(p.progress||0)+'% progress</small><div class="track"><i style="width:'+Math.max(0,Math.min(100,Number(p.progress)||0))+'%"></i></div>'+(canEdit()?'<div style="margin-top:14px"><button type="button" class="btn small" data-edit-project="'+e(p.id)+'">'+icon("pencil",13)+' Edit project</button></div>':"")+'</div></article>').join("");
 return heading("THE ROBOT","Projects & subsystems","Track the mechanisms, people and work behind your robot.",canEdit()?button(icon("plus",15)+" New project","new-project","primary"):"")+sampleNote()+'<div class="grid-three">'+(cards||'<div class="empty">No projects yet. A team lead can create the first one.</div>')+'</div>';
}

function renderPeople(){
 const cards=state.data.people.map(p=>'<article class="card person"><div class="avatar">'+e(p.initials||initials(p.name))+'</div><div><h3>'+e(p.name)+'</h3><small>'+e(p.role)+' · '+e(p.group)+'</small></div></article>').join("");
 return heading("PEOPLE & ROLES","Team directory","Find the right person or subgroup for the next step.")+sampleNote()+'<div class="people">'+(cards||'<div class="empty">The directory will populate when members join.</div>')+'</div>';
}
function renderCalendar(){
 const cards=state.data.events.map(ev=>'<div class="card event"><div class="event-date"><b>'+e(ev.day)+'</b><small>'+e(ev.month)+'</small></div><div class="event-info"><b>'+e(ev.title)+'</b><small>'+e(ev.details)+'</small></div><span class="pill">'+e(ev.type)+'</span></div>').join("");
 return heading("LOOKING AHEAD","Schedule","Build meetings, reviews, and important team milestones.",canEdit()?button(icon("plus",15)+" New event","new-event","primary"):"")+sampleNote()+'<div class="events">'+(cards||'<div class="empty">No events are scheduled yet.</div>')+'</div>';
}
function renderAnnouncements(){
 const cards=(state.data.announcements||[]).map(x=>'<article class="card pad" style="margin-bottom:12px"><div class="eyebrow">'+e(x.author)+' · '+e(x.time)+'</div><h3 style="font-size:15px;letter-spacing:-.3px;margin:12px 0 6px">'+e(x.title)+'</h3><p style="font-size:12px;line-height:1.8;color:#75838a;white-space:pre-wrap;margin:0">'+e(x.body)+'</p></article>').join("");
 return heading("TEAM UPDATES","Announcements","Important information, without getting lost in a conversation.",canEdit()?button(icon("plus",15)+" Publish update","new-announcement","primary"):"")+sampleNote()+(cards||'<div class="empty">Nothing posted yet. Team leads can publish the first update.</div>');
}

function canAdmin(){return state.mode==="demo"||state.member?.role==="admin";}
function renderAdmin(){
 if(!canAdmin())return heading("PERMISSIONS","Access restricted","Only team administrators can review membership requests.");
 const waiting=state.data.pending||[];
 const list=waiting.map(m=>'<div class="approval-row" data-request-id="'+e(m.user_id)+'"><span class="avatar">'+e(initials(m.name))+'</span><div class="approval-info"><b>'+e(m.name)+'</b><small>'+e(m.subgroup)+' · Pending approval</small></div><label class="sr-only" for="role-'+e(m.user_id)+'">Role for '+e(m.name)+'</label><select class="field role-select" id="role-'+e(m.user_id)+'">'+["member","lead","captain","mentor","admin"].map(role=>'<option value="'+role+'">'+role[0].toUpperCase()+role.slice(1)+'</option>').join("")+'</select><div class="approval-actions"><button type="button" class="btn small" data-decision="rejected">Reject</button><button type="button" class="btn primary small" data-decision="approved">Approve</button></div></div>').join("");
 const members=state.data.people.map(m=>'<div class="approval-row" data-member-id="'+e(m.id)+'"><span class="avatar">'+e(m.initials||initials(m.name))+'</span><div class="approval-info"><b>'+e(m.name)+'</b><small>'+e(m.group)+'</small></div>'+(m.id===state.user?.id?'<span class="pill">'+e(m.role)+' (you)</span>':'<label class="sr-only" for="access-'+e(m.id)+'">Role for '+e(m.name)+'</label><select id="access-'+e(m.id)+'" class="field role-select" data-role-change="'+e(m.id)+'">'+["member","lead","captain","mentor","admin"].map(role=>'<option value="'+role+'" '+(m.role===role?"selected":"")+'>'+role[0].toUpperCase()+role.slice(1)+'</option>').join("")+'</select>')+'</div>').join("");
 return heading("TEAM OPERATIONS","Membership review","Approve verified team members and manage their access.")+sampleNote()+notice('<b>Verify identities first.</b> Approval grants access to private team records. Confirm each student with a mentor outside Blueprint.')+section("Pending requests",'<span class="pill">'+waiting.length+' pending</span>',list||'<div class="empty">No pending membership requests.</div>')+'<div style="height:18px"></div>'+section("Approved members","",members||'<div class="empty">No approved members yet.</div>')+'<p class="hint">Members can read team records and use channels. Leads, captains and mentors can manage projects, tasks and announcements. Administrators control roles and membership approval.</p>';
}

function renderMessages(){
 const messages=(state.data.messages[state.channel]||[]).map(m=>'<div class="message"><div class="avatar">'+e(m.initials||initials(m.author))+'</div><div><b>'+e(m.author)+'</b><small>'+e(m.time)+'</small><p>'+e(m.text)+'</p></div></div>').join("");
 return heading("CONVERSATIONS","Team messages","Subgroup channels for clear, purposeful coordination.")+sampleNote()+'<div class="card chat"><aside class="channels"><h3>CHANNELS</h3>'+channels.map(c=>'<button class="channel '+(state.channel===c?"active":"")+'" data-channel="'+c+'"># '+e(c)+'</button>').join("")+'</aside><section class="conversation"><div class="chat-head"><b># '+e(state.channel)+'</b><small>Team '+e(state.team)+' · '+(state.mode==="demo"?"Local preview":"Team channel")+'</small></div><div class="messages">'+(messages||'<div class="empty">Start the conversation.</div>')+'</div><form class="compose" id="compose-form"><input class="field" name="body" maxlength="1000" placeholder="Message #'+e(state.channel)+'" aria-label="Message" required><button class="btn primary" type="submit">Send '+icon("arrow",14)+'</button></form></section></div>';
}
function renderSettings(){
 return heading("PREFERENCES","Workspace settings","Your current team and preview configuration.")+'<section class="card pad"><div class="setting-row"><div><b>Current team</b><small>'+e(currentTeam().name)+' · Team '+e(state.team)+'</small></div>'+button("Switch team","switch-team")+'</div><div class="setting-row"><div><b>Data connection</b><small>'+(state.mode==="demo"?"Demo data is stored in this browser only.":"Connected to a configured Supabase project.")+'</small></div><span class="pill">'+(state.mode==="demo"?"Demo":"Supabase")+'</span></div><div class="setting-row"><div><b>Google authentication</b><small>'+(state.mode==="demo"?"Sign-in is simulated in sample mode.":"Email sign-in is coded. Google sign-in requires provider setup in Supabase.")+'</small></div><span class="pill">'+(state.mode==="demo"?"Sample":"Review settings")+'</span></div>'+(state.mode==="demo"?'<div class="setting-row"><div><b>Reset sample changes</b><small>Restore the original fictional tasks, build logs and messages.</small></div>'+button("Reset preview","reset")+'</div><div class="setting-row"><div><b>Connect to live Blueprint</b><small>Leave the fictional sample workspace and sign into your real team.</small></div>'+button("Go live","exit-preview","primary")+'</div>':"")+'</section>';
}
function canEdit(){return state.mode==="demo"||["lead","captain","mentor","admin"].includes(state.member?.role);}
function sidebar(){
 const navigation=a("overview","Overview","overview")+a("announcements","Announcements","bell")+a("tasks","Tasks","tasks")+a("logs","Build log","logs")+a("projects","Robot projects","projects")+a("messages","Messages","messages")+a("calendar","Calendar","calendar")+a("people","Members","people");
 return '<div class="screen '+(state.menu?"show":"")+'" data-action="close-menu"></div><aside class="side '+(state.menu?"open":"")+'"><div class="wordmark"><span class="logo">b.</span>blueprint<span class="period">.</span></div><button class="team-picker" data-action="switch-team"><span class="team-box">'+e(state.team)+'</span><span><b>'+e(currentTeam().name)+'</b><small>Team workspace</small></span><span class="chev">'+icon("chevron",14)+'</span></button><div class="side-caption">WORKSPACE</div><nav class="nav" aria-label="Workspace">'+navigation+'</nav><div class="side-caption">GENERAL</div><nav class="nav" aria-label="General">'+(canAdmin()?a("admin","Membership","people"):"")+a("settings","Settings","settings")+'</nav><div class="side-bottom"><span class="avatar">'+(state.mode==="demo"?"BP":e(initials(state.user?.user_metadata?.full_name||"Member")))+'</span><div><b>'+(state.mode==="demo"?"Preview user":e(state.user?.user_metadata?.full_name||"Team member"))+'</b><small>'+(state.mode==="demo"?"Demo workspace":e(state.member?.role||"Member"))+'</small></div><button class="push" data-action="sign-out" aria-label="Leave workspace">'+icon("logout",17)+'</button></div></aside>';
}
function shell(){
 const views={overview:renderOverview,announcements:renderAnnouncements,tasks:renderTasks,logs:renderLogs,projects:renderProjects,messages:renderMessages,calendar:renderCalendar,people:renderPeople,admin:renderAdmin,settings:renderSettings};
 const labels={overview:"Overview",announcements:"Announcements",tasks:"Tasks",logs:"Build log",projects:"Robot projects",messages:"Messages",calendar:"Calendar",people:"Members",admin:"Membership",settings:"Settings"};
 return '<div class="shell">'+sidebar()+'<main class="main"><div class="bar"><div class="actions"><button class="round-button mobile-toggle" data-action="menu" aria-label="Open menu">'+icon("menu")+'</button><div class="crumb">Team '+e(state.team)+' <span>/</span> '+labels[state.view]+'</div></div><div class="bar-right"><span class="eyebrow" style="letter-spacing:.8px">'+new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})+'</span><button class="round-button" aria-label="Refresh workspace" data-action="refresh-live" title="Refresh workspace">↻</button><button class="round-button" aria-label="Notifications" data-action="notifications">'+icon("bell")+'</button><span class="bar-avatar">'+(state.mode==="demo"?"BP":"TM")+'</span></div></div><div class="content enter">'+(views[state.view]||renderOverview)()+'</div></main></div>';
}
function landing(){
 return '<div class="landing"><div class="landing-top"><div class="wordmark"><span class="logo">b.</span>blueprint<span class="period">.</span></div><small>ROBOTICS TEAM MANAGEMENT</small></div><main class="landing-inner enter"><span class="eyebrow">THE WORK BEHIND THE ROBOT</span><h1>A better place<br>to <em>build together.</em></h1><p class="landing-intro">Tasks, conversations, engineering logs and team progress. Organized around the people actually building the robot.</p><div class="team-choices">'+teams.map(t=>'<button class="team-choice" data-team="'+t.id+'"><strong>'+t.id+'</strong><span>'+e(t.name)+'</span><small>'+(state.mode==="demo"?"OPEN PREVIEW":"CONTINUE TO SIGN IN")+' &nbsp; →</small></button>').join("")+'</div><div style="margin-top:18px"><span class="demo-label">'+(state.mode==="demo"?"PREVIEW MODE · SAMPLE DATA":"PRIVATE TEAM ACCESS")+'</span></div></main><footer class="landing-foot"><span>Blueprint · Made for the build season</span><span>Teams 1810 & 9316</span></footer></div>';
}
function authPage(){
 const t=currentTeam();
 const subtitle=state.error?notice('<b>Connection issue:</b> '+e(state.error)):"";
 const message=state.authNotice?notice('<b>Email sent.</b> '+e(state.authNotice)):"";
 const form=state.user?'<form id="request-form"><div class="form-group"><label for="join-name">Your name</label><input id="join-name" class="field" name="name" maxlength="80" required placeholder="First and last name" value="'+e(state.user.user_metadata?.full_name||"")+'"></div><div class="form-group"><label for="join-group">Subgroup</label><select id="join-group" class="field" name="subgroup">'+groups.map(x=>'<option>'+e(x)+'</option>').join("")+'</select></div><button class="btn primary" type="submit">Request team access</button></form>':
   '<button class="btn primary" data-action="google-signin">Continue with Google →</button><p class="small-muted" style="text-align:center;margin:18px 0 7px">or sign in by email</p><form id="magic-link-form"><label for="auth-email" class="sr-only">Email address</label><input id="auth-email" name="email" class="field" type="email" autocomplete="email" placeholder="School or personal email" maxlength="254" required><button class="btn" style="width:100%;margin-top:10px" type="submit">Send sign-in link</button></form>'+message;
 return '<div class="landing"><div class="landing-top"><div class="wordmark"><span class="logo">b.</span>blueprint<span class="period">.</span></div>'+button("Switch team","switch-team")+'</div><main class="landing-inner signin"><span class="team-box">'+e(t.id)+'</span><span class="eyebrow">'+e(t.name)+'</span><h1>'+(!state.user?"Welcome to Blueprint.":"Join the workspace.")+'</h1><p>'+(!state.user?"Sign in to request access to your private team workspace. A mentor or team administrator must approve every new member.":"Choose your subgroup and request approval from a team administrator.")+'</p>'+subtitle+form+'<div style="margin-top:30px">'+button("Explore sample workspace","open-preview")+'</div></main></div>';
}

function waitingPage(){
 return '<div class="landing"><div class="landing-top"><div class="wordmark"><span class="logo">b.</span>blueprint<span class="period">.</span></div>'+button("Switch team","switch-team")+'</div><main class="landing-inner signin"><span class="eyebrow">ACCESS REQUEST</span><h1>Waiting for approval.</h1><p>Your membership request for Team '+e(state.team)+' has been received. A team administrator must approve access before you can view private information.</p>'+notice('Nothing from the team workspace is available until membership is approved.')+button("Check again","refresh-access","primary")+'</main></div>';
}
function selectionOptions(selected){
 return '<option value="">Unassigned</option>'+state.data.people.map(p=>'<option value="'+e(p.id)+'" '+(p.id===selected?"selected":"")+'>'+e(p.name)+' · '+e(p.group)+'</option>').join("");
}
function rejectedPage(){
 return '<div class="landing"><div class="landing-top"><div class="wordmark"><span class="logo">b.</span>blueprint<span class="period">.</span></div>'+button("Switch team","switch-team")+'</div><main class="landing-inner signin"><span class="eyebrow">TEAM MEMBERSHIP</span><h1>Access not approved.</h1><p>Your request to join Team '+e(state.team)+' was not approved. To correct a mistaken request or ask a question, speak with an authorized team mentor. Team information remains private.</p>'+button("Check status again","refresh-access")+'</main></div>';
}
function connectionPage(){
 return '<div class="landing"><div class="landing-top"><div class="wordmark"><span class="logo">b.</span>blueprint<span class="period">.</span></div>'+button("Switch team","switch-team")+'</div><main class="landing-inner signin"><span class="eyebrow">CONNECTION ISSUE</span><h1>Could not load your workspace.</h1><p>Blueprint could not fetch the latest information from the team database. Your membership is unchanged.</p>'+notice('<b>Details:</b> '+e(state.error||"Please try again."))+button("Retry connection","refresh-access","primary")+'</main></div>';
}
function modal(){
 if(!state.modal)return "";
 let title="",body="",description="";
 if(state.modal==="task"||state.modal==="task-edit"){
  const editing=state.modal==="task-edit";
  const t=editing?state.data.tasks.find(item=>String(item.id)===String(state.editingTaskId)):null;
  if(editing&&!t)return "";
  title=editing?"Edit task":"Create a task";description="Keep ownership, deadlines and progress current.";
  const selected=t?.subgroup||"Design";
  const selector=groups.map(g=>'<option '+(g===selected?"selected":"")+'>'+e(g)+'</option>').join("");
  const priority=["Low","Normal","High"].map(p=>'<option '+(p===(t?.priority||"Normal")?"selected":"")+'>'+p+'</option>').join("");
  const statusOptions=[["todo","To do"],["in_progress","In progress"],["blocked","Blocked"],["done","Complete"]].map(([value,name])=>'<option value="'+value+'" '+(value===(t?.status||"todo")?"selected":"")+'>'+name+'</option>').join("");
  body='<form id="'+(editing?"task-edit-form":"task-form")+'"><div class="form-group"><label for="task-title">Task title</label><input id="task-title" class="field" name="title" maxlength="140" required value="'+e(t?.title||"")+'" placeholder="e.g. Verify intake clearance"></div><div class="form-duo"><div class="form-group"><label for="task-group">Subgroup</label><select id="task-group" class="field" name="subgroup">'+selector+'</select></div><div class="form-group"><label for="task-priority">Priority</label><select id="task-priority" class="field" name="priority">'+priority+'</select></div></div><div class="form-duo"><div class="form-group"><label for="task-owner">Assign to</label><select id="task-owner" class="field" name="assigned_to">'+selectionOptions(t?.assigned_to)+'</select></div><div class="form-group"><label for="task-due">Due date</label><input id="task-due" type="date" class="field" name="due_date" value="'+e(t?.due_date||"")+'"></div></div>'+(editing?'<div class="form-group"><label for="task-status">Status</label><select id="task-status" class="field" name="status">'+statusOptions+'</select></div>':"")+'<div class="form-buttons"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" class="btn primary">'+(editing?"Save changes":"Create task")+'</button></div></form>';
 }else if(state.modal==="log"){
  title="Add a build log entry";description="Log a real change, test or engineering decision.";
  body='<form id="log-form"><div class="form-group"><label>What changed?</label><input class="field" name="title" maxlength="140" required placeholder="Short summary"></div><div class="form-group"><label>Details</label><textarea class="field" name="body" maxlength="3000" required placeholder="What was done, tested, or found?"></textarea></div><div class="form-group"><label>Subgroup</label><select class="field" name="subgroup">'+groups.map(x=>'<option>'+e(x)+'</option>').join("")+'</select></div><div class="form-buttons"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" class="btn primary">Add entry</button></div></form>';
 }else if(state.modal==="project"||state.modal==="project-edit"){
  const editing=state.modal==="project-edit";
  const p=editing?state.data.projects.find(x=>String(x.id)===String(state.editingProjectId)):null;
  if(editing&&!p)return "";
  title=editing?"Edit project":"Create a project";description="Organize a robot subsystem, software effort or other workstream.";
  body='<form id="project-form"><div class="form-group"><label for="project-name">Project name</label><input id="project-name" name="name" class="field" maxlength="100" required value="'+e(p?.name||"")+'" placeholder="e.g. Drivetrain"></div><div class="form-group"><label for="project-desc">Description</label><textarea id="project-desc" name="description" class="field" maxlength="1500" placeholder="What is this group working on?">'+e(p?.description||"")+'</textarea></div><div class="form-duo"><div class="form-group"><label for="project-group">Lead subgroup</label><select id="project-group" name="subgroup" class="field">'+groups.map(g=>'<option '+(g===(p?.subgroup||"Design")?"selected":"")+'>'+e(g)+'</option>').join("")+'</select></div>'+(editing?'<div class="form-group"><label for="project-progress">Progress (%)</label><input id="project-progress" type="number" min="0" max="100" step="1" name="progress" class="field" value="'+e(p.progress||0)+'"></div>':"")+'</div><div class="form-buttons"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" class="btn primary">'+(editing?"Save project":"Create project")+'</button></div></form>';
 }else if(state.modal==="event"){
  title="Schedule an event";description="Place a team meeting or review on the shared calendar.";
  body='<form id="event-form"><div class="form-group"><label for="event-title">Event title</label><input id="event-title" name="title" class="field" maxlength="140" required placeholder="e.g. CAD review"></div><div class="form-group"><label for="event-time">Date and time</label><input id="event-time" type="datetime-local" name="start" class="field" required></div><div class="form-buttons"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" class="btn primary">Schedule event</button></div></form>';
 }else if(state.modal==="announcement"){
  title="Publish an announcement";description="This update will be visible to every approved member of this team.";
  body='<form id="announcement-form"><div class="form-group"><label for="announce-title">Title</label><input id="announce-title" name="title" class="field" maxlength="140" required placeholder="Short, clear headline"></div><div class="form-group"><label for="announce-body">Message</label><textarea id="announce-body" name="body" class="field" maxlength="2000" required placeholder="What does everyone need to know?"></textarea></div><div class="form-buttons"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" class="btn primary">Publish announcement</button></div></form>';
 }else{
  title="Notifications";description="Notifications are not connected yet.";
  body='<p>Optional alerts, email digests and team summaries are planned for a later release. Blueprint will not send them until an administrator enables them.</p>'+button("Close","close-modal");
 }
 return '<div class="modal-cover" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">'+title+'</h2><p>'+description+'</p>'+body+'</div></div>';
}

function render(){
 if(state.loading){app.innerHTML='<div class="landing"><div class="landing-top"><div class="wordmark"><span class="logo">b.</span>blueprint<span class="period">.</span></div></div><main class="landing-inner"><span class="eyebrow">LOADING WORKSPACE</span><h1>Setting things up.</h1></main></div>';return;}
 if(!state.team){app.innerHTML=landing();return;}
 if(state.mode==="live"&&(!state.user||!state.member)){app.innerHTML=authPage();return;}
 if(state.mode==="live"&&state.member?.status==="pending"){app.innerHTML=waitingPage();return;}
 if(state.mode==="live"&&state.member?.status==="rejected"){app.innerHTML=rejectedPage();return;}
 if(!state.data){app.innerHTML=state.mode==="live"?connectionPage():landing();return;}
 app.innerHTML=shell()+modal();
}
function toast(text){
 document.querySelector(".toast")?.remove();
 const el=document.createElement("div");el.className="toast";el.textContent=text;document.body.append(el);setTimeout(()=>el.remove(),3300);
}
function stopLiveUpdates(){
 clearTimeout(state.realtimeTimer);
 state.realtimeTimer=null;
 if(state.unsubscribe){state.unsubscribe();state.unsubscribe=null;}
 state.subscriptionTeam=null;
}
async function refresh(quiet=false){
 if(!state.team)return;
 if(state.mode==="demo"){state.data=workspace(state.team);render();return;}
 if(state.refreshBusy)return;
 state.refreshBusy=true;
 const previousDraft=quiet?document.querySelector("#compose-form input")?.value:null;
 const requestedTeam=state.team;
 if(!quiet){state.loading=true;render();}
 try{
  const user=await getUser();
  if(state.team!==requestedTeam)return;
  state.user=user;
  state.member=user?await membership(requestedTeam,user.id):null;
  state.data=state.member?.status==="approved"?await liveWorkspace(requestedTeam):null;
  state.error="";
  if(state.member?.status==="approved"){
   if(state.subscriptionTeam!==requestedTeam){
    stopLiveUpdates();
    state.subscriptionTeam=requestedTeam;
    state.unsubscribe=await subscribeTeam(requestedTeam,()=>{
     if(state.team!==requestedTeam||state.mode!=="live")return;
     clearTimeout(state.realtimeTimer);
     state.realtimeTimer=setTimeout(()=>{void refresh(true);},850);
    });
   }
  }else stopLiveUpdates();
 }catch(err){
  state.error=err.message||"Connection failed.";
  state.data=null;stopLiveUpdates();
  if(!quiet)toast(state.error);
 }finally{
  state.loading=false;state.refreshBusy=false;
  render();
  if(quiet&&previousDraft!=null){
   const input=document.querySelector("#compose-form input");
   if(input)input.value=previousDraft;
  }
 }
}

async function chooseTeam(team){
 if(!teams.some(t=>t.id===team))return;
 stopLiveUpdates();state.team=team;sessionStorage.setItem("blueprint-selected-team",team);state.view="overview";state.channel="general";state.filter="all";state.taskScope="all";state.member=null;state.menu=false;
 await refresh();
}
async function dispatchAction(action){
 if(action==="switch-team"||action==="sign-out"||action==="exit-preview"){
  stopLiveUpdates();
  if(action==="sign-out"&&state.mode==="live"){try{await signOut();}catch(err){toast(err.message);}}
  if(action==="exit-preview")state.mode="live";
  state.team=null;state.member=null;state.data=null;state.menu=false;state.modal=null;state.authNotice="";sessionStorage.removeItem("blueprint-selected-team");
  if(action==="sign-out")state.user=null;
  render();return;
 }
 if(action==="open-preview"){
  stopLiveUpdates();state.mode="demo";state.team="1810";state.view="overview";state.user=null;state.member=null;state.modal=null;state.menu=false;
  sessionStorage.setItem("blueprint-selected-team","1810");
  state.data=workspace("1810");render();return;
 }
 if(action==="refresh-live"){await refresh(true);toast("Workspace refreshed.");return;}
 if(action==="menu"){state.menu=!state.menu;render();return;}
 if(action==="close-menu"){state.menu=false;render();return;}
 if(action==="new-task"){if(!canEdit())return;state.editingTaskId=null;state.modal="task";render();return;}
 if(action==="new-log"){if(!canEdit())return;state.modal="log";render();return;}
 if(action==="new-project"){if(!canEdit())return;state.editingProjectId=null;state.modal="project";render();return;}
 if(action==="new-event"){if(!canEdit())return;state.modal="event";render();return;}
 if(action==="new-announcement"){if(!canEdit())return;state.modal="announcement";render();return;}
 if(action==="notifications"){state.modal="notifications";render();return;}
 if(action==="close-modal"){state.modal=null;render();return;}
 if(action==="reset"){if(state.mode!=="demo")return;state.data=reset(state.team);render();toast("Sample data restored.");return;}
 if(action==="google-signin"){try{await googleSignIn();}catch(err){toast(err.message||"Google sign-in is not available yet.");}return;}
 if(action==="refresh-access"){await refresh();return;}
}

app.addEventListener("click",async ev=>{
 if(ev.target.closest(".modal")&&ev.target.closest("[data-action]")?.classList.contains("modal-cover"))return;
 const team=ev.target.closest("[data-team]");if(team){await chooseTeam(team.dataset.team);return;}
 const change=ev.target.closest("[data-view]");if(change){state.view=change.dataset.view;state.menu=false;state.filter="all";state.modal=null;render();return;}
 const filter=ev.target.closest("[data-filter]");if(filter){state.filter=filter.dataset.filter;render();return;}
 const scope=ev.target.closest("[data-task-scope]");if(scope){state.taskScope=scope.dataset.taskScope;render();return;}
 const channel=ev.target.closest("[data-channel]");if(channel){state.channel=channel.dataset.channel;render();return;}
 const edit=ev.target.closest("[data-edit-task]");if(edit&&canEdit()){state.editingTaskId=edit.dataset.editTask;state.modal="task-edit";render();return;}
 const project=ev.target.closest("[data-edit-project]");
 if(project&&canEdit()){state.editingProjectId=project.dataset.editProject;state.modal="project-edit";render();return;}
 const decision=ev.target.closest("[data-decision]");
 if(decision){
  if(!canAdmin())return;
  const parent=decision.closest("[data-request-id]"),id=parent?.dataset.requestId;
  const role=parent?.querySelector("select")?.value||"member";
  const status=decision.dataset.decision;
  if(!id||!["approved","rejected"].includes(status))return;
  try{
   if(state.mode==="demo"){
    const person=state.data.pending.find(x=>x.user_id===id);
    if(!person)return;
    state.data.pending=state.data.pending.filter(x=>x.user_id!==id);
    if(status==="approved")state.data.people.push({id,name:person.name,role,group:person.subgroup,initials:initials(person.name),status:"approved"});
    save(state.team,state.data);render();
   }else{
    await approveMembership(state.team,id,status,role);await refresh();
   }
   toast(status==="approved"?"Membership approved.":"Request rejected.");
  }catch(err){toast("Unable to update request: "+err.message);}
  return;
 }
 const toggle=ev.target.closest("[data-toggle]");
 if(toggle){
  const task=state.data?.tasks.find(t=>String(t.id)===toggle.dataset.toggle);if(!task)return;if(!canToggle(task))return toast("Only an assigned member or lead can change this task.");
  const status=task.status==="done"?"todo":"done";
  if(state.mode==="demo"){task.status=status;save(state.team,state.data);render();}
  else{try{await setLiveTaskStatus(state.team,task.id,status);await refresh();}catch(err){toast("Update rejected: "+err.message);}}
  return;
 }
 const button=ev.target.closest("[data-action]");
 if(button){await dispatchAction(button.dataset.action);}
});
app.addEventListener("change",async ev=>{
 const target=ev.target.closest("[data-role-change]");
 if(!target||!canAdmin())return;
 const id=target.dataset.roleChange,role=target.value;
 if(!["member","lead","captain","mentor","admin"].includes(role)||id===state.user?.id)return;
 try{
  if(state.mode==="demo"){
   const person=state.data.people.find(x=>x.id===id);
   if(person){person.role=role;save(state.team,state.data);render();}
  }else{await updateMemberRole(state.team,id,role);await refresh(true);}
  toast("Member role updated.");
 }catch(err){toast("Role update failed: "+(err.message||"Unknown error"));await refresh(true);}
});
app.addEventListener("submit",async ev=>{
 const form=ev.target;if(!["task-form","task-edit-form","log-form","compose-form","request-form","magic-link-form","project-form","event-form","announcement-form"].includes(form.id))return;
 ev.preventDefault();const f=new FormData(form);
 try{
 if(form.id==="magic-link-form"){
  const email=String(f.get("email")||"").trim();
  await sendMagicLink(email);
  state.authNotice="Check your inbox for the secure sign-in link. Open it in this browser to return to Blueprint.";
  render();return;
 }
 if(form.id==="request-form"){
  const name=String(f.get("name")||"").trim().slice(0,80),subgroup=String(f.get("subgroup")||"");
  if(!name||!groups.includes(subgroup))return toast("Enter a valid name and subgroup.");
  await requestMembership(state.team,state.user,name,subgroup);await refresh();toast("Access request submitted.");return;
 }
 if(form.id==="project-form"){
  if(!canEdit())return toast("Only team leads can edit projects.");
  const name=String(f.get("name")||"").trim().slice(0,100);
  const description=String(f.get("description")||"").trim().slice(0,1500);
  const subgroup=String(f.get("subgroup")||"");
  const progressValue=Number(f.get("progress")||0);
  if(!name||!groups.includes(subgroup)||!Number.isInteger(progressValue)||progressValue<0||progressValue>100)return toast("Check the project fields.");
  const editing=state.modal==="project-edit";
  const changes={name,description,subgroup,progress:progressValue};
  if(state.mode==="demo"){
   if(editing){
    const project=state.data.projects.find(x=>String(x.id)===String(state.editingProjectId));
    if(!project)return;
    Object.assign(project,changes,{lead:subgroup});
   }else state.data.projects.push({id:"demo-project-"+Date.now(),...changes,lead:subgroup,icon:"◇"});
   save(state.team,state.data);
  }else if(editing)await editLiveProject(state.team,state.editingProjectId,changes);
  else await addLiveProject(state.team,name,description,subgroup);
  state.modal=null;state.editingProjectId=null;state.view="projects";
  if(state.mode==="live")await refresh(true);else render();
  toast(editing?"Project updated.":"Project created.");return;
 }
 if(form.id==="event-form"){
  if(!canEdit())return toast("Only team leads can schedule events.");
  const title=String(f.get("title")||"").trim().slice(0,140);
  const raw=String(f.get("start")||"");
  const starts=new Date(raw);
  if(!title||!raw||Number.isNaN(starts.getTime()))return toast("Check the event date and title.");
  if(state.mode==="demo"){
   state.data.events.push({id:"demo-event-"+Date.now(),title,starts_at:starts.toISOString(),day:String(starts.getDate()).padStart(2,"0"),month:starts.toLocaleString("en-US",{month:"short"}).toUpperCase(),details:starts.toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"}),type:"Team"});
   state.data.events.sort((a,b)=>new Date(a.starts_at||0)-new Date(b.starts_at||0));
   save(state.team,state.data);
  }else await addLiveEvent(state.team,title,starts.toISOString(),state.user.id);
  state.modal=null;state.view="calendar";
  if(state.mode==="live")await refresh(true);else render();
  toast("Event scheduled.");return;
 }
 if(form.id==="announcement-form"){
  if(!canEdit())return toast("Only team leads can publish announcements.");
  const title=String(f.get("title")||"").trim().slice(0,140);
  const body=String(f.get("body")||"").trim().slice(0,2000);
  if(!title||!body)return toast("Provide a title and message.");
  if(state.mode==="demo"){
   (state.data.announcements||=([])).unshift({id:"demo-announcement-"+Date.now(),title,body,author:"You (preview)",time:"Just now"});
   save(state.team,state.data);
  }else await addLiveAnnouncement(state.team,title,body,state.user.id);
  state.modal=null;state.view="announcements";
  if(state.mode==="live")await refresh(true);else render();
  toast("Announcement published.");return;
 }
 if(form.id==="task-form"||form.id==="task-edit-form"){
  if(!canEdit())return toast("Only team leads can manage tasks.");
  const editing=form.id==="task-edit-form";
  const title=String(f.get("title")||"").trim().slice(0,140),subgroup=String(f.get("subgroup")||"");
  const priority=String(f.get("priority")||"Normal"),dueDate=String(f.get("due_date")||"");
  const assignedTo=String(f.get("assigned_to")||"")||null;
  const status=String(f.get("status")||"todo");
  if(!title||!groups.includes(subgroup)||!["Low","Normal","High"].includes(priority)||!["todo","in_progress","blocked","done"].includes(status))return toast("Check the task fields.");
  if(assignedTo&&!state.data.people.some(p=>p.id===assignedTo))return toast("Choose an approved team member.");
  if(dueDate&&!/^\d{4}-\d{2}-\d{2}$/.test(dueDate))return toast("Enter a valid due date.");
  const changes={title,subgroup,priority,assigned_to:assignedTo,due_date:dueDate||null,status};
  if(state.mode==="demo"){
   if(editing){const t=state.data.tasks.find(x=>String(x.id)===String(state.editingTaskId));if(!t)return;Object.assign(t,changes,{due:dueDate||"Not scheduled"});}
   else state.data.tasks.unshift({id:"t"+Date.now(),...changes,due:dueDate||"Not scheduled"});
   save(state.team,state.data);
  }else{
   if(editing)await editLiveTask(state.team,state.editingTaskId,changes);
   else await addLiveTask(state.team,title,subgroup,state.user.id,assignedTo,dueDate,priority);
  }
  state.editingTaskId=null;state.modal=null;state.view="tasks";

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
