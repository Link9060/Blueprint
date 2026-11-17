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
export async function getUser(){const sb=await client();return unwrap(await sb.auth.getUser()).user;}
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
 const [taskRows,logRows,projectRows,messageRows,eventRows]=await Promise.all([
  select(team,"tasks"),select(team,"build_logs"),select(team,"projects"),select(team,"messages"),select(team,"events")
 ]);
 const tasks=taskRows.map(x=>({id:x.id,title:x.title,subgroup:x.subgroup||"General",due:x.due_date||"Not scheduled",status:x.status,priority:x.priority||"Normal"}));
 const logs=logRows.map(x=>({id:x.id,title:x.title,body:x.body||"",subgroup:x.subgroup||"General",author:"Team member",time:new Date(x.created_at).toLocaleDateString()}));
 const projects=projectRows.map(x=>({id:x.id,name:x.name,icon:"◇",description:x.description||"",progress:x.progress||0,lead:x.subgroup||"General"}));
 const events=eventRows.map(x=>{const d=new Date(x.starts_at);return {day:String(d.getDate()).padStart(2,"0"),month:d.toLocaleString("en-US",{month:"short"}).toUpperCase(),title:x.title,details:d.toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"}),type:"Team"};});
 const messages={};for(const m of messageRows){(messages[m.channel]||=([])).push({id:m.id,author:"Team member",initials:"TM",time:new Date(m.created_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}),text:m.body});}
 return {team,name:teams.find(x=>x.id===team)?.name||team,tasks,logs,projects,events,messages,people:[]};
}
export async function addLiveTask(team,title,subgroup,userId){
 const sb=await client();unwrap(await sb.from("tasks").insert({team_id:team,title,subgroup,created_by:userId,status:"todo",priority:"Normal"}));
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
