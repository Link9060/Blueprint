import test from "node:test";
import assert from "node:assert/strict";
import {roleLabels,rolePreviewOptions,canManageTeam,canManageWork,roleIsPreviewable} from "../site/roles.js";

test("Owner is the highest tier while ordinary admins cannot assign Owner",()=>{
 assert.equal(roleLabels.owner,"Owner");
 assert.deepEqual(rolePreviewOptions,["admin","captain","mentor","lead","member"]);
 assert.equal(canManageTeam("owner"),true);
 assert.equal(canManageTeam("admin"),true);
 assert.equal(canManageTeam("captain"),false);
 assert.equal(canManageTeam("member"),false);
 assert.equal(canManageWork("lead"),true);
 assert.equal(canManageWork("member"),false);
 assert.equal(roleIsPreviewable("owner"),false);
 assert.equal(roleIsPreviewable("admin"),true);
});
