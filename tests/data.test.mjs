import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {teams,groups,channels,workspace,save,reset,progress} from "../site/data.js";

const storage=new Map();
globalThis.localStorage={
 getItem:key=>storage.get(key)??null,
 setItem:(key,value)=>storage.set(key,String(value)),
 removeItem:key=>storage.delete(key)
};

test("correct team registry and subgroup taxonomy",()=>{
 assert.deepEqual(teams.map(x=>x.id),["1810","9316"]);
 for(const group of ["Design","Manufacturing","Electrical","Programming","Strategy","Business"])assert.ok(groups.includes(group));
 assert.ok(channels.includes("general"));
});

test("preview stores remain isolated by team",()=>{
 const a=reset("1810"),b=reset("9316");
 assert.notEqual(a.team,b.team);
 const original=b.tasks.length;
 a.tasks.push({id:"test",title:"A-only task",status:"todo"});
 assert.equal(save("1810",a),true);
 const loadedA=workspace("1810"),loadedB=workspace("9316");
 assert.equal(loadedA.tasks.some(t=>t.id==="test"),true);
 assert.equal(loadedB.tasks.length,original);
 assert.equal(loadedB.tasks.some(t=>t.id==="test"),false);
});

test("workspace demo memberships have stable IDs and pending requests",()=>{
 for(const team of teams){
  const w=reset(team.id);
  assert.ok(w.people.length>0);
  assert.ok(w.people.every(p=>p.id&&p.status==="approved"));
  assert.ok(w.pending.length>0);
  assert.ok(w.pending.every(p=>p.status==="pending"));
  assert.ok(w.tasks.some(t=>t.assigned_to));
 }
});

test("progress calculates completion correctly",()=>{
 assert.equal(progress({tasks:[]}),0);
 assert.equal(progress({tasks:[{status:"done"},{status:"todo"},{status:"blocked"},{status:"done"}]}),50);
});

test("corrupt preview storage safely falls back to fixtures",()=>{
 storage.set("blueprint-preview-1810","{bad");
 assert.equal(workspace("1810").team,"1810");
 assert.ok(workspace("1810").tasks.length>0);
 storage.delete("blueprint-preview-1810");
});

test("schema protects team-scoped data using RLS",()=>{
 const sql=readFileSync(new URL("../database/schema.sql",import.meta.url),"utf8");
 for(const table of ["profiles","teams","team_memberships","tasks","build_logs","projects","messages","events"]){
  assert.ok(sql.includes("alter table public."+table+" enable row level security;"),table+" is missing RLS");
 }
 assert.match(sql,/create policy "Only admins manage memberships"/);
 assert.match(sql,/private\.is_approved_member\(team_id\)/);
 assert.match(sql,/private\.guard_task_change/);
 assert.match(sql,/Assignee must be an approved member of this team/);
});

test("production adapter never includes a secret key",()=>{
 const source=readFileSync(new URL("../site/supabase.js",import.meta.url),"utf8");
 assert.ok(source.includes("supabasePublishableKey"));
 assert.ok(!source.includes("service_role"));
});
