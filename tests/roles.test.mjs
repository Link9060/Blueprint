import test from "node:test";
import assert from "node:assert/strict";
import {roleLabels,rolePreviewOptions,canManageTeam,canManageWork,roleIsPreviewable,roleOptionsForManager} from "../site/roles.js";

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

test("Delegated team roles cannot elevate self or peers beyond authority",()=>{
 assert.deepEqual(roleOptionsForManager("lead","member"),["member","lead"]);
 assert.deepEqual(roleOptionsForManager("lead","lead"),[]);
 assert.deepEqual(roleOptionsForManager("lead","owner"),[]);
 assert.deepEqual(roleOptionsForManager("mentor","member"),["member","lead","mentor","captain"]);
 assert.deepEqual(roleOptionsForManager("admin","lead"),["member","lead","mentor","captain","admin"]);
 assert.deepEqual(roleOptionsForManager("admin","admin"),[]);
 assert.deepEqual(roleOptionsForManager("owner","member",true),[]);
 assert.ok(!roleOptionsForManager("owner","member").includes("owner"));
});
