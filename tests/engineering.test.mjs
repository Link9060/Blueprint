import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {safeReferenceUrl,fabricationStatuses,fabricationMethods,reportReasons} from "../site/engineering.js";
import {workspace,reset} from "../site/data.js";

test("Engineering references require ordinary HTTPS addresses",()=>{
 assert.ok(safeReferenceUrl("https://example.org/cad/rev4").startsWith("https://example.org/"));
 for(const bad of ["javascript:alert(1)","http://example.org","https://user:pw@example.org", "https://example.org\"><script>","https://bad host/"]){
  assert.equal(safeReferenceUrl(bad),"",bad);
 }
});
test("Moderation and manufacturing options use fixed enumerations",()=>{
 assert.deepEqual(reportReasons,["inappropriate","bullying","privacy","other"]);
 assert.ok(fabricationStatuses.includes("in_progress"));
 assert.ok(fabricationMethods.includes("3d_print"));
});
test("Both fictional team workspaces get isolated safety and engineering fixtures",()=>{
 for(const team of ["1810","9316"]){
  const d=reset(team);
  assert.ok(Array.isArray(d.projectLinks));
  assert.ok(Array.isArray(d.partRequests));
  assert.ok(Array.isArray(d.reports));
  assert.ok(Array.isArray(d.activity));
  assert.ok(d.projects.every(p=>p.id.startsWith("demo-"+team)));
  assert.equal(d.reports[0].message_id,"demo-"+team+"-general-0");
 }
 const a=workspace("1810"),b=workspace("9316");
 assert.notEqual(a.partRequests[0].id,b.partRequests[0].id);
});
test("Moderation UI and API are gated and do not remove source messages",()=>{
 const app=readFileSync(new URL("../site/app.js",import.meta.url),"utf8");
 const api=readFileSync(new URL("../site/supabase.js",import.meta.url),"utf8");
 assert.match(app,/function renderSafety\(\)/);
 assert.match(app,/if\(!canAdmin\(\)\)return heading\("TEAM SAFETY"/);
 assert.match(app,/previewReadOnly\(\)\|\|!canAdmin\(\)/);
 assert.match(api,/export async function reportTeamMessage/);
 assert.match(api,/export async function setMessageVisibility/);
 assert.doesNotMatch(api,/from\("messages"\)\.delete\(/);
});
