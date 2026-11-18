import {teams,groups,channels,workspace,save,reset,progress} from "./data.js";
import {roleLabels,rolePreviewOptions,canManageTeam,canManageWork,roleIsPreviewable} from "./roles.js";
import {avatarColors,avatarColorNames,avatarClass,localDateTime} from "./profile.js";
import {safeReferenceUrl,reportReasons,fabricationMethods,fabricationStatuses,fabricationLabels,fabricationStatusLabels,engineeringKinds} from "./engineering.js";
import {inventoryUnits,milestoneStatuses,milestoneLabels,stockCoverage,milestonesFor,milestoneProgress,validQuantity} from "./planning.js";
import {configured,getUser,googleSignIn,signOut,membership,requestMembership,liveWorkspace,addLiveTask,editLiveTask,setLiveTaskStatus,addLiveLog,editLiveLog,sendLiveMessage,approveMembership,updateMemberRole,sendMagicLink,addLiveProject,editLiveProject,addLiveEvent,editLiveEvent,addLiveAnnouncement,getLiveProfile,saveLiveProfile,updateOwnSubgroup,subscribeTeam,reportTeamMessage,reviewTeamReport,setMessageVisibility,createEngineeringLink,deleteEngineeringLink,requestPart,setPartStatus,createInventoryItem,updateInventoryItem,createBomLine,updateBomLine,removeBomLine,createProjectMilestone,updateProjectMilestone,removeProjectMilestone} from "./supabase.js";

const app=document.getElementById("app");
const state={team:sessionStorage.getItem("blueprint-selected-team")||null,view:"overview",filter:"all",channel:"general",modal:null,menu:false,editingTaskId:null,editingProjectId:null,editingLogId:null,editingEventId:null,editingStockId:null,editingBomId:null,editingMilestoneId:null,planningProjectId:null,reportMessageId:null,linkProjectId:null,profile:null,authNotice:"",unsubscribe:null,subscriptionTeam:null,refreshBusy:false,realtimeTimer:null,taskScope:"all",rolePreview:null,mode:configured()?"live":"demo",user:null,member:null,data:null,loading:false,error:""};
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
function button(text,action,kind=""){
 const locked=previewReadOnly()&&["new-task","new-log","new-project","new-event","new-announcement","new-part","new-stock"].includes(action);
 return '<button class="btn '+kind+'" type="button" data-action="'+action+'" '+(locked?"disabled":"")+'>'+text+'</button>';
}
function currentTeam(){return teams.find(t=>t.id===state.team)||teams[0];}
function initials(name){return String(name||"").split(/\s+/).map(x=>x[0]||"").join("").slice(0,2).toUpperCase();}
function currentProfile(){return state.mode==="demo"?(state.data?.profile||{}):(state.profile||{});}
function avatarHtml(name,color,extra=""){return '<span class="avatar '+avatarClass(color)+' '+extra+'">'+e(initials(name)||"BP")+'</span>';}
function statusName(status){return ({done:"Complete",in_progress:"In progress",todo:"To do",blocked:"Blocked"})[status]||"To do";}
function pill(status){return '<span class="pill '+(status==="done"?"complete":status==="in_progress"?"active":status==="blocked"?"blocked":"")+'">'+statusName(status)+'</span>';}
function notice(message){return '<div class="notice">'+icon("info",15)+'<span>'+message+'</span></div>';}
function sampleNote(){return state.mode==="demo"?notice('<b>Preview workspace.</b> Names, tasks and activity shown here are fictional sample data. Changes are saved locally in this browser only.'):"";}
function heading(eyebrow,title,description,extra=""){return '<header class="page-heading"><div><span class="eyebrow">'+e(eyebrow)+'</span><h1>'+e(title)+'</h1><p>'+e(description)+'</p></div><div class="actions">'+extra+'</div></header>';}
function section(title,action="",content=""){return '<section class="card pad"><div class="section-heading"><h2>'+e(title)+'</h2>'+action+'</div>'+content+'</section>';}
function actualRole(){return state.mode==="demo"?"owner":state.member?.role||"member";}
function mayPreview(){return state.mode==="demo"||(state.member?.status==="approved"&&state.member?.role==="owner");}
function effectiveRole(){return mayPreview()&&roleIsPreviewable(state.rolePreview)?state.rolePreview:actualRole();}
function previewReadOnly(){return mayPreview()&&roleIsPreviewable(state.rolePreview);}
function previewSelector(slot="sidebar"){
 if(!mayPreview())return "";
 return '<div class="role-switch"><label for="role-preview-'+slot+'">VIEW ROLE AS</label><select id="role-preview-'+slot+'" class="role-switch-select" data-preview-role aria-label="Preview workspace as role"><option value="actual" '+(!previewReadOnly()?"selected":"")+'>Actual access · '+roleLabels[actualRole()]+'</option>'+rolePreviewOptions.map(role=>'<option value="'+role+'" '+(effectiveRole()===role?"selected":"")+'>'+roleLabels[role]+'</option>').join("")+'</select><small>View only · No permission changes</small></div>';
}
function previewBanner(){
 return previewReadOnly()?'<div class="role-preview-banner" role="status"><div><b>Viewing as '+roleLabels[effectiveRole()]+'</b><span>Visual preview only. Your real access stays '+roleLabels[actualRole()]+'. All edits are disabled. Test accounts are needed to verify database permissions.</span></div><button type="button" class="btn small" data-action="end-role-preview">Exit preview</button></div>':"";
}
function canToggle(t){return !previewReadOnly()&&(canEdit()||(state.mode==="demo"?Boolean(t.assigned_to):Boolean(t.assigned_to&&t.assigned_to===state.user?.id)));}
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
 const priorities=section(
  "Your team's priorities",
  '<button data-view="tasks">View all tasks →</button>',
  upcoming
 );
 const season=section(
  "Season progress","",
  '<div class="progress-head"><b>Task completion</b><span>'+p+'%</span></div>'+
  '<div class="track"><i style="width:'+p+'%"></i></div>'+
  '<p class="hint">'+done+' completed · '+open+' remaining. Keep the next handoff visible.</p>'
 );
 const activity=section(
  "Latest build activity",
  '<button data-view="logs">Open build log →</button>',
  updates
 );
 const calendar=section(
  "Coming up",
  '<button data-view="calendar">Full schedule →</button>',
  d.events.slice(0,3).map(x=>
   '<div class="feed"><div class="feed-icon">'+icon("calendar",15)+'</div>'+
   '<div class="feed-text"><b>'+e(x.title)+'</b><p>'+e(x.details)+'</p></div></div>'
  ).join("")||'<div class="empty">No upcoming events.</div>'
 );
 const teamNotices=section(
  "Team notices",
  '<button data-view="announcements">View all →</button>',
  (d.announcements||[]).slice(0,2).map(x=>
   '<div class="feed"><div class="feed-icon">'+icon("bell",15)+'</div>'+
   '<div class="feed-text"><b>'+e(x.title)+'</b><p>'+e(x.body)+'</p></div></div>'
  ).join("")||'<div class="empty">No announcements yet.</div>'
 );
 const digest=section(
  "Blueprint brief","",
  '<div class="hint">An optional nightly engineering digest is planned for a future release. No AI summaries or notifications are enabled.</div>'
 );
 // Row-first order balances the empty-state cards instead of leaving a large
 // unused block below the left column on teams with little activity.
 return heading(
  "TEAM WORKSPACE","A clearer way to build.","Your projects, people, and progress in one place.",
  '<span class="demo-label">'+(state.mode==="demo"?"DEMO WORKSPACE":"CONNECTED WORKSPACE")+'</span>'
 )+sampleNote()+'<div class="stats">'+statHtml+'</div>'+
 '<div class="overview-grid">'+priorities+season+activity+calendar+teamNotices+digest+'</div>';
}

function renderTasks(){
 const tasks=state.data.tasks.filter(t=>(state.filter==="all"||t.status===state.filter)&&(state.taskScope==="all"||(state.mode==="demo"?t.assigned_to!=null:t.assigned_to===state.user?.id)));
 const allowed=canEdit();
 const statusFilters=[["all","All statuses"],["todo","To do"],["in_progress","In progress"],["blocked","Blocked"],["done","Complete"]];
 const scope='<div class="scope-switch"><button data-task-scope="all" class="'+(state.taskScope==="all"?"active":"")+'">Team tasks</button><button data-task-scope="mine" class="'+(state.taskScope==="mine"?"active":"")+'">'+(state.mode==="demo"?"Assigned tasks":"My tasks")+'</button></div>';
 return heading("PROJECT COORDINATION","Tasks & assignments","Clear ownership, useful deadlines, fewer missed handoffs.",allowed?button(icon("plus",15)+" New task","new-task","primary"):"")+sampleNote()+'<div class="task-toolbar">'+scope+'<div class="filter-row">'+statusFilters.map(x=>'<button class="filter '+(state.filter===x[0]?"active":"")+'" data-filter="'+x[0]+'">'+x[1]+'</button>').join("")+'</div></div><div>'+tasks.map(t=>'<div class="card entry"><button data-toggle="'+e(t.id)+'" aria-label="Toggle '+e(t.title)+'" class="task-check '+(t.status==="done"?"done":"")+'" '+(canToggle(t)?"":"disabled")+'></button><div class="entry-main"><b>'+e(t.title)+'</b><small>'+e(t.subgroup)+' · '+e(assignee(t))+' · Due '+e(t.due)+' · '+e(t.priority)+' priority</small></div>'+pill(t.status)+(allowed?'<div class="entry-actions"><button type="button" class="btn small" data-edit-task="'+e(t.id)+'">'+icon("pencil",13)+' Edit</button></div>':"")+'</div>').join("")+'</div>'+(tasks.length?"":'<div class="empty">No tasks match this view.</div>');
}
function renderLogs(){
 const entries=state.data.logs.map(l=>
  '<article class="log"><div class="record-title"><h3>'+e(l.title)+'</h3>'+
  (canEdit()?'<button type="button" class="btn small record-edit" data-edit-log="'+e(l.id)+'">'+icon("pencil",13)+' Edit</button>':"")+
  '</div><p>'+e(l.body)+'</p><small>'+e(l.subgroup)+' · '+e(l.author)+' · '+e(l.time)+
  (l.edited_at?' · Edited by '+e(l.edited_by||"Team lead"):"")+'</small></article>'
 ).join("");
 return heading("ENGINEERING HISTORY","Build log","Keep a reliable record of what changed, why it changed, and what comes next.",canEdit()?button(icon("plus",15)+" Add entry","new-log","primary"):"")+sampleNote()+section("Recent changes","",'<div class="timeline">'+(entries||'<div class="empty">No updates yet.</div>')+'</div>');
}
function renderProjects(){
 const coverage=new Map(stockCoverage(state.data.inventory||[],state.data.bom||[]).map(i=>[i.id,i]));
 const cards=state.data.projects.map(p=>{
  const references=(state.data.projectLinks||[]).filter(link=>link.project_id===p.id);
  const links=references.map(link=>{
   const url=safeReferenceUrl(link.url);
   return '<div class="reference-line">'+(url?'<a href="'+e(url)+'" target="_blank" rel="noopener noreferrer">'+e(link.title)+'</a>':'<span>Invalid reference</span>')+
    '<small>'+e(link.kind.toUpperCase())+'</small>'+
    (canEdit()?'<button type="button" class="subtle-action" data-remove-reference="'+e(link.id)+'" aria-label="Remove reference '+e(link.title)+'">Remove</button>':"")+'</div>';
  }).join("");
  const bom=(state.data.bom||[]).filter(b=>b.project_id===p.id);
  const bomHtml=bom.map(b=>{
   const stock=coverage.get(b.inventory_id);
   return '<div class="planning-line"><div><b>'+e(stock?.name||"Unavailable stock item")+'</b>'+
    '<small>Need '+Number(b.quantity_required)+' '+e(stock?.unit||"each")+
    ' · Stock '+Number(stock?.quantity_on_hand||0)+
    (stock?.shortfall>0?' · <strong class="shortage-text">Team short '+stock.shortfall+'</strong>':"")+'</small></div>'+
    (canEdit()?'<button type="button" class="subtle-action" data-edit-bom="'+e(b.id)+'">Edit</button>':"")+'</div>';
  }).join("");
  const milestones=milestonesFor(state.data.milestones||[],p.id);
  const milestonesHtml=milestones.map(m=>
   '<div class="planning-line"><div><b>'+e(m.title)+'</b><small>'+e(milestoneLabels[m.status]||"Planned")+
   (m.due_on?' · Due '+e(m.due_on):"")+'</small></div>'+
   (canEdit()?'<button type="button" class="subtle-action" data-edit-milestone="'+e(m.id)+'">Edit</button>':"")+'</div>'
  ).join("");
  return '<article class="card project"><div class="project-icon">'+e(p.icon||"◇")+'</div><h3>'+e(p.name)+'</h3><p>'+e(p.description)+'</p>'+
   '<div class="project-foot"><small>'+e(p.lead||p.subgroup||"General")+' · '+Number(p.progress||0)+'% progress</small>'+
   '<div class="track"><i style="width:'+Math.max(0,Math.min(100,Number(p.progress)||0))+'%"></i></div>'+
   '<div class="project-references"><div class="reference-heading">ENGINEERING REFERENCES</div>'+
   (links||'<small class="muted">No CAD or drawing links attached yet.</small>')+
   (canEdit()?'<button type="button" class="btn small" data-add-reference="'+e(p.id)+'">'+icon("plus",13)+' Add reference</button>':"")+'</div>'+
   '<div class="planning-panel"><div class="planning-panel-heading"><b>BILL OF MATERIALS</b><span>'+bom.length+' lines</span></div>'+
   (bomHtml||'<small class="muted">No catalog parts required yet.</small>')+
   (canEdit()?'<button type="button" class="btn small" data-add-bom="'+e(p.id)+'">'+icon("plus",13)+' Add BOM item</button>':"")+'</div>'+
   '<div class="planning-panel"><div class="planning-panel-heading"><b>MILESTONES</b><span>'+milestoneProgress(milestones)+'% done</span></div>'+
   (milestonesHtml||'<small class="muted">No milestones planned yet.</small>')+
   (canEdit()?'<button type="button" class="btn small" data-add-milestone="'+e(p.id)+'">'+icon("plus",13)+' Add milestone</button>':"")+'</div>'+
   (canEdit()?'<div class="project-edit-actions"><button type="button" class="btn small" data-edit-project="'+e(p.id)+'">'+icon("pencil",13)+' Edit project</button></div>':"")+'</div></article>';
 }).join("");
 return heading("THE ROBOT","Projects & subsystems","CAD references, build requirements and milestones organized by robot subsystem.",canEdit()?button(icon("plus",15)+" New project","new-project","primary"):"")+
  sampleNote()+'<div class="grid-three">'+(cards||'<div class="empty">No projects yet. A team lead can create the first one.</div>')+'</div>';
}
function renderInventory(){
 const rows=stockCoverage(state.data.inventory||[],state.data.bom||[]);
 const short=rows.filter(x=>x.shortfall>0).length;
 const low=rows.filter(x=>x.lowStock).length;
 const cards=rows.map(item=>{
  const labels=[
   ['On hand',item.quantity_on_hand],
   ['Needed on BOMs',item.required],
   ['Reorder threshold',item.reorder_at]
  ].map(([name,value])=>'<div class="stock-stat"><small>'+name+'</small><b>'+Number(value||0)+'</b></div>').join("");
  return '<article class="card stock-card"><div class="stock-card-top"><div><span class="eyebrow">'+e(item.sku||"CATALOG PART")+'</span>'+
   '<h3>'+e(item.name)+'</h3><small>'+e(item.unit)+' · '+e(item.storage_location||"Unassigned location")+'</small></div>'+
   (item.shortfall>0?'<span class="pill blocked">Short '+item.shortfall+'</span>':
    item.lowStock?'<span class="pill">At reorder threshold</span>':'<span class="pill complete">Available</span>')+'</div>'+
   '<div class="stock-stats">'+labels+'</div>'+
   (item.notes?'<p class="stock-notes">'+e(item.notes)+'</p>':"")+
   (canEdit()?'<button class="btn small" type="button" data-edit-stock="'+e(item.id)+'">'+icon("pencil",13)+' Edit stock</button>':"")+
   '</article>';
 }).join("");
 return heading("MATERIALS","Parts inventory","Catalog team parts and compare available stock against all project bills of materials.",
  canEdit()?button(icon("plus",15)+" Add stock item","new-stock","primary"):"")+
  sampleNote()+
  '<div class="planning-summary"><span>'+rows.length+' catalog items</span><span>'+short+' shortages</span><span>'+low+' at reorder threshold</span></div>'+
  '<div class="stock-grid">'+(cards||'<div class="empty">No stock items yet. A team lead can create the catalog.</div>')+'</div>'+
  '<p class="hint">BOM quantities represent planned requirements across projects. Available stock counts are entered by your team and are not automatically decremented.</p>';
}

function renderPeople(){
 const cards=state.data.people.map(p=>
  '<article class="card person">'+avatarHtml(p.name,p.avatar_color)+
  '<div class="person-details"><h3>'+e(p.name)+'</h3><small>'+e(roleLabels[p.role]||p.role)+' · '+e(p.group)+'</small>'+
  (p.headline?'<p class="person-headline">'+e(p.headline)+'</p>':"")+
  (p.bio?'<p class="person-bio">'+e(p.bio)+'</p>':"")+'</div></article>'
 ).join("");
 return heading("PEOPLE & ROLES","Team directory","Find the right person or subgroup for the next step.")+sampleNote()+'<div class="people">'+(cards||'<div class="empty">The directory will populate when members join.</div>')+'</div>';
}
function renderCalendar(){
 const cards=state.data.events.map(ev=>
  '<div class="card event"><div class="event-date"><b>'+e(ev.day)+'</b><small>'+e(ev.month)+'</small></div>'+
  '<div class="event-info"><b>'+e(ev.title)+'</b><small>'+e(ev.details)+
  (ev.edited_at?' · Updated by '+e(ev.edited_by||"Team lead"):"")+'</small></div>'+
  '<span class="pill">'+e(ev.type)+'</span>'+
  (canEdit()?'<button type="button" class="btn small record-edit" data-edit-event="'+e(ev.id)+'">'+icon("pencil",13)+' Edit</button>':"")+
  '</div>'
 ).join("");
 return heading("LOOKING AHEAD","Schedule","Build meetings, reviews, and important team milestones.",canEdit()?button(icon("plus",15)+" New event","new-event","primary"):"")+sampleNote()+'<div class="events">'+(cards||'<div class="empty">No events are scheduled yet.</div>')+'</div>';
}
function renderAnnouncements(){
 const cards=(state.data.announcements||[]).map(x=>'<article class="card pad" style="margin-bottom:12px"><div class="eyebrow">'+e(x.author)+' · '+e(x.time)+'</div><h3 style="font-size:15px;letter-spacing:-.3px;margin:12px 0 6px">'+e(x.title)+'</h3><p style="font-size:12px;line-height:1.8;color:#75838a;white-space:pre-wrap;margin:0">'+e(x.body)+'</p></article>').join("");
 return heading("TEAM UPDATES","Announcements","Important information, without getting lost in a conversation.",canEdit()?button(icon("plus",15)+" Publish update","new-announcement","primary"):"")+sampleNote()+(cards||'<div class="empty">Nothing posted yet. Team leads can publish the first update.</div>');
}

function canAdmin(){return canManageTeam(effectiveRole());}
function renderAdmin(){
 if(!canAdmin())return heading("PERMISSIONS","Access restricted","Only team administrators can review membership requests.");
 const waiting=state.data.pending||[];
 const list=waiting.map(m=>'<div class="approval-row" data-request-id="'+e(m.user_id)+'"><span class="avatar">'+e(initials(m.name))+'</span><div class="approval-info"><b>'+e(m.name)+'</b><small>'+e(m.subgroup)+' · Pending approval</small></div><label class="sr-only" for="role-'+e(m.user_id)+'">Role for '+e(m.name)+'</label><select class="field role-select" id="role-'+e(m.user_id)+'">'+["member","lead","captain","mentor","admin"].map(role=>'<option value="'+role+'">'+role[0].toUpperCase()+role.slice(1)+'</option>').join("")+'</select><div class="approval-actions"><button type="button" class="btn small" data-decision="rejected">Reject</button><button type="button" class="btn primary small" data-decision="approved">Approve</button></div></div>').join("");
 const members=state.data.people.map(m=>'<div class="approval-row" data-member-id="'+e(m.id)+'"><span class="avatar">'+e(m.initials||initials(m.name))+'</span><div class="approval-info"><b>'+e(m.name)+'</b><small>'+e(m.group)+'</small></div>'+(m.role==="owner"?'<span class="pill">Owner · protected</span>':m.id===state.user?.id?'<span class="pill">'+e(m.role)+' (you)</span>':'<label class="sr-only" for="access-'+e(m.id)+'">Role for '+e(m.name)+'</label><select id="access-'+e(m.id)+'" class="field role-select" data-role-change="'+e(m.id)+'">'+["member","lead","captain","mentor","admin"].map(role=>'<option value="'+role+'" '+(m.role===role?"selected":"")+'>'+role[0].toUpperCase()+role.slice(1)+'</option>').join("")+'</select>')+'</div>').join("");
 return heading("TEAM OPERATIONS","Membership review","Approve verified team members and manage their access.")+sampleNote()+notice('<b>Verify identities first.</b> Approval grants access to private team records. Confirm each student with a mentor outside Blueprint.')+section("Pending requests",'<span class="pill">'+waiting.length+' pending</span>',list||'<div class="empty">No pending membership requests.</div>')+'<div style="height:18px"></div>'+section("Approved members","",members||'<div class="empty">No approved members yet.</div>')+'<p class="hint">Members can read team records and use channels. Leads, captains and mentors can manage projects, tasks and announcements. Administrators control regular roles and membership approval. Owners have the highest team access and cannot be created or demoted from this interface.</p>';
}

function renderMessages(){
 const messages=(state.data.messages[state.channel]||[]).filter(m=>!m.hidden||canAdmin()).map(m=>{
  const moderator=canAdmin();
  return '<div class="message '+(m.hidden?"message-muted":"")+'"><div class="avatar">'+e(m.initials||initials(m.author))+'</div>'+
   '<div class="message-content"><div class="message-header"><b>'+e(m.author)+'</b><small>'+e(m.time)+'</small></div>'+
   (m.hidden?'<small class="moderation-label">Hidden by a team moderator · visible to administrators</small>':"")+
   '<p>'+e(m.text)+'</p><div class="message-actions">'+
   (!m.hidden?'<button type="button" class="subtle-action" data-report-message="'+e(m.id)+'">Report</button>':"")+
   (moderator?'<button type="button" class="subtle-action" data-message-visibility="'+e(m.id)+'" data-visible="'+(m.hidden?"yes":"no")+'">'+(m.hidden?"Restore":"Hide")+'</button>':"")+
   '</div></div></div>';
 }).join("");
 return heading("CONVERSATIONS","Team messages","Subgroup channels with a private, administrator-reviewed report option.")+
  sampleNote()+'<div class="card chat"><aside class="channels"><h3>CHANNELS</h3>'+
  channels.map(c=>'<button class="channel '+(state.channel===c?"active":"")+'" data-channel="'+c+'"># '+e(c)+'</button>').join("")+
  '</aside><section class="conversation"><div class="chat-head"><b># '+e(state.channel)+'</b><small>Team '+e(state.team)+
  ' · '+(state.mode==="demo"?"Local preview":"Team channel")+'</small></div><div class="messages">'+
  (messages||'<div class="empty">Start the conversation.</div>')+'</div>'+
  '<form class="compose" id="compose-form"><input class="field" name="body" maxlength="1000" placeholder="Message #'+e(state.channel)+
  '" aria-label="Message" required><button class="btn primary" type="submit">Send '+icon("arrow",14)+'</button></form></section></div>';
}
function renderManufacturing(){
 const requests=state.data.partRequests||[];
 const cards=requests.map(item=>{
  const project=state.data.projects.find(p=>p.id===item.project_id);
  return '<article class="card manufacture-item"><div class="manufacture-head"><div><span class="eyebrow">'+e(fabricationLabels[item.method]||"Other")+'</span>'+
   '<h3>'+e(item.part_name)+'</h3></div><span class="pill">'+e(fabricationStatusLabels[item.status]||"Requested")+'</span></div>'+
   '<p>'+e(item.notes||"No additional notes.")+'</p><small>Quantity: '+Number(item.quantity||1)+' · '+e(project?.name||"General team")+'</small>'+
   (canEdit()?'<div class="manufacture-update"><label for="part-'+e(item.id)+'">Progress</label><select id="part-'+e(item.id)+'" class="field" data-part-status="'+e(item.id)+'">'+
    fabricationStatuses.map(st=>'<option value="'+st+'" '+(item.status===st?"selected":"")+'>'+fabricationStatusLabels[st]+'</option>').join("")+'</select></div>':"")+'</article>';
 }).join("");
 return heading("FABRICATION","Manufacturing requests","Request parts and follow them from approval to completion.",button(icon("plus",15)+" Request a part","new-part","primary"))+
  sampleNote()+'<div class="manufacture-board">'+(cards||'<div class="empty">No manufacturing requests yet.</div>')+'</div>';
}
function renderSafety(){
 if(!canAdmin())return heading("TEAM SAFETY","Restricted","Only team administrators can review reports and activity history.");
 const reports=state.data.reports||[];
 const open=reports.filter(r=>r.status==="open");
 const resolved=reports.filter(r=>r.status!=="open");
 const reportCard=r=>{
  const allMessages=Object.values(state.data.messages).flat();
  const message=allMessages.find(m=>m.id===r.message_id);
  const reporter=state.data.people.find(p=>p.id===r.reporter_id)?.name||"Team member";
  return '<article class="card safety-item"><div class="report-header"><span class="eyebrow">'+e(r.reason.toUpperCase())+'</span><span class="pill">'+e(r.status)+'</span></div>'+
   '<h3>Message report</h3><p>'+e(r.note||"No additional context supplied.")+'</p>'+
   '<small>Submitted by '+e(reporter)+' · '+e(new Date(r.created_at).toLocaleString())+'</small>'+
   (message?'<div class="reported-excerpt"><b>Reported message</b><p>'+e(message.text)+'</p></div>':'<p class="hint">Reported message may be hidden or outside the latest 300 messages.</p>')+
   (r.status==="open"?'<div class="report-actions"><button type="button" class="btn small" data-review-report="'+e(r.id)+'" data-report-status="dismissed">Dismiss report</button>'+
    '<button type="button" class="btn primary small" data-review-report="'+e(r.id)+'" data-report-status="reviewed">Mark reviewed</button></div>':"")+'</article>';
 };
 const history=(state.data.activity||[]).map(x=>
  '<div class="activity-row"><div><b>'+e(x.action.replaceAll("_"," "))+'</b><small>'+e(x.subject_type)+' · '+e(x.actor)+'</small></div>'+
  '<small>'+e(new Date(x.created_at).toLocaleString())+'</small></div>'
 ).join("");
 return heading("TEAM SAFETY","Moderation & activity","Review reports, hide harmful messages in team channels and inspect an append-only history.")+
  sampleNote()+notice('Reports are private. Only team administrators can review them. Messages are hidden rather than deleted so records remain available for review.')+
  section("Needs review",'<span class="pill">'+open.length+' open</span>',
   open.map(reportCard).join("")||'<div class="empty">No outstanding reports.</div>')+
  '<div class="dashboard-spacer"></div>'+
  section("Resolved reports","",resolved.slice(0,20).map(reportCard).join("")||'<div class="empty">No resolved reports.</div>')+
  '<div class="dashboard-spacer"></div>'+section("Activity history","",
   history||'<div class="empty">No recorded moderation or engineering changes yet.</div>');
}

function renderProfile(){
 const p=currentProfile();
 const name=p.full_name||state.user?.user_metadata?.full_name||"Team member";
 const subgroup=state.mode==="demo"?(p.subgroup||"Design"):(state.member?.subgroup||"Design");
 const colors=avatarColors.map(c=>
  '<label class="profile-swatch '+((p.avatar_color||"slate")===c?"selected":"")+'"><input type="radio" name="avatar_color" value="'+c+'" '+((p.avatar_color||"slate")===c?"checked":"")+'>'+
  '<span class="profile-swatch-dot '+avatarClass(c)+'" aria-hidden="true"></span><small>'+avatarColorNames[c]+'</small></label>'
 ).join("");
 const card='<div class="profile-hero card">'+avatarHtml(name,p.avatar_color,"avatar-large")+
  '<div><span class="eyebrow">YOUR IDENTITY</span><h2>'+e(name)+'</h2><p>'+e(p.headline||"Blueprint team member")+'</p>'+
  '<span class="pill">'+e(roleLabels[actualRole()]||"Member")+' · Team '+e(state.team)+'</span></div></div>';
 const form='<form id="profile-form" class="card pad profile-form">'+
  '<div class="section-heading"><h2>Personal details</h2><span class="pill">Visible to approved teammates</span></div>'+
  '<div class="form-duo"><div class="form-group"><label for="profile-name">Display name</label><input id="profile-name" class="field" name="full_name" maxlength="80" required value="'+e(name)+'"></div>'+
  '<div class="form-group"><label for="profile-group">Your subgroup</label><select id="profile-group" class="field" name="subgroup">'+groups.map(g=>'<option '+(g===subgroup?"selected":"")+'>'+e(g)+'</option>').join("")+'</select></div></div>'+
  '<div class="form-group"><label for="profile-headline">Short headline</label><input id="profile-headline" class="field" name="headline" maxlength="80" value="'+e(p.headline||"")+'" placeholder="e.g. CAD and manufacturing"></div>'+
  '<div class="form-group"><label for="profile-bio">About you</label><textarea id="profile-bio" class="field" name="bio" maxlength="300" placeholder="Skills, projects and interests you want teammates to know">'+e(p.bio||"")+'</textarea><small class="field-help">Up to 300 characters. Keep private contact information out of your bio.</small></div>'+
  '<fieldset class="profile-palette"><legend>Avatar color</legend><div class="profile-swatches">'+colors+'</div></fieldset>'+
  '<div class="profile-form-footer"><span class="field-help">Your role is managed by team administrators. Your email is not shown to other members.</span>'+
  '<button type="submit" class="btn primary" '+(previewReadOnly()?"disabled":"")+'>'+icon("check",15)+' Save profile</button></div></form>';
 return heading("PERSONALIZE","My profile","Choose how your teammates see you while keeping your account secure.")+sampleNote()+card+form;
}

function renderSettings(){
 const inspector=mayPreview()?'<div class="setting-row"><div><b>Role inspector</b><small>See what each role sees without changing real permissions. Use separate test accounts to verify server-side access.</small></div>'+previewSelector("settings")+'</div>':"";
 return heading("PREFERENCES","Workspace settings","Your current team and preview configuration.")+'<section class="card pad"><div class="setting-row"><div><b>Current team</b><small>'+e(currentTeam().name)+' · Team '+e(state.team)+'</small></div>'+button("Switch team","switch-team")+'</div><div class="setting-row"><div><b>Data connection</b><small>'+(state.mode==="demo"?"Demo data is stored in this browser only.":"Connected to a configured Supabase project.")+'</small></div><span class="pill">'+(state.mode==="demo"?"Demo":"Supabase")+'</span></div><div class="setting-row"><div><b>Google authentication</b><small>'+(state.mode==="demo"?"Sign-in is simulated in sample mode.":"Email sign-in is coded. Google sign-in requires provider setup in Supabase.")+'</small></div><span class="pill">'+(state.mode==="demo"?"Sample":"Review settings")+'</span></div>'+'<div class="setting-row"><div><b>My profile</b><small>Change your name, bio, subgroup and avatar.</small></div>'+button("Customize profile","open-profile","primary")+'</div>'+(state.mode==="demo"?'<div class="setting-row"><div><b>Reset sample changes</b><small>Restore the original fictional tasks, build logs and messages.</small></div>'+button("Reset preview","reset")+'</div><div class="setting-row"><div><b>Connect to live Blueprint</b><small>Leave the fictional sample workspace and sign into your real team.</small></div>'+button("Go live","exit-preview","primary")+'</div>':"")+inspector+'</section>';
}
function canEdit(){return canManageWork(effectiveRole());}
function sidebar(){
 const navigation=a("overview","Overview","overview")+a("announcements","Announcements","bell")+a("tasks","Tasks","tasks")+a("logs","Build log","logs")+a("projects","Robot projects","projects")+a("manufacturing","Manufacturing","projects")+a("inventory","Inventory","projects")+a("messages","Messages","messages")+a("calendar","Calendar","calendar")+a("people","Members","people");
 return '<div class="screen '+(state.menu?"show":"")+'" data-action="close-menu"></div><aside class="side '+(state.menu?"open":"")+'"><div class="wordmark"><span class="logo">b.</span>blueprint<span class="period">.</span></div><button class="team-picker" data-action="switch-team"><span class="team-box">'+e(state.team)+'</span><span><b>'+e(currentTeam().name)+'</b><small>Team workspace</small></span><span class="chev">'+icon("chevron",14)+'</span></button>'+previewSelector("sidebar")+'<div class="side-caption">WORKSPACE</div><nav class="nav" aria-label="Workspace">'+navigation+'</nav><div class="side-caption">GENERAL</div><nav class="nav" aria-label="General">'+(canAdmin()?a("admin","Membership","people")+a("safety","Moderation","info"):"")+a("profile","My profile","people")+a("settings","Settings","settings")+'</nav><div class="side-bottom">'+avatarHtml(currentProfile().full_name||state.user?.user_metadata?.full_name||"Preview User",currentProfile().avatar_color)+'<div><b>'+(state.mode==="demo"?"Preview user":e(currentProfile().full_name||state.user?.user_metadata?.full_name||"Team member"))+'</b><small>'+(state.mode==="demo"?"Demo workspace":e(roleLabels[actualRole()]||"Member"))+'</small></div><button class="push" data-action="sign-out" aria-label="Leave workspace">'+icon("logout",17)+'</button></div></aside>';
}
function shell(){
 const views={overview:renderOverview,announcements:renderAnnouncements,tasks:renderTasks,logs:renderLogs,projects:renderProjects,messages:renderMessages,calendar:renderCalendar,people:renderPeople,admin:renderAdmin,safety:renderSafety,manufacturing:renderManufacturing,inventory:renderInventory,profile:renderProfile,settings:renderSettings};
 const labels={overview:"Overview",announcements:"Announcements",tasks:"Tasks",logs:"Build log",projects:"Robot projects",messages:"Messages",calendar:"Calendar",people:"Members",admin:"Membership",safety:"Moderation",manufacturing:"Manufacturing",inventory:"Inventory",profile:"My profile",settings:"Settings"};
 return '<div class="shell">'+sidebar()+'<main class="main"><div class="bar"><div class="actions"><button class="round-button mobile-toggle" data-action="menu" aria-label="Open menu">'+icon("menu")+'</button><div class="crumb">Team '+e(state.team)+' <span>/</span> '+labels[state.view]+'</div></div><div class="bar-right"><span class="eyebrow" style="letter-spacing:.8px">'+new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})+'</span><button class="round-button" aria-label="Refresh workspace" data-action="refresh-live" title="Refresh workspace">↻</button><button class="round-button" aria-label="Notifications" data-action="notifications">'+icon("bell")+'</button><span class="bar-avatar">'+(state.mode==="demo"?"BP":"TM")+'</span></div></div>'+previewBanner()+'<div class="content enter">'+(views[state.view]||renderOverview)()+'</div></main></div>';
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
 return '<div class="landing"><div class="landing-top"><div class="wordmark"><span class="logo">b.</span>blueprint<span class="period">.</span></div>'+button("Switch team","switch-team")+'</div><main class="landing-inner signin"><span class="team-box">'+e(t.id)+'</span><span class="eyebrow">'+e(t.name)+'</span><h1>'+(!state.user?"Welcome to Blueprint.":"Join the workspace.")+'</h1><p>'+(!state.user?"Sign in to request access to your private team workspace. A mentor or team administrator must approve every new member.":"Choose your subgroup and request approval from a team administrator.")+'</p>'+subtitle+form+'<div class="access-actions">'+button("Explore sample workspace","open-preview")+(state.user?button("Sign out / switch account","sign-out"):"")+'</div></main></div>';
}

function waitingPage(){
 return '<div class="landing"><div class="landing-top"><div class="wordmark"><span class="logo">b.</span>blueprint<span class="period">.</span></div>'+button("Switch team","switch-team")+'</div><main class="landing-inner signin"><span class="eyebrow">ACCESS REQUEST</span><h1>Waiting for approval.</h1><p>Your membership request for Team '+e(state.team)+' has been received. A team administrator must approve access before you can view private information.</p>'+notice('Nothing from the team workspace is available until membership is approved.')+'<div class="access-account"><span>Signed in as</span><b>'+e(state.user?.email||"Verified account")+'</b></div><div class="access-actions">'+button("Check again","refresh-access","primary")+button("Explore sample workspace","open-preview")+button("Sign out / use another account","sign-out")+'</div><p class="hint">To use Google instead of email sign-in, sign out first and select Continue with Google. Your existing request remains unchanged.</p></main></div>';
}
function selectionOptions(selected){
 return '<option value="">Unassigned</option>'+state.data.people.map(p=>'<option value="'+e(p.id)+'" '+(p.id===selected?"selected":"")+'>'+e(p.name)+' · '+e(p.group)+'</option>').join("");
}
function rejectedPage(){
 return '<div class="landing"><div class="landing-top"><div class="wordmark"><span class="logo">b.</span>blueprint<span class="period">.</span></div>'+button("Switch team","switch-team")+'</div><main class="landing-inner signin"><span class="eyebrow">TEAM MEMBERSHIP</span><h1>Access not approved.</h1><p>Your request to join Team '+e(state.team)+' was not approved. To correct a mistaken request or ask a question, speak with an authorized team mentor. Team information remains private.</p><div class="access-actions">'+button("Check status again","refresh-access","primary")+button("Explore sample workspace","open-preview")+button("Sign out","sign-out")+'</div></main></div>';
}
function connectionPage(){
 return '<div class="landing"><div class="landing-top"><div class="wordmark"><span class="logo">b.</span>blueprint<span class="period">.</span></div>'+button("Switch team","switch-team")+'</div><main class="landing-inner signin"><span class="eyebrow">CONNECTION ISSUE</span><h1>Could not load your workspace.</h1><p>Blueprint could not fetch the latest information from the team database. Your membership is unchanged.</p>'+notice('<b>Details:</b> '+e(state.error||"Please try again."))+'<div class="access-actions">'+button("Retry connection","refresh-access","primary")+button("Explore sample workspace","open-preview")+button("Sign out","sign-out")+'</div></main></div>';
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
 }else if(state.modal==="log"||state.modal==="log-edit"){
  const editing=state.modal==="log-edit";
  const record=editing?state.data.logs.find(l=>String(l.id)===String(state.editingLogId)):null;
  if(editing&&!record)return "";
  title=editing?"Edit build log entry":"Add a build log entry";
  description="Record the engineering change and its reasoning. The original author is preserved.";
  body='<form id="log-form"><div class="form-group"><label for="log-title">What changed?</label>'+
   '<input id="log-title" class="field" name="title" maxlength="140" required value="'+e(record?.title||"")+'" placeholder="Short summary"></div>'+
   '<div class="form-group"><label for="log-body">Details</label><textarea id="log-body" class="field" name="body" maxlength="3000" required placeholder="What was done, tested, or found?">'+e(record?.body||"")+'</textarea></div>'+
   '<div class="form-group"><label for="log-group">Subgroup</label><select id="log-group" class="field" name="subgroup">'+groups.map(g=>'<option '+(g===(record?.subgroup||"Design")?"selected":"")+'>'+e(g)+'</option>').join("")+'</select></div>'+
   '<div class="form-buttons"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" class="btn primary">'+(editing?"Save changes":"Add entry")+'</button></div></form>';

 }else if(state.modal==="project"||state.modal==="project-edit"){
  const editing=state.modal==="project-edit";
  const p=editing?state.data.projects.find(x=>String(x.id)===String(state.editingProjectId)):null;
  if(editing&&!p)return "";
  title=editing?"Edit project":"Create a project";description="Organize a robot subsystem, software effort or other workstream.";
  body='<form id="project-form"><div class="form-group"><label for="project-name">Project name</label><input id="project-name" name="name" class="field" maxlength="100" required value="'+e(p?.name||"")+'" placeholder="e.g. Drivetrain"></div><div class="form-group"><label for="project-desc">Description</label><textarea id="project-desc" name="description" class="field" maxlength="1500" placeholder="What is this group working on?">'+e(p?.description||"")+'</textarea></div><div class="form-duo"><div class="form-group"><label for="project-group">Lead subgroup</label><select id="project-group" name="subgroup" class="field">'+groups.map(g=>'<option '+(g===(p?.subgroup||"Design")?"selected":"")+'>'+e(g)+'</option>').join("")+'</select></div>'+(editing?'<div class="form-group"><label for="project-progress">Progress (%)</label><input id="project-progress" type="number" min="0" max="100" step="1" name="progress" class="field" value="'+e(p.progress||0)+'"></div>':"")+'</div><div class="form-buttons"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" class="btn primary">'+(editing?"Save project":"Create project")+'</button></div></form>';
 }else if(state.modal==="event"||state.modal==="event-edit"){
  const editing=state.modal==="event-edit";
  const record=editing?state.data.events.find(v=>String(v.id)===String(state.editingEventId)):null;
  if(editing&&!record)return "";
  title=editing?"Edit scheduled event":"Schedule an event";
  description="Keep team meetings and reviews accurate for everyone.";
  body='<form id="event-form"><div class="form-group"><label for="event-title">Event title</label>'+
   '<input id="event-title" name="title" class="field" maxlength="140" required value="'+e(record?.title||"")+'" placeholder="e.g. CAD review"></div>'+
   '<div class="form-group"><label for="event-time">Date and time</label>'+
   '<input id="event-time" type="datetime-local" name="start" class="field" required value="'+e(localDateTime(record?.starts_at))+'"></div>'+
   '<div class="form-buttons"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" class="btn primary">'+(editing?"Save changes":"Schedule event")+'</button></div></form>';

 }else if(state.modal==="announcement"){
  title="Publish an announcement";description="This update will be visible to every approved member of this team.";
  body='<form id="announcement-form"><div class="form-group"><label for="announce-title">Title</label><input id="announce-title" name="title" class="field" maxlength="140" required placeholder="Short, clear headline"></div><div class="form-group"><label for="announce-body">Message</label><textarea id="announce-body" name="body" class="field" maxlength="2000" required placeholder="What does everyone need to know?"></textarea></div><div class="form-buttons"><button type="button" class="btn" data-action="close-modal">Cancel</button><button type="submit" class="btn primary">Publish announcement</button></div></form>';
 }else if(state.modal==="report"){
  if(!state.reportMessageId)return "";
  title="Report a team message";
  description="Only team administrators can review your report. It is not published to the channel.";
  body='<form id="report-form"><div class="form-group"><label for="report-reason">Reason</label>'+
   '<select name="reason" id="report-reason" class="field">'+
   reportReasons.map(x=>'<option value="'+x+'">'+e(x[0].toUpperCase()+x.slice(1))+'</option>').join("")+
   '</select></div><div class="form-group"><label for="report-note">Optional context</label>'+
   '<textarea name="note" id="report-note" class="field" maxlength="500" placeholder="What should the administrator review?"></textarea></div>'+
   '<div class="form-buttons"><button type="button" class="btn" data-action="close-modal">Cancel</button>'+
   '<button type="submit" class="btn primary">Send private report</button></div></form>';
 }else if(state.modal==="reference"){
  title="Add engineering reference";
  description="Link to a CAD revision, drawing, document or source repository. Use an HTTPS link teammates can access.";
  body='<form id="reference-form"><div class="form-group"><label for="ref-title">Reference title</label>'+
   '<input id="ref-title" class="field" name="title" maxlength="120" required placeholder="e.g. Intake assembly revision 3"></div>'+
   '<div class="form-group"><label for="ref-url">HTTPS URL</label>'+
   '<input id="ref-url" class="field" type="url" name="url" required maxlength="1000" placeholder="https://..."></div>'+
   '<div class="form-group"><label for="ref-kind">Reference type</label><select id="ref-kind" name="kind" class="field">'+
   engineeringKinds.map(k=>'<option value="'+k+'">'+e(k[0].toUpperCase()+k.slice(1))+'</option>').join("")+'</select></div>'+
   '<div class="form-buttons"><button type="button" class="btn" data-action="close-modal">Cancel</button>'+
   '<button type="submit" class="btn primary">Attach reference</button></div></form>';
 }else if(state.modal==="stock"||state.modal==="stock-edit"){
  const editing=state.modal==="stock-edit";
  const item=editing?state.data.inventory.find(x=>String(x.id)===String(state.editingStockId)):null;
  if(editing&&!item)return "";
  title=editing?"Edit catalog stock":"Add inventory item";
  description="Recorded quantities are manually maintained by team leads. Do not include supplier account credentials.";
  body='<form id="stock-form">'+
   '<div class="form-duo"><div class="form-group"><label for="stock-name">Part or material</label>'+
   '<input id="stock-name" name="name" class="field" maxlength="120" required value="'+e(item?.name||"")+'" placeholder="e.g. M5 socket head bolt"></div>'+
   '<div class="form-group"><label for="stock-sku">Part number / SKU</label>'+
   '<input id="stock-sku" name="sku" class="field" maxlength="80" value="'+e(item?.sku||"")+'" placeholder="Optional identifier"></div></div>'+
   '<div class="form-duo"><div class="form-group"><label for="stock-qty">On hand</label>'+
   '<input id="stock-qty" name="quantity_on_hand" class="field" type="number" min="0" max="1000000" step="1" required value="'+e(item?.quantity_on_hand??0)+'"></div>'+
   '<div class="form-group"><label for="stock-reorder">Reorder at or below</label>'+
   '<input id="stock-reorder" name="reorder_at" class="field" type="number" min="0" max="1000000" step="1" required value="'+e(item?.reorder_at??0)+'"></div></div>'+
   '<div class="form-duo"><div class="form-group"><label for="stock-unit">Unit</label><select class="field" id="stock-unit" name="unit">'+
   inventoryUnits.map(x=>'<option value="'+x+'" '+((item?.unit||"each")===x?"selected":"")+'>'+e(x)+'</option>').join("")+'</select></div>'+
   '<div class="form-group"><label for="stock-location">Storage location</label>'+
   '<input id="stock-location" class="field" name="storage_location" maxlength="120" value="'+e(item?.storage_location||"")+'" placeholder="Drawer, shelf or bin"></div></div>'+
   '<div class="form-group"><label for="stock-notes">Notes</label>'+
   '<textarea id="stock-notes" class="field" name="notes" maxlength="1000" placeholder="Specifications, supplier part number or storage guidance">'+e(item?.notes||"")+'</textarea></div>'+
   '<div class="form-buttons"><button type="button" class="btn" data-action="close-modal">Cancel</button>'+
   '<button type="submit" class="btn primary">'+(editing?"Save stock":"Add catalog item")+'</button></div></form>';
 }else if(state.modal==="bom"||state.modal==="bom-edit"){
  const editing=state.modal==="bom-edit";
  const line=editing?state.data.bom.find(x=>String(x.id)===String(state.editingBomId)):null;
  if(editing&&!line)return "";
  title=editing?"Edit bill of materials":"Add BOM requirement";
  description="Link stock from the team catalog to this project. Demand is aggregated across all project BOMs.";
  const inventoryOptions=state.data.inventory.map(x=>
   '<option value="'+e(x.id)+'" '+((line?.inventory_id||"")===x.id?"selected":"")+'>'+e(x.name)+' · '+e(x.unit)+'</option>'
  ).join("");
  body='<form id="bom-form"><div class="form-group"><label for="bom-stock">Inventory item</label>'+
   (editing?'<input name="inventory_id" type="hidden" value="'+e(line.inventory_id)+'"><div class="field planning-readonly">'+e(state.data.inventory.find(x=>x.id===line.inventory_id)?.name||"Catalog item")+'</div>':
   '<select id="bom-stock" class="field" name="inventory_id" required><option value="">Choose stock</option>'+inventoryOptions+'</select>')+'</div>'+
   '<div class="form-group"><label for="bom-qty">Quantity required</label>'+
   '<input id="bom-qty" type="number" class="field" name="quantity_required" min="1" max="1000000" step="1" required value="'+e(line?.quantity_required??1)+'"></div>'+
   '<div class="form-group"><label for="bom-notes">Requirement notes</label>'+
   '<textarea id="bom-notes" class="field" name="notes" maxlength="500" placeholder="Dimensions, fit requirements, revision notes">'+e(line?.notes||"")+'</textarea></div>'+
   '<div class="form-buttons"><button type="button" class="btn" data-action="close-modal">Cancel</button>'+
   '<button type="submit" class="btn primary">'+(editing?"Update requirement":"Add to BOM")+'</button></div></form>';
 }else if(state.modal==="milestone"||state.modal==="milestone-edit"){
  const editing=state.modal==="milestone-edit";
  const milestone=editing?state.data.milestones.find(x=>String(x.id)===String(state.editingMilestoneId)):null;
  if(editing&&!milestone)return "";
  title=editing?"Edit project milestone":"Add project milestone";
  description="Plan design reviews, assembly checkpoints and tests for this robot project.";
  body='<form id="milestone-form"><div class="form-group"><label for="milestone-title">Milestone title</label>'+
   '<input id="milestone-title" class="field" name="title" maxlength="140" required value="'+e(milestone?.title||"")+'" placeholder="e.g. Confirm first prototype fit"></div>'+
   '<div class="form-duo"><div class="form-group"><label for="milestone-due">Target date</label>'+
   '<input id="milestone-due" type="date" class="field" name="due_on" value="'+e(milestone?.due_on||"")+'"></div>'+
   '<div class="form-group"><label for="milestone-status">Status</label><select id="milestone-status" name="status" class="field">'+
   milestoneStatuses.map(x=>'<option value="'+x+'" '+((milestone?.status||"planned")===x?"selected":"")+'>'+e(milestoneLabels[x])+'</option>').join("")+'</select></div></div>'+
   '<div class="form-group"><label for="milestone-notes">Notes / acceptance criteria</label>'+
   '<textarea id="milestone-notes" class="field" name="notes" maxlength="800" placeholder="What must be verified before marking this done?">'+e(milestone?.notes||"")+'</textarea></div>'+
   '<div class="form-buttons"><button type="button" class="btn" data-action="close-modal">Cancel</button>'+
   '<button type="submit" class="btn primary">'+(editing?"Save milestone":"Create milestone")+'</button></div></form>';
 }else if(state.modal==="part"){
  title="Request manufacturing work";
  description="Submit a part for review. A team Lead or higher will control its progress.";
  const options='<option value="">General team request</option>'+state.data.projects.map(p=>'<option value="'+e(p.id)+'">'+e(p.name)+'</option>').join("");
  body='<form id="part-form"><div class="form-group"><label for="part-name">Part name</label>'+
   '<input id="part-name" class="field" name="part_name" maxlength="120" required placeholder="e.g. Prototype elevator bracket"></div>'+
   '<div class="form-duo"><div class="form-group"><label for="part-quantity">Quantity</label>'+
   '<input id="part-quantity" class="field" type="number" name="quantity" value="1" min="1" max="999" step="1" required></div>'+
   '<div class="form-group"><label for="part-method">Method</label><select id="part-method" class="field" name="method">'+
   fabricationMethods.map(m=>'<option value="'+m+'">'+e(fabricationLabels[m])+'</option>').join("")+'</select></div></div>'+
   '<div class="form-group"><label for="part-project">Linked project</label>'+
   '<select id="part-project" name="project_id" class="field">'+options+'</select></div>'+
   '<div class="form-group"><label for="part-notes">Notes</label>'+
   '<textarea id="part-notes" name="notes" class="field" maxlength="1000" placeholder="Fit requirements, drawing links, or questions for the team lead"></textarea></div>'+
   '<div class="form-buttons"><button type="button" class="btn" data-action="close-modal">Cancel</button>'+
   '<button type="submit" class="btn primary">Submit request</button></div></form>';
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
 // The workspace has its own scroll viewport. Preserve position for edits
 // and incoming live updates, but start at the top when changing sections.
 const scrollKey=state.mode+":"+state.team+":"+state.view;
 const previousMain=app.querySelector?.(".main");
 const previousTop=previousMain?.scrollTop||0;
 const sameView=state.renderScrollKey===scrollKey;
 app.innerHTML=shell()+modal();
 state.renderScrollKey=scrollKey;
 if(sameView){
  const nextMain=app.querySelector?.(".main");
  if(nextMain)nextMain.scrollTop=previousTop;
 }
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
  state.profile=user?await getLiveProfile(user.id):null;
  if(state.mode==="live"&&state.member?.role!=="owner")state.rolePreview=null;
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
 stopLiveUpdates();state.rolePreview=null;state.team=team;sessionStorage.setItem("blueprint-selected-team",team);state.view="overview";state.channel="general";state.filter="all";state.taskScope="all";state.member=null;state.menu=false;
 await refresh();
}
async function dispatchAction(action){
 if(action==="end-role-preview"){state.rolePreview=null;state.modal=null;render();return;}
 if(previewReadOnly()&&["new-task","new-log","new-project","new-event","new-announcement","new-part","new-stock","reset"].includes(action))return toast("Role preview is read-only. Exit preview to make changes.");
 if(action==="switch-team"||action==="sign-out"||action==="exit-preview"){
  stopLiveUpdates();state.rolePreview=null;
  if(action==="sign-out"&&state.mode==="live"){try{await signOut();}catch(err){toast(err.message);}}
  if(action==="exit-preview")state.mode="live";
  state.team=null;state.member=null;state.data=null;state.profile=null;state.menu=false;state.modal=null;state.authNotice="";sessionStorage.removeItem("blueprint-selected-team");
  if(action==="sign-out")state.user=null;
  render();return;
 }
 if(action==="open-preview"){
  stopLiveUpdates();state.rolePreview=null;state.mode="demo";state.team="1810";state.view="overview";state.user=null;state.member=null;state.profile=null;state.modal=null;state.menu=false;
  sessionStorage.setItem("blueprint-selected-team","1810");
  state.data=workspace("1810");render();return;
 }
 if(action==="refresh-live"){await refresh(true);toast("Workspace refreshed.");return;}
 if(action==="menu"){state.menu=!state.menu;render();return;}
 if(action==="close-menu"){state.menu=false;render();return;}
 if(action==="new-task"){if(!canEdit())return;state.editingTaskId=null;state.modal="task";render();return;}
 if(action==="new-log"){if(!canEdit())return;state.editingLogId=null;state.modal="log";render();return;}
 if(action==="new-project"){if(!canEdit())return;state.editingProjectId=null;state.modal="project";render();return;}
 if(action==="new-event"){if(!canEdit())return;state.editingEventId=null;state.modal="event";render();return;}
 if(action==="new-announcement"){if(!canEdit())return;state.modal="announcement";render();return;}
 if(action==="new-part"){state.modal="part";render();return;}
 if(action==="new-stock"){if(!canEdit())return;state.editingStockId=null;state.modal="stock";render();return;}
 if(action==="open-profile"){state.view="profile";state.menu=false;state.modal=null;render();return;}
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
 const logEdit=ev.target.closest("[data-edit-log]");
 if(logEdit&&canEdit()&&!previewReadOnly()){
  state.editingLogId=logEdit.dataset.editLog;state.modal="log-edit";render();return;
 }
 const eventEdit=ev.target.closest("[data-edit-event]");
 if(eventEdit&&canEdit()&&!previewReadOnly()){
  state.editingEventId=eventEdit.dataset.editEvent;state.modal="event-edit";render();return;
 }
 const project=ev.target.closest("[data-edit-project]");
 if(project&&canEdit()){state.editingProjectId=project.dataset.editProject;state.modal="project-edit";render();return;}
 const decision=ev.target.closest("[data-decision]");
 if(decision){
  if(previewReadOnly())return toast("Exit role preview before approving members.");
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
 const stockEdit=ev.target.closest("[data-edit-stock]");
 if(stockEdit){
  if(previewReadOnly()||!canEdit())return;
  state.editingStockId=stockEdit.dataset.editStock;state.modal="stock-edit";render();return;
 }
 const bomAdd=ev.target.closest("[data-add-bom]");
 if(bomAdd){
  if(previewReadOnly()||!canEdit())return;
  if(!(state.data.inventory||[]).length)return toast("Add a stock item in Inventory before linking it to a BOM.");
  state.planningProjectId=bomAdd.dataset.addBom;state.editingBomId=null;state.modal="bom";render();return;
 }
 const bomEdit=ev.target.closest("[data-edit-bom]");
 if(bomEdit){
  if(previewReadOnly()||!canEdit())return;
  const line=state.data.bom.find(x=>String(x.id)===bomEdit.dataset.editBom);
  if(!line)return;
  state.planningProjectId=line.project_id;state.editingBomId=line.id;
  state.modal="bom-edit";render();return;
 }
 const milestoneAdd=ev.target.closest("[data-add-milestone]");
 if(milestoneAdd){
  if(previewReadOnly()||!canEdit())return;
  state.planningProjectId=milestoneAdd.dataset.addMilestone;
  state.editingMilestoneId=null;state.modal="milestone";render();return;
 }
 const milestoneEdit=ev.target.closest("[data-edit-milestone]");
 if(milestoneEdit){
  if(previewReadOnly()||!canEdit())return;
  const m=state.data.milestones.find(x=>String(x.id)===milestoneEdit.dataset.editMilestone);
  if(!m)return;
  state.planningProjectId=m.project_id;state.editingMilestoneId=m.id;
  state.modal="milestone-edit";render();return;
 }
 const reportButton=ev.target.closest("[data-report-message]");
 if(reportButton){
  if(previewReadOnly())return toast("Exit role preview before reporting.");
  state.reportMessageId=reportButton.dataset.reportMessage;
  state.modal="report";render();return;
 }
 const addReference=ev.target.closest("[data-add-reference]");
 if(addReference){
  if(previewReadOnly()||!canEdit())return;
  state.linkProjectId=addReference.dataset.addReference;
  state.modal="reference";render();return;
 }
 const removeReference=ev.target.closest("[data-remove-reference]");
 if(removeReference){
  if(previewReadOnly()||!canEdit())return;
  const id=removeReference.dataset.removeReference;
  try{
   if(state.mode==="demo"){
    state.data.projectLinks=state.data.projectLinks.filter(x=>String(x.id)!==id);
    state.data.activity.unshift({id:"demo-audit-"+Date.now(),action:"reference_removed",subject_type:"project_links",subject_id:id,actor:"You (preview)",created_at:new Date().toISOString()});
    save(state.team,state.data);render();
   }else{await deleteEngineeringLink(state.team,id);await refresh(true);}
   toast("Reference removed.");
  }catch(err){toast("Could not remove reference: "+err.message);}
  return;
 }
 const moderate=ev.target.closest("[data-message-visibility]");
 if(moderate){
  if(previewReadOnly()||!canAdmin())return;
  const id=moderate.dataset.messageVisibility,visible=moderate.dataset.visible==="yes";
  try{
   if(state.mode==="demo"){
    const msg=Object.values(state.data.messages).flat().find(x=>x.id===id);
    if(!msg)return;
    msg.hidden=!visible;
    state.data.activity.unshift({id:"demo-audit-"+Date.now(),action:visible?"message_restored":"message_hidden",subject_type:"messages",subject_id:id,actor:"You (preview)",created_at:new Date().toISOString()});
    save(state.team,state.data);render();
   }else{await setMessageVisibility(state.team,id,visible);await refresh(true);}
   toast(visible?"Message restored.":"Message hidden from members.");
  }catch(err){toast("Moderation update failed: "+err.message);}
  return;
 }
 const review=ev.target.closest("[data-review-report]");
 if(review){
  if(previewReadOnly()||!canAdmin())return;
  const id=review.dataset.reviewReport,status=review.dataset.reportStatus;
  if(!["reviewed","dismissed"].includes(status))return;
  try{
   if(state.mode==="demo"){
    const record=state.data.reports.find(x=>x.id===id);
    if(record){record.status=status;record.reviewed_at=new Date().toISOString();}
    state.data.activity.unshift({id:"demo-audit-"+Date.now(),action:status==="reviewed"?"report_reviewed":"report_dismissed",subject_type:"message_reports",subject_id:id,actor:"You (preview)",created_at:new Date().toISOString()});
    save(state.team,state.data);render();
   }else{await reviewTeamReport(state.team,id,status);await refresh(true);}
   toast("Report "+status+".");
  }catch(err){toast("Unable to review: "+err.message);}
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
 const partStatus=ev.target.closest("[data-part-status]");
 if(partStatus){
  if(previewReadOnly()||!canEdit())return toast("Only a Lead or above can update manufacturing progress.");
  const id=partStatus.dataset.partStatus,status=partStatus.value;
  if(!fabricationStatuses.includes(status))return;
  try{
   if(state.mode==="demo"){
    const item=state.data.partRequests.find(x=>x.id===id);
    if(item){item.status=status;item.updated_at=new Date().toISOString();}
    state.data.activity.unshift({id:"demo-audit-"+Date.now(),action:"part_status_updated",subject_type:"part_requests",subject_id:id,actor:"You (preview)",created_at:new Date().toISOString()});
    save(state.team,state.data);render();
   }else{await setPartStatus(state.team,id,status);await refresh(true);}
   toast("Manufacturing progress updated.");
  }catch(err){toast("Could not update part: "+err.message);if(state.mode==="live")await refresh(true);}
  return;
 }
 const roleSelection=ev.target.closest("[data-preview-role]");
 if(roleSelection){
  if(!mayPreview())return;
  const next=roleSelection.value;
  state.rolePreview=roleIsPreviewable(next)?next:null;
  state.modal=null;
  if(!canAdmin()&&["admin","safety"].includes(state.view))state.view="overview";
  render();return;
 }
 if(previewReadOnly())return toast("Exit role preview before modifying member access.");
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
 const form=ev.target;if(!["task-form","task-edit-form","log-form","compose-form","request-form","magic-link-form","project-form","event-form","announcement-form","profile-form","report-form","reference-form","part-form","stock-form","bom-form","milestone-form"].includes(form.id))return;
 ev.preventDefault();if(previewReadOnly())return toast("Role preview is read-only. Exit preview to save changes.");const f=new FormData(form);
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
 if(form.id==="stock-form"){
  if(!canEdit())return toast("Only team Leads and above can change inventory.");
  const name=String(f.get("name")||"").trim(),sku=String(f.get("sku")||"").trim();
  const storage_location=String(f.get("storage_location")||"").trim(),notes=String(f.get("notes")||"").trim();
  const quantity_on_hand=validQuantity(f.get("quantity_on_hand"));
  const reorder_at=validQuantity(f.get("reorder_at"));
  const unit=String(f.get("unit")||"each");
  if(!name||name.length>120||sku.length>80||storage_location.length>120||
     notes.length>1000||quantity_on_hand===null||reorder_at===null||!inventoryUnits.includes(unit)){
    return toast("Check the inventory fields and quantities.");
  }
  const fields={name,sku,storage_location,notes,quantity_on_hand,reorder_at,unit};
  const editing=state.modal==="stock-edit";
  if(state.mode==="demo"){
   if(editing){
    const item=state.data.inventory.find(x=>String(x.id)===String(state.editingStockId));
    if(!item)return toast("Stock item not found.");
    Object.assign(item,fields);
   }else state.data.inventory.unshift({id:"demo-stock-"+Date.now(),...fields,created_at:new Date().toISOString()});
   save(state.team,state.data);
  }else if(editing)await updateInventoryItem(state.team,state.editingStockId,fields);
  else await createInventoryItem(state.team,fields,state.user.id);
  state.editingStockId=null;state.modal=null;state.view="inventory";
  if(state.mode==="live")await refresh(true);else render();
  toast(editing?"Stock updated.":"Inventory item created.");return;
 }
 if(form.id==="bom-form"){
  if(!canEdit())return toast("Only team Leads and above can manage BOMs.");
  const projectId=state.planningProjectId,editing=state.modal==="bom-edit";
  const inventoryId=String(f.get("inventory_id")||"");
  const quantity_required=validQuantity(f.get("quantity_required"),1);
  const notes=String(f.get("notes")||"").trim();
  if(!state.data.projects.some(p=>p.id===projectId)||
    !state.data.inventory.some(x=>x.id===inventoryId)||
    quantity_required===null||notes.length>500)return toast("Check the BOM inventory item and quantity.");
  if(!editing&&state.data.bom.some(b=>b.project_id===projectId&&b.inventory_id===inventoryId)){
   return toast("This project already has that stock item. Edit the existing BOM line instead.");
  }
  if(state.mode==="demo"){
   if(editing){
    const line=state.data.bom.find(x=>String(x.id)===String(state.editingBomId));
    if(!line)return toast("BOM line not found.");
    Object.assign(line,{quantity_required,notes});
   }else state.data.bom.push({id:"demo-bom-"+Date.now(),project_id:projectId,inventory_id:inventoryId,quantity_required,notes});
   save(state.team,state.data);
  }else if(editing)await updateBomLine(state.team,state.editingBomId,quantity_required,notes);
  else await createBomLine(state.team,projectId,inventoryId,quantity_required,notes,state.user.id);
  state.planningProjectId=null;state.editingBomId=null;state.modal=null;state.view="projects";
  if(state.mode==="live")await refresh(true);else render();
  toast(editing?"BOM requirement updated.":"Part added to BOM.");return;
 }
 if(form.id==="milestone-form"){
  if(!canEdit())return toast("Only team Leads and above can manage milestones.");
  const projectId=state.planningProjectId,editing=state.modal==="milestone-edit";
  const title=String(f.get("title")||"").trim();
  const status=String(f.get("status")||"planned");
  const due_on=String(f.get("due_on")||"").trim()||null;
  const notes=String(f.get("notes")||"").trim();
  if(!state.data.projects.some(p=>p.id===projectId)||!title||title.length>140||
    !milestoneStatuses.includes(status)||notes.length>800||
    (due_on&&(!/^\d{4}-\d{2}-\d{2}$/.test(due_on)||Number.isNaN(new Date(due_on+"T00:00:00").getTime())))){
   return toast("Check the milestone details.");
  }
  const fields={title,status,due_on,notes};
  if(state.mode==="demo"){
   if(editing){
    const milestone=state.data.milestones.find(x=>String(x.id)===String(state.editingMilestoneId));
    if(!milestone)return toast("Milestone not found.");
    Object.assign(milestone,fields);
   }else state.data.milestones.push({id:"demo-milestone-"+Date.now(),project_id:projectId,...fields});
   save(state.team,state.data);
  }else if(editing)await updateProjectMilestone(state.team,state.editingMilestoneId,fields);
  else await createProjectMilestone(state.team,{project_id:projectId,...fields},state.user.id);
  state.planningProjectId=null;state.editingMilestoneId=null;state.modal=null;state.view="projects";
  if(state.mode==="live")await refresh(true);else render();
  toast(editing?"Milestone updated.":"Milestone created.");return;
 }
 if(form.id==="report-form"){
  const reason=String(f.get("reason")||""),note=String(f.get("note")||"").trim(),id=state.reportMessageId;
  if(!reportReasons.includes(reason)||note.length>500||!id)return toast("Check report details.");
  const msg=Object.values(state.data.messages).flat().find(x=>x.id===id&&!x.hidden);
  if(!msg)return toast("That message is no longer available.");
  if(state.mode==="demo"){
   if(state.data.reports.some(r=>r.message_id===id&&r.reporter_id==="preview-user"))return toast("You already reported this message.");
   state.data.reports.unshift({id:"demo-report-"+Date.now(),message_id:id,reason,note,status:"open",reporter_id:"preview-user",created_at:new Date().toISOString()});
   state.data.activity.unshift({id:"demo-audit-"+Date.now(),action:"message_reported",subject_type:"message_reports",subject_id:id,actor:"You (preview)",created_at:new Date().toISOString()});
   save(state.team,state.data);
  }else await reportTeamMessage(state.team,id,reason,note,state.user.id);
  state.reportMessageId=null;state.modal=null;
  if(state.mode==="live")await refresh(true);else render();
  toast("Your report was sent privately to team administrators.");return;
 }
 if(form.id==="reference-form"){
  if(!canEdit())return toast("Only a Lead or above can attach engineering references.");
  const title=String(f.get("title")||"").trim(),raw=String(f.get("url")||"").trim(),kind=String(f.get("kind")||"");
  const url=safeReferenceUrl(raw),projectId=state.linkProjectId;
  if(!title||title.length>120||!url||!engineeringKinds.includes(kind)||
     !state.data.projects.some(p=>String(p.id)===String(projectId)))return toast("Enter a title, valid HTTPS link, and project.");
  if(state.mode==="demo"){
   state.data.projectLinks.push({id:"demo-link-"+Date.now(),project_id:projectId,title,url,kind,created_at:new Date().toISOString()});
   state.data.activity.unshift({id:"demo-audit-"+Date.now(),action:"reference_added",subject_type:"project_links",subject_id:projectId,actor:"You (preview)",created_at:new Date().toISOString()});
   save(state.team,state.data);
  }else await createEngineeringLink(state.team,projectId,title,url,kind,state.user.id);
  state.linkProjectId=null;state.modal=null;state.view="projects";
  if(state.mode==="live")await refresh(true);else render();
  toast("Engineering reference attached.");return;
 }
 if(form.id==="part-form"){
  const part_name=String(f.get("part_name")||"").trim(),notes=String(f.get("notes")||"").trim();
  const quantity=Number(f.get("quantity")),method=String(f.get("method")||"");
  const project_id=String(f.get("project_id")||"")||null;
  if(!part_name||part_name.length>120||notes.length>1000||!Number.isInteger(quantity)||
    quantity<1||quantity>999||!fabricationMethods.includes(method)||
    (project_id&&!state.data.projects.some(p=>String(p.id)===project_id))){
    return toast("Check the part details and quantity.");
  }
  if(state.mode==="demo"){
   const id="demo-part-"+Date.now();
   state.data.partRequests.unshift({id,part_name,notes,quantity,method,project_id,status:"requested",requested_by:"preview-user",created_at:new Date().toISOString()});
   state.data.activity.unshift({id:"demo-audit-"+Date.now(),action:"part_requested",subject_type:"part_requests",subject_id:id,actor:"You (preview)",created_at:new Date().toISOString()});
   save(state.team,state.data);
  }else await requestPart(state.team,{part_name,notes,quantity,method,project_id},state.user.id);
  state.modal=null;state.view="manufacturing";
  if(state.mode==="live")await refresh(true);else render();
  toast("Part request submitted.");return;
 }
 if(form.id==="profile-form"){
  if(state.mode==="live"&&!state.user?.id)return toast("Sign in to edit your profile.");
  const full_name=String(f.get("full_name")||"").trim();
  const headline=String(f.get("headline")||"").trim();
  const bio=String(f.get("bio")||"").trim();
  const avatar_color=String(f.get("avatar_color")||"slate");
  const subgroup=String(f.get("subgroup")||"");
  if(!full_name||full_name.length>80||headline.length>80||bio.length>300||
    !avatarColors.includes(avatar_color)||!groups.includes(subgroup)){
    return toast("Please check your profile fields.");
  }
  const fields={full_name,headline,bio,avatar_color};
  if(state.mode==="demo"){
   state.data.profile={...fields,subgroup};
   save(state.team,state.data);
   render();
  }else{
   await saveLiveProfile(state.user.id,fields);
   if(subgroup!==state.member?.subgroup)await updateOwnSubgroup(state.team,state.user.id,subgroup);
   await refresh(true);
  }
  toast("Profile saved.");return;
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
  if(!canEdit())return toast("Only team leads and above can manage events.");
  const title=String(f.get("title")||"").trim();
  const raw=String(f.get("start")||"");
  const starts=new Date(raw);
  if(!title||title.length>140||!raw||Number.isNaN(starts.getTime()))return toast("Check the event date and title.");
  const editing=state.modal==="event-edit";
  if(state.mode==="demo"){
   if(editing){
    const event=state.data.events.find(x=>String(x.id)===String(state.editingEventId));
    if(!event)return toast("Event not found.");
    Object.assign(event,{title,starts_at:starts.toISOString(),
     day:String(starts.getDate()).padStart(2,"0"),
     month:starts.toLocaleString("en-US",{month:"short"}).toUpperCase(),
     details:starts.toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"}),edited_at:new Date().toISOString(),edited_by:"You (preview)"});
   }else state.data.events.push({id:"demo-event-"+Date.now(),title,starts_at:starts.toISOString(),
     day:String(starts.getDate()).padStart(2,"0"),
     month:starts.toLocaleString("en-US",{month:"short"}).toUpperCase(),
     details:starts.toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"}),type:"Team"});
   state.data.events.sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
   save(state.team,state.data);
  }else if(editing)await editLiveEvent(state.team,state.editingEventId,title,starts.toISOString());
  else await addLiveEvent(state.team,title,starts.toISOString(),state.user.id);
  state.editingEventId=null;state.modal=null;state.view="calendar";
  if(state.mode==="live")await refresh(true);else render();
  toast(editing?"Event updated.":"Event scheduled.");return;
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
   if(!canEdit())return toast("Only team leads and above can manage build logs.");
   const title=String(f.get("title")||"").trim(),body=String(f.get("body")||"").trim(),subgroup=String(f.get("subgroup")||"");
   if(!title||title.length>140||!body||body.length>3000||!groups.includes(subgroup))return toast("Check the log fields.");
   const editing=state.modal==="log-edit";
   if(state.mode==="demo"){
    if(editing){
     const record=state.data.logs.find(x=>String(x.id)===String(state.editingLogId));
     if(!record)return toast("Build log entry not found.");
     Object.assign(record,{title,body,subgroup,edited_at:new Date().toISOString(),edited_by:"You (preview)"});
    }else state.data.logs.unshift({id:"l"+Date.now(),title,body,subgroup,author:"You (preview)",time:new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})});
    save(state.team,state.data);
   }else if(editing)await editLiveLog(state.team,state.editingLogId,{title,body,subgroup});
   else await addLiveLog(state.team,title,body,subgroup,state.user.id);
   state.editingLogId=null;state.modal=null;state.view="logs";
 }else{
  const text=String(f.get("body")||"").trim().slice(0,1000);if(!text)return;
  if(state.mode==="demo"){(state.data.messages[state.channel]||=([])).push({id:"demo-message-"+Date.now(),author:"You (preview)",initials:"YP",time:new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}),text,hidden:false});save(state.team,state.data);}
  else await sendLiveMessage(state.team,state.channel,text,state.user.id);
 }
 if(state.mode==="live")await refresh();else render();
 }catch(err){toast("Could not save: "+(err.message||"Unknown error"));}
});
document.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&state.modal){state.modal=null;render();}});
if(state.team)refresh();else render();
