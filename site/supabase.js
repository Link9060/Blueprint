// Optional live adapter. A dedicated Blueprint project and the SQL migration are required.
// Official Supabase JS browser SDK; exact version pinned in import URL.
import {teams} from "./data.js";
const cfg=window.BLUEPRINT_CONFIG||{};
let clientPromise;
export function configured(){
 return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(cfg.supabaseUrl||"") && /^sb_publishable_|^eyJ/.test(cfg.supabasePublishableKey||"");
}
async function client(){
 if(!configured())throw new Error("Blueprint Supabase configuration is missing.");
 if(!clientPromise)clientPromise=import("https://esm.sh/@supabase/supabase-js@2.75.0").then(mod=>mod.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey));
 return clientPromise;
}
function unwrap(response){if(response.error)throw response.error;return response.data;}
export async function getUser(){const sb=await client();const {data:{session}}=await sb.auth.getSession();if(!session)return null;return unwrap(await sb.auth.getUser()).user;}
export async function googleSignIn(){
 const sb=await client();
 const redirectTo=window.location.origin+window.location.pathname;
 unwrap(await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo}}));
}
export async function sendMagicLink(email){
 const value=String(email||"").trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)||value.length>254)throw new Error("Enter a valid email address.");
 const sb=await client();
 unwrap(await sb.auth.signInWithOtp({email:value,options:{
   emailRedirectTo:window.location.origin+window.location.pathname,
   shouldCreateUser:true
 }}));
}
export async function signOut(){const sb=await client();unwrap(await sb.auth.signOut());}
export async function membership(team,userId){
 const sb=await client();
 return unwrap(await sb.from("team_memberships").select("team_id,user_id,role,subgroup,status").eq("team_id",team).eq("user_id",userId).maybeSingle());
}
export async function approveMembership(team,userId,status,role){
 if(!["approved","rejected"].includes(status)||!["member","lead","captain","mentor","admin"].includes(role))throw new Error("Invalid membership update.");
 const sb=await client();
 const rows=unwrap(await sb.from("team_memberships").update({status,role}).eq("team_id",team).eq("user_id",userId).eq("status","pending").select("user_id"));
 if(!rows?.length)throw new Error("Request is no longer pending or access was denied.");
}
export async function updateMemberRole(team,userId,role){
 if(!["member","lead","captain","mentor","admin"].includes(role))throw new Error("Invalid team role.");
 const sb=await client();
 const rows=unwrap(await sb.from("team_memberships").update({role}).eq("team_id",team).eq("user_id",userId).eq("status","approved").select("user_id"));
 if(!rows?.length)throw new Error("Role could not be changed; check administrator access.");
}
export async function requestMembership(team,user,fullName,subgroup){
 if(!teams.find(x=>x.id===team))throw new Error("Unknown team.");
 const sb=await client();
 const profile=await sb.from("profiles").insert({id:user.id,full_name:fullName});
 if(profile.error){
  if(profile.error.code!=="23505")throw profile.error;
  unwrap(await sb.from("profiles").update({full_name:fullName}).eq("id",user.id));
 }
 unwrap(await sb.from("team_memberships").insert({team_id:team,user_id:user.id,role:"member",subgroup,status:"pending"}));
}
async function select(team,table,columns="*"){
 const sb=await client();
 return unwrap(await sb.from(table).select(columns).eq("team_id",team).order("created_at",{ascending:false}).limit(table==="messages"?300:200));
}
export async function liveWorkspace(team){
 const [taskRows,logRows,projectRows,messageRows,eventRows,memberRows,announcementRows,linkRows,partRows,reportRows,activityRows,stockRows,bomRows,milestoneRows]=await Promise.all([
  select(team,"tasks"),select(team,"build_logs"),select(team,"projects"),select(team,"messages"),select(team,"events"),select(team,"team_memberships","user_id,role,subgroup,status,created_at,profiles(full_name,headline,bio,avatar_color)"),select(team,"announcements"),select(team,"project_links"),select(team,"part_requests"),select(team,"message_reports"),select(team,"activity_events"),select(team,"inventory_items"),select(team,"project_bom_items"),select(team,"project_milestones")
 ]);
 const people=memberRows.filter(x=>x.status==="approved").map(x=>({id:x.user_id,name:x.profiles?.full_name||"Team member",role:x.role,group:x.subgroup,headline:x.profiles?.headline||"",bio:x.profiles?.bio||"",avatar_color:x.profiles?.avatar_color||"slate",initials:(x.profiles?.full_name||"TM").split(" ").map(a=>a[0]).join("").slice(0,2).toUpperCase()}));
 const nameById=Object.fromEntries(people.map(p=>[p.id,p.name]));
 const tasks=taskRows.map(x=>({id:x.id,title:x.title,subgroup:x.subgroup||"General",due:x.due_date||"Not scheduled",due_date:x.due_date||"",status:x.status,priority:x.priority||"Normal",assigned_to:x.assigned_to||null}));
 const logs=logRows.map(x=>({id:x.id,title:x.title,body:x.body||"",subgroup:x.subgroup||"General",author:nameById[x.author_id]||"Team member",time:new Date(x.created_at).toLocaleDateString(),edited_at:x.edited_at||null,edited_by:x.edited_by?nameById[x.edited_by]||"Team lead":null}));
 const projects=projectRows.map(x=>({id:x.id,name:x.name,icon:"◇",description:x.description||"",progress:x.progress||0,lead:x.subgroup||"General",subgroup:x.subgroup||"General"}));
 const events=eventRows.map(x=>{const d=new Date(x.starts_at);return {id:x.id,starts_at:x.starts_at,day:String(d.getDate()).padStart(2,"0"),month:d.toLocaleString("en-US",{month:"short"}).toUpperCase(),title:x.title,details:d.toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"}),type:"Team",edited_at:x.edited_at||null,edited_by:x.edited_by?nameById[x.edited_by]||"Team lead":null};}).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
 const messages={};for(const m of messageRows.slice().reverse()){(messages[m.channel]||=([])).push({id:m.id,author:nameById[m.author_id]||"Team member",initials:(nameById[m.author_id]||"TM").split(" ").map(a=>a[0]).join("").slice(0,2).toUpperCase(),time:new Date(m.created_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}),text:m.body,hidden:!!m.hidden_at,author_id:m.author_id});}
 const announcements=announcementRows.map(a=>({id:a.id,title:a.title,body:a.body,author:nameById[a.author_id]||"Team lead",time:new Date(a.created_at).toLocaleDateString()}));
 const projectLinks=linkRows.map(x=>({id:x.id,project_id:x.project_id,title:x.title,url:x.url,kind:x.kind,created_at:x.created_at}));
 const partRequests=partRows.map(x=>({id:x.id,project_id:x.project_id,part_name:x.part_name,quantity:x.quantity,method:x.method,status:x.status,notes:x.notes,requested_by:x.requested_by,created_at:x.created_at,updated_at:x.updated_at}));
 const reports=reportRows.map(x=>({id:x.id,message_id:x.message_id,reason:x.reason,note:x.note,status:x.status,reporter_id:x.reporter_id,created_at:x.created_at,reviewed_at:x.reviewed_at}));
 const activity=activityRows.map(x=>({id:x.id,action:x.action,subject_type:x.subject_type,subject_id:x.subject_id,actor:nameById[x.actor_id]||"Team member",created_at:x.created_at}));
 return {team,name:teams.find(x=>x.id===team)?.name||team,tasks,logs,projects,events,messages,announcements,people,projectLinks,partRequests,reports,activity,inventory:stockRows,bom:bomRows,milestones:milestoneRows,pending:memberRows.filter(m=>m.status==="pending").map(m=>({user_id:m.user_id,name:m.profiles?.full_name||"Team member",subgroup:m.subgroup,role:m.role,status:m.status}))};
}
export async function addLiveTask(team,title,subgroup,userId,assignedTo=null,dueDate=null,priority="Normal"){
 const sb=await client();
 unwrap(await sb.from("tasks").insert({team_id:team,title,subgroup,created_by:userId,status:"todo",priority,assigned_to:assignedTo||null,due_date:dueDate||null}));
}
export async function editLiveTask(team,id,changes){
 const allowed=["title","subgroup","status","priority","assigned_to","due_date"];
 const update=Object.fromEntries(Object.entries(changes).filter(([key])=>allowed.includes(key)));
 const sb=await client();
 const rows=unwrap(await sb.from("tasks").update(update).eq("team_id",team).eq("id",id).select("id"));
 if(!rows?.length)throw new Error("Task not changed; verify your access.");
}
export async function setLiveTaskStatus(team,id,status){
 const sb=await client();const rows=unwrap(await sb.from("tasks").update({status}).eq("team_id",team).eq("id",id).select("id"));
 if(!rows?.length)throw new Error("Task not changed; verify assignment.");
}
export async function editLiveLog(team,id,fields){
 const sb=await client();
 const rows=unwrap(await sb.from("build_logs").update({
  title:fields.title,body:fields.body,subgroup:fields.subgroup
 }).eq("team_id",team).eq("id",id).select("id"));
 if(!rows?.length)throw new Error("Build log not updated; check your Lead access.");
}
export async function addLiveLog(team,title,body,subgroup,userId){
 const sb=await client();unwrap(await sb.from("build_logs").insert({team_id:team,title,body,subgroup,author_id:userId}));
}
export async function sendLiveMessage(team,channel,body,userId){
 const sb=await client();unwrap(await sb.from("messages").insert({team_id:team,channel,body,author_id:userId}));
}

export async function addLiveProject(team,name,description,subgroup){
 const sb=await client();
 unwrap(await sb.from("projects").insert({team_id:team,name,description,subgroup,progress:0}));
}
export async function editLiveProject(team,id,fields){
 const sb=await client();
 unwrap(await sb.from("projects").update({name:fields.name,description:fields.description,subgroup:fields.subgroup,progress:fields.progress}).eq("team_id",team).eq("id",id));
}
export async function addLiveEvent(team,title,startTime,userId){
 const sb=await client();
 unwrap(await sb.from("events").insert({team_id:team,title,starts_at:startTime,created_by:userId}));
}
export async function editLiveEvent(team,id,title,startTime){
 const sb=await client();
 const rows=unwrap(await sb.from("events").update({title,starts_at:startTime})
  .eq("team_id",team).eq("id",id).select("id"));
 if(!rows?.length)throw new Error("Event not updated; check your Lead access.");
}
export async function getLiveProfile(userId){
 const sb=await client();
 return unwrap(await sb.from("profiles").select("full_name,headline,bio,avatar_color").eq("id",userId).maybeSingle());
}
export async function saveLiveProfile(userId,fields){
 const sb=await client();
 const rows=unwrap(await sb.from("profiles").update({
  full_name:fields.full_name,headline:fields.headline,bio:fields.bio,avatar_color:fields.avatar_color
 }).eq("id",userId).select("id"));
 if(!rows?.length)throw new Error("Profile update was not permitted.");
}
export async function updateOwnSubgroup(team,userId,subgroup){
 const sb=await client();
 const rows=unwrap(await sb.from("team_memberships").update({subgroup})
  .eq("team_id",team).eq("user_id",userId).eq("status","approved").select("user_id"));
 if(!rows?.length)throw new Error("Subgroup update was not permitted.");
}
export async function addLiveAnnouncement(team,title,body,userId){
 const sb=await client();
 unwrap(await sb.from("announcements").insert({team_id:team,title,body,author_id:userId}));
}

export async function reportTeamMessage(team,messageId,reason,note,userId){
 if(!["inappropriate","bullying","privacy","other"].includes(reason))throw new Error("Select a report reason.");
 if(String(note||"").length>500)throw new Error("Report notes must be 500 characters or fewer.");
 const sb=await client();
 unwrap(await sb.from("message_reports").insert({
  team_id:team,message_id:messageId,reporter_id:userId,reason,note:String(note||"").trim()
 }));
}
export async function reviewTeamReport(team,id,status){
 if(!["reviewed","dismissed"].includes(status))throw new Error("Invalid report status.");
 const sb=await client();
 const changed=unwrap(await sb.from("message_reports").update({status}).eq("team_id",team).eq("id",id).eq("status","open").select("id"));
 if(!changed?.length)throw new Error("Could not review report. It may have been resolved already.");
}
export async function setMessageVisibility(team,id,visible){
 const sb=await client();
 const changed=unwrap(await sb.from("messages").update({hidden_at:visible?null:new Date().toISOString()}).eq("team_id",team).eq("id",id).select("id"));
 if(!changed?.length)throw new Error("Could not change message visibility.");
}
export async function createEngineeringLink(team,projectId,title,url,kind,userId){
 if(!["cad","drawing","document","code","other"].includes(kind))throw new Error("Invalid reference type.");
 if(!/^https:\/\/[A-Za-z0-9.-]+(?::\d{1,5})?(?:\/\S*)?$/.test(url)||url.length>1000)throw new Error("Use a complete HTTPS link.");
 const sb=await client();
 unwrap(await sb.from("project_links").insert({team_id:team,project_id:projectId,title,url,kind,created_by:userId}));
}
export async function deleteEngineeringLink(team,id){
 const sb=await client();
 const changed=unwrap(await sb.from("project_links").delete().eq("team_id",team).eq("id",id).select("id"));
 if(!changed?.length)throw new Error("Reference could not be removed.");
}
export async function requestPart(team,fields,userId){
 if(!["3d_print","cnc","laser","assembly","other"].includes(fields.method))throw new Error("Unknown fabrication method.");
 const sb=await client();
 unwrap(await sb.from("part_requests").insert({
  team_id:team,project_id:fields.project_id||null,part_name:fields.part_name,
  quantity:fields.quantity,method:fields.method,notes:fields.notes||"",requested_by:userId
 }));
}
export async function setPartStatus(team,id,status){
 if(!["requested","approved","in_progress","on_hold","completed"].includes(status))throw new Error("Invalid progress status.");
 const sb=await client();
 const changed=unwrap(await sb.from("part_requests").update({status}).eq("team_id",team).eq("id",id).select("id"));
 if(!changed?.length)throw new Error("Only a team Lead or above can update manufacturing progress.");
}


export async function createInventoryItem(team,fields,userId){
 const sb=await client();
 const rows=unwrap(await sb.from("inventory_items").insert({...fields,team_id:team,created_by:userId}).select("id"));
 if(!rows?.length)throw new Error("Stock item was not created.");
}
export async function updateInventoryItem(team,id,fields){
 const sb=await client();
 const rows=unwrap(await sb.from("inventory_items").update(fields).eq("team_id",team).eq("id",id).select("id"));
 if(!rows?.length)throw new Error("Inventory update denied or item missing.");
}
export async function createBomLine(team,projectId,inventoryId,required,notes,userId){
 const sb=await client();
 const rows=unwrap(await sb.from("project_bom_items").insert({
  team_id:team,project_id:projectId,inventory_id:inventoryId,
  quantity_required:required,notes,created_by:userId
 }).select("id"));
 if(!rows?.length)throw new Error("BOM item was not linked.");
}
export async function updateBomLine(team,id,required,notes){
 const sb=await client();
 const rows=unwrap(await sb.from("project_bom_items").update({
  quantity_required:required,notes
 }).eq("team_id",team).eq("id",id).select("id"));
 if(!rows?.length)throw new Error("BOM update denied or missing.");
}
export async function removeBomLine(team,id){
 const sb=await client();
 const rows=unwrap(await sb.from("project_bom_items").delete().eq("team_id",team).eq("id",id).select("id"));
 if(!rows?.length)throw new Error("BOM line could not be removed.");
}
export async function createProjectMilestone(team,fields,userId){
 const sb=await client();
 const rows=unwrap(await sb.from("project_milestones").insert({
  team_id:team,...fields,created_by:userId
 }).select("id"));
 if(!rows?.length)throw new Error("Milestone was not created.");
}
export async function updateProjectMilestone(team,id,fields){
 const sb=await client();
 const rows=unwrap(await sb.from("project_milestones").update(fields).eq("team_id",team).eq("id",id).select("id"));
 if(!rows?.length)throw new Error("Milestone update denied or missing.");
}
export async function removeProjectMilestone(team,id){
 const sb=await client();
 const rows=unwrap(await sb.from("project_milestones").delete().eq("team_id",team).eq("id",id).select("id"));
 if(!rows?.length)throw new Error("Milestone could not be removed.");
}
export async function subscribeTeam(team,onChange){
 const sb=await client();
 const channel=sb.channel("blueprint-team-"+team);
 for(const table of ["messages","tasks","build_logs","projects","events","announcements","project_links","part_requests","inventory_items","project_bom_items","project_milestones"]){
  channel.on("postgres_changes",{event:"*",schema:"public",table,filter:"team_id=eq."+team},onChange);
 }
 channel.subscribe();
 return ()=>{void sb.removeChannel(channel);};
}
