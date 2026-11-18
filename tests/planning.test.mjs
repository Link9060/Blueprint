import test from "node:test";
import assert from "node:assert/strict";
import {stockCoverage,inventoryUnits,milestoneStatuses,milestonesFor,milestoneProgress,validQuantity} from "../site/planning.js";
import {reset} from "../site/data.js";

test("BOM demand is summed across projects without double-counting stock",()=>{
 const stocks=[{id:"a",name:"Fasteners",quantity_on_hand:10,reorder_at:12},
               {id:"b",name:"Plate",quantity_on_hand:5,reorder_at:2}];
 const requirements=[{inventory_id:"a",quantity_required:7,project_id:"p1"},
  {inventory_id:"a",quantity_required:11,project_id:"p2"},
  {inventory_id:"b",quantity_required:2,project_id:"p2"}];
 const totals=stockCoverage(stocks,requirements);
 assert.equal(totals[0].required,18);
 assert.equal(totals[0].shortfall,8);
 assert.equal(totals[0].lowStock,true);
 assert.equal(totals[1].shortfall,0);
 assert.equal(totals[1].lowStock,false);
 assert.equal(stocks[0].required,undefined,"Do not mutate server data");
});
test("Milestones and inventory quantities are restricted to fixed values",()=>{
 assert.ok(inventoryUnits.includes("sheet"));
 assert.deepEqual(milestoneStatuses,["planned","in_progress","blocked","done"]);
 assert.equal(validQuantity("4",1),4);
 assert.equal(validQuantity("0",1),null);
 assert.equal(validQuantity("-1"),null);
 assert.equal(validQuantity("2.3"),null);
 assert.equal(validQuantity("Infinity"),null);
 assert.equal(validQuantity(""),null);
 const milestones=[{project_id:"p",due_on:"2026-12-04",status:"done"},
  {project_id:"p",due_on:"2026-12-01",status:"planned"},
  {project_id:"other",due_on:"2026-11-30",status:"done"}];
 assert.equal(milestonesFor(milestones,"p")[0].due_on,"2026-12-01");
 assert.equal(milestoneProgress(milestonesFor(milestones,"p")),50);
});
test("Every demo team has independent project-local BOM references and milestones",()=>{
 const a=reset("1810"),b=reset("9316");
 for(const d of [a,b]){
  assert.ok(d.inventory.length>0);
  assert.ok(d.bom.every(x=>d.projects.some(p=>p.id===x.project_id)));
  assert.ok(d.bom.every(x=>d.inventory.some(p=>p.id===x.inventory_id)));
  assert.ok(d.milestones.every(x=>d.projects.some(p=>p.id===x.project_id)));
 }
 assert.notEqual(a.inventory[0].id,b.inventory[0].id);
 assert.notEqual(a.bom[0].id,b.bom[0].id);
});
