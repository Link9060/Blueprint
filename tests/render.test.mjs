import test from "node:test";
import assert from "node:assert/strict";

test("landing and sample workspace views render without browser dependencies", async()=>{
 const handlers={};
 let html="";
 const store=new Map();
 globalThis.window={ BLUEPRINT_CONFIG:{supabaseUrl:"",supabasePublishableKey:""} };
 globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 globalThis.sessionStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
 let mainViewport={scrollTop:0};
 const root={
  addEventListener:(name,fn)=>handlers[name]=fn,
  get innerHTML(){return html;},
  set innerHTML(value){html=String(value);mainViewport={scrollTop:0};},
  querySelector:(selector)=>selector===".main"&&html.includes('class="shell"')?mainViewport:null
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
  ["profile","My profile"],
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

 // Team leadership can edit existing logs and calendar events in preview.
 await handlers.click({target:fakeTarget("[data-view]","view","logs")});
 assert.ok(html.includes('data-edit-log="l1"'));
 await handlers.click({target:fakeTarget("[data-edit-log]","editLog","l1")});
 assert.ok(html.includes('id="log-form"'));
 assert.ok(html.includes('value="Intake assembly updated"'));
 await handlers.submit({target:{id:"log-form",values:{
  title:"Intake fit verified",body:"Fit test confirmed.",subgroup:"Mechanical"
 }},preventDefault(){}});
 assert.ok(html.includes("Intake fit verified"));
 await handlers.click({target:fakeTarget("[data-view]","view","calendar")});
 assert.ok(html.includes('data-edit-event="demo-1810-event-0"'));
 await handlers.click({target:fakeTarget("[data-edit-event]","editEvent","demo-1810-event-0")});
 assert.ok(html.includes('id="event-form"'));
 await handlers.submit({target:{id:"event-form",values:{
  title:"Updated build session",start:"2026-11-21T16:00"
 }},preventDefault(){}});
 assert.ok(html.includes("Updated build session"));
 await handlers.click({target:fakeTarget("[data-view]","view","profile")});
 assert.ok(html.includes('id="profile-form"'));
 assert.ok(html.includes('name="avatar_color"'));
 await handlers.submit({target:{id:"profile-form",values:{
  full_name:"Demo Operator",subgroup:"Mechanical",headline:"Robot CAD designer",
  bio:"Testing profile customization",avatar_color:"sage"
 }},preventDefault(){}});
 assert.ok(html.includes("Demo Operator"));
 assert.ok(html.includes("Robot CAD designer"));
 assert.ok(html.includes("avatar-sage"));

 // Engineering and safety features use fictional local preview data.
 await handlers.click({target:fakeTarget("[data-view]","view","projects")});
 assert.ok(html.includes("ENGINEERING REFERENCES"));
 assert.ok(html.includes('data-add-reference="demo-1810-project-0"'));
 await handlers.click({target:fakeTarget("[data-add-reference]","addReference","demo-1810-project-0")});
 assert.ok(html.includes('id="reference-form"'));
 await handlers.submit({target:{id:"reference-form",values:{
  title:"Intake CAD rev 4",url:"https://example.org/cad/v4",kind:"cad"
 }},preventDefault(){}});
 assert.ok(html.includes("Intake CAD rev 4"));
 await handlers.click({target:fakeTarget("[data-view]","view","manufacturing")});
 assert.ok(html.includes("Manufacturing requests"));
 await handlers.click(action("new-part"));
 assert.ok(html.includes('id="part-form"'));
 await handlers.submit({target:{id:"part-form",values:{
  part_name:"Mock elevator bracket",quantity:"2",method:"3d_print",
  project_id:"demo-1810-project-0",notes:"Fictional fit check"
 }},preventDefault(){}});
 assert.ok(html.includes("Mock elevator bracket"));
 assert.ok(html.includes('data-part-status='));
 await handlers.click({target:fakeTarget("[data-view]","view","messages")});
 assert.ok(html.includes('data-report-message="demo-1810-general-0"'));
 await handlers.click({target:fakeTarget("[data-report-message]","reportMessage","demo-1810-general-0")});
 assert.ok(html.includes('id="report-form"'));
 await handlers.submit({target:{id:"report-form",values:{
  reason:"other",note:"Please check fictional message"
 }},preventDefault(){}});
 await handlers.click({target:fakeTarget("[data-view]","view","safety")});
 assert.ok(html.includes("Moderation &amp; activity"));
 assert.ok(html.includes("Please check fictional message"));
 assert.ok(html.includes('data-review-report='));

 // Inventory, multi-project BOM and milestone forms use fictional sample data.
 await handlers.click({target:fakeTarget("[data-view]","view","inventory")});
 assert.ok(html.includes("Parts inventory"));
 assert.ok(html.includes("Short 8"));
 await handlers.click(action("new-stock"));
 assert.ok(html.includes('id="stock-form"'));
 await handlers.submit({target:{id:"stock-form",values:{
  name:"Polycarbonate sheet",sku:"PLATE-REV2",quantity_on_hand:"3",
  reorder_at:"2",unit:"sheet",storage_location:"Rack B",notes:"Prototype material"
 }},preventDefault(){}});
 assert.ok(html.includes("Polycarbonate sheet"));
 await handlers.click({target:fakeTarget("[data-edit-stock]","editStock","demo-1810-stock-0")});
 assert.ok(html.includes('id="stock-form"'));
 await handlers.submit({target:{id:"stock-form",values:{
  name:"M5 socket head bolts",sku:"FAST-M5-20",quantity_on_hand:"20",
  reorder_at:"12",unit:"each",storage_location:"Fastener drawer A",notes:"Count verified"
 }},preventDefault(){}});
 assert.ok(html.includes("Count verified"));
 assert.ok(!html.includes("Short 8"));
 await handlers.click({target:fakeTarget("[data-view]","view","projects")});
 assert.ok(html.includes("BILL OF MATERIALS"));
 assert.ok(html.includes("MILESTONES"));
 assert.ok(html.includes('data-add-bom="demo-1810-project-0"'));
 await handlers.click({target:fakeTarget("[data-add-bom]","addBom","demo-1810-project-0")});
 assert.ok(html.includes('id="bom-form"'));
 await handlers.submit({target:{id:"bom-form",values:{
  inventory_id:"demo-1810-stock-1",quantity_required:"150",notes:"Frame test requirement"
 }},preventDefault(){}});
 assert.ok(html.includes("Need 150 mm"),"New BOM requirement appears under the project");
 await handlers.click({target:fakeTarget("[data-edit-bom]","editBom","demo-1810-bom-0")});
 assert.ok(html.includes('id="bom-form"'));
 await handlers.submit({target:{id:"bom-form",values:{
  inventory_id:"demo-1810-stock-0",quantity_required:"24",notes:"Revised bolt count"
 }},preventDefault(){}});
 assert.ok(html.includes("Need 24 each"));
 await handlers.click({target:fakeTarget("[data-add-milestone]","addMilestone","demo-1810-project-0")});
 assert.ok(html.includes('id="milestone-form"'));
 await handlers.submit({target:{id:"milestone-form",values:{
  title:"Assembly ready",status:"planned",due_on:"2026-12-15",notes:"Verify fit"
 }},preventDefault(){}});
 assert.ok(html.includes("Assembly ready"));
 await handlers.click({target:fakeTarget("[data-edit-milestone]","editMilestone","demo-1810-milestone-0")});
 assert.ok(html.includes('id="milestone-form"'));
 await handlers.submit({target:{id:"milestone-form",values:{
  title:"Finalize drivetrain mounting",status:"done",due_on:"2026-12-04",notes:"Confirmed"
 }},preventDefault(){}});
 assert.ok(html.includes("1 of 3")||html.includes("33% done"));

 // The role inspector must hide admin tools in the Member view and never grant
 // or change server-side permissions.
 const selectRole=role=>({
  value:role,
  closest:query=>query==="[data-preview-role]"?{value:role}:null
 });
 await handlers.change({target:selectRole("member")});
 assert.ok(html.includes("Viewing as Member"));
 assert.ok(!html.includes('data-view="admin"'));
 await handlers.click({target:fakeTarget("[data-view]","view","logs")});
 assert.ok(!html.includes("data-edit-log="),"Member preview should not show log editing");
 await handlers.click({target:fakeTarget("[data-view]","view","inventory")});
 assert.ok(!html.includes("data-edit-stock="),"Member preview must not show stock controls");
 await handlers.click(action("new-stock"));
 assert.ok(!html.includes('id="stock-form"'),"Role inspector must block new inventory writes");
 await handlers.click(action("new-project"));
 assert.ok(!html.includes('id="project-form"'),"preview must remain read-only");
 await handlers.change({target:selectRole("admin")});
 assert.ok(html.includes("Viewing as Admin"));
 assert.ok(html.includes('data-view="admin"'));
 await handlers.change({target:selectRole("actual")});
 assert.ok(!html.includes("Viewing as Admin"));

 // Editing a card or opening a modal should not jump the workspace to the top.
 await handlers.click({target:fakeTarget("[data-view]","view","overview")});
 root.querySelector(".main").scrollTop=280;
 await handlers.click(action("notifications"));
 assert.equal(root.querySelector(".main").scrollTop,280,"Same-view render should keep scroll position");
 await handlers.click({target:fakeTarget("[data-view]","view","tasks")});
 assert.equal(root.querySelector(".main").scrollTop,0,"Opening a different section must start at the top");

});

test("pending and rejected screens provide secure exit and preview paths", async()=>{
 const {readFileSync}=await import("node:fs");
 const source=readFileSync(new URL("../site/app.js",import.meta.url),"utf8");
 const pending=source.slice(source.indexOf("function waitingPage(){"),source.indexOf("function selectionOptions(",source.indexOf("function waitingPage(){")));
 const rejected=source.slice(source.indexOf("function rejectedPage(){"),source.indexOf("function connectionPage(){"));
 const connection=source.slice(source.indexOf("function connectionPage(){"),source.indexOf("function modal(){"));
 for(const page of [pending,rejected,connection]){
  assert.match(page,/data-action|button\("Sign out/);
  assert.ok(page.includes('"sign-out"'),"Must be able to sign out");
  assert.ok(page.includes('"open-preview"'),"Must allow fictional demo access");
  assert.ok(page.includes('"refresh-access"'),"Must allow checking approval");
 }
 assert.match(pending,/state\.user\?\.email/);
});
