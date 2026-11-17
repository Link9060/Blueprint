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
export async function signOut(){const sb=await client();unwrap(await sb.auth.signOut());}
export async function membership(team,userId){
 const sb=await client();
 return unwrap(await sb.from("team_memberships").select("team_id,user_id,role,subgroup,status").eq("team_id",team).eq("user_id",userId).maybeSingle());
}
export async function approveMembership(team,userId,status,role){
 if(!["approved","rejected"].includes(status)||!["member","lead","captain","mentor","admin"].includes(role))throw new Error("Invalid membership update.");
 const sb=await client();
 unwrap(await sb.from("team_memberships").update({status,role}).eq("team_id",team).eq("user_id",userId).eq("status","pending"));
}
export async function requestMembership(team,user,fullName,subgroup){
 if(!teams.find(x=>x.id===team))throw new Error("Unknown team.");
 const sb=await client();
 unwrap(await sb.from("profiles").upsert({id:user.id,full_name:fullName},{onConflict:"id"}));
 unwrap(await sb.from("team_memberships").insert({team_id:team,user_id:user.id,role:"member",subgroup,status:"pending"}));
}
async function select(team,table,columns="*"){
 const sb=await client();
 return unwrap(await sb.from(table).select(columns).eq("team_id",team).order("created_at",{ascending:false}));
}
export async function liveWorkspace(team){
 const [taskRows,logRows,projectRows,messageRows,eventRows,memberRows]=await Promise.all([
  select(team,"tasks"),select(team,"build_logs"),select(team,"projects"),select(team,"messages"),select(team,"events"),select(team,"team_memberships","user_id,role,subgroup,status,created_at,profiles(full_name)")
 ]);
 const people=memberRows.filter(x=>x.status==="approved").map(x=>({id:x.user_id,name:x.profiles?.full_name||"Team member",role:x.role,group:x.subgroup,initials:(x.profiles?.full_name||"TM").split(" ").map(a=>a[0]).join("").slice(0,2).toUpperCase()}));
 const nameById=Object.fromEntries(people.map(p=>[p.id,p.name]));
 const tasks=taskRows.map(x=>({id:x.id,title:x.title,subgroup:x.subgroup||"General",due:x.due_date||"Not scheduled",due_date:x.due_date||"",status:x.status,priority:x.priority||"Normal",assigned_to:x.assigned_to||null}));
 const logs=logRows.map(x=>({id:x.id,title:x.title,body:x.body||"",subgroup:x.subgroup||"General",author:nameById[x.author_id]||"Team member",time:new Date(x.created_at).toLocaleDateString()}));
 const projects=projectRows.map(x=>({id:x.id,name:x.name,icon:"◇",description:x.description||"",progress:x.progress||0,lead:x.subgroup||"General"}));
 const events=eventRows.map(x=>{const d=new Date(x.starts_at);return {day:String(d.getDate()).padStart(2,"0"),month:d.toLocaleString("en-US",{month:"short"}).toUpperCase(),title:x.title,details:d.toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"}),type:"Team"};});
 const messages={};for(const m of messageRows){(messages[m.channel]||=([])).push({id:m.id,author:nameById[m.author_id]||"Team member",initials:(nameById[m.author_id]||"TM").split(" ").map(a=>a[0]).join("").slice(0,2).toUpperCase(),time:new Date(m.created_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}),text:m.body});}
 return {team,name:teams.find(x=>x.id===team)?.name||team,tasks,logs,projects,events,messages,people,pending:memberRows.filter(m=>m.status==="pending").map(m=>({user_id:m.user_id,name:m.profiles?.full_name||"Team member",subgroup:m.subgroup,role:m.role,status:m.status}))};
}
export async function addLiveTask(team,title,subgroup,userId,assignedTo=null,dueDate=null,priority="Normal"){
 const sb=await client();
 unwrap(await sb.from("tasks").insert({team_id:team,title,subgroup,created_by:userId,status:"todo",priority,assigned_to:assignedTo||null,due_date:dueDate||null}));
}
export async function editLiveTask(team,id,changes){
 const allowed=["title","subgroup","status","priority","assigned_to","due_date"];
 const update=Object.fromEntries(Object.entries(changes).filter(([key])=>allowed.includes(key)));
 const sb=await client();
 unwrap(await sb.from("tasks").update(update).eq("team_id",team).eq("id",id));
}
export async function setLiveTaskStatus(team,id,status){
 const sb=await client();unwrap(await sb.from("tasks").update({status}).eq("team_id",team).eq("id",id));
}
export async function addLiveLog(team,title,body,subgroup,userId){
 const sb=await client();unwrap(await sb.from("build_logs").insert({team_id:team,title,body,subgroup,author_id:userId}));
}
export async function sendLiveMessage(team,channel,body,userId){
 const sb=await client();unwrap(await sb.from("messages").insert({team_id:team,channel,body,author_id:userId}));
}
