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
  ["tasks","Tasks &amp; assignments"],
  ["projects","Projects &amp; subsystems"],
  ["calendar","Schedule"],
  ["announcements","Announcements"],
  ["admin","Membership review"],
  ["messages","Team messages"],
  ["settings","Workspace settings"]
 ]){
  await handlers.click({target:fakeTarget("[data-view]","view",view)});
  assert.ok(html.includes(signature),"Missing "+view+" view");
 }

 // Verify modal forms and local demo save flows, without contacting the live database.
 const action = value=>({target:fakeTarget("[data-action]","action",value)});
 await handlers.click(action("new-project"));
 assert.ok(html.includes('id="project-form"'));
 globalThis.FormData=class{constructor(form){this.value=form.values;}get(key){return this.value[key]??null;}};
 globalThis.document.createElement=()=>({className:"",textContent:"",remove(){}});
 globalThis.document.body={append:()=>{}};
 await handlers.submit({target:{id:"project-form",values:{name:"Prototype Frame",description:"Demo only",subgroup:"Design",progress:"0"}},preventDefault(){}});
 assert.ok(html.includes("Prototype Frame"));
 await handlers.click(action("new-event"));
 assert.ok(html.includes('id="event-form"'));
 await handlers.submit({target:{id:"event-form",values:{title:"Demo review",start:"2026-11-20T17:00"}},preventDefault(){}});
 assert.ok(html.includes("Demo review"));
 await handlers.click(action("new-announcement"));
 assert.ok(html.includes('id="announcement-form"'));
 await handlers.submit({target:{id:"announcement-form",values:{title:"Demo briefing",body:"An example update"}} ,preventDefault(){}});
 assert.ok(html.includes("Demo briefing"));

 // The role inspector must hide admin tools in the Member view and never grant
 // or change server-side permissions.
 const selectRole=role=>({
  value:role,
  closest:query=>query==="[data-preview-role]"?{value:role}:null
 });
 await handlers.change({target:selectRole("member")});
 assert.ok(html.includes("Viewing as Member"));
 assert.ok(!html.includes('data-view="admin"'));
 await handlers.click(action("new-project"));
 assert.ok(!html.includes('id="project-form"'),"preview must remain read-only");
 await handlers.change({target:selectRole("admin")});
 assert.ok(html.includes("Viewing as Admin"));
 assert.ok(html.includes('data-view="admin"'));
 await handlers.change({target:selectRole("actual")});
 assert.ok(!html.includes("Viewing as Admin"));

});
