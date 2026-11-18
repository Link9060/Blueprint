import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {avatarColors,safeAvatarColor,avatarClass,localDateTime} from "../site/profile.js";

test("avatar customization only produces safe, fixed CSS tokens",()=>{
 assert.deepEqual(avatarColors,["slate","blue","sage","amber","violet","rose"]);
 assert.equal(safeAvatarColor("sage"),"sage");
 assert.equal(safeAvatarColor('blue";background:url(https://example.test)'),"slate");
 assert.equal(avatarClass("<script>"),"avatar-slate");
});
test("profile input date-time is local and correctly formatted",()=>{
 assert.equal(localDateTime(""),"");
 assert.equal(localDateTime("nonsense"),"");
 assert.match(localDateTime("2026-11-21T19:30:00.000Z"),/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
});
test("the UI exposes edit controls only behind existing manager check",()=>{
 const code=readFileSync(new URL("../site/app.js",import.meta.url),"utf8");
 for(const control of ["data-edit-log","data-edit-event"]){
  assert.ok(code.includes(control));
 }
 assert.match(code,/if\(logEdit&&canEdit\(\)&&!previewReadOnly\(\)\)/);
 assert.match(code,/if\(eventEdit&&canEdit\(\)&&!previewReadOnly\(\)\)/);
 assert.match(code,/if\(form\.id==="profile-form"\)/);
});
