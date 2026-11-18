import test from "node:test";
import assert from "node:assert/strict";

test("landing and sample workspace views render without browser dependencies", async()=>{
 const handlers={};
 let html="";
 const store=new Map();
 globalThis.window={ BLUEPRINT_CONFIG:{supabaseUrl:"",supabasePublishableKey:""} };
 globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 globalThis.sessionStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
 const root={
  addEventListener:(name,fn)=>handlers[name]=fn,
  get innerHTML(){return html;},
  set innerHTML(value){html=String(value);}
 };
 globalThis.document={
  getElementById:id=>id==="app"?root:null,
  addEventListener:(name,fn)=>handlers["document-"+name]=fn,
  querySelector:()=>null
 };
 await import("../site/app.js");
 assert.match(html,/team-choice/);
 const fakeTarget=(selector,key,value)=>({closest:query=>query===selector?{dataset:{[key]:value}}:null});
 await handlers.click({target:fakeTarget("[data-team]","team","1810")});
 assert.match(html,/A clearer way to build/);
 for(const [view,signature] of [
  ["tasks","Tasks & assignments"],
  ["projects","Projects & subsystems"],
  ["calendar","Schedule"],
  ["announcements","Announcements"],
  ["admin","Membership review"],
  ["messages","Team messages"],
  ["settings","Workspace settings"]
 ]){
  await handlers.click({target:fakeTarget("[data-view]","view",view)});
  assert.ok(html.includes(signature),"Missing "+view+" view");
 }
});
