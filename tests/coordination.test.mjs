import test from "node:test";
import assert from "node:assert/strict";
import {taskPrerequisites,taskBlockers,wouldCreateCycle,eventPreparation,preparationProgress,preparationCategories} from "../site/coordination.js";
import {reset} from "../site/data.js";

test("task prereqs identify unfinished blockers and prevent cycles",()=>{
 const tasks=[{id:"a",status:"in_progress"},{id:"b",status:"todo"},{id:"c",status:"done"}];
 const deps=[{task_id:"b",prerequisite_id:"a"},{task_id:"a",prerequisite_id:"c"}];
 assert.deepEqual(taskPrerequisites("b",deps,tasks).map(x=>x.id),["a"]);
 assert.deepEqual(taskBlockers("b",deps,tasks).map(x=>x.id),["a"]);
 assert.equal(wouldCreateCycle("c","b",deps),true,"transitive cycles must be rejected");
 assert.equal(wouldCreateCycle("a","a",deps),true,"self dependencies are invalid");
 assert.equal(wouldCreateCycle("b","c",deps),false);
 assert.equal(wouldCreateCycle("b","a",deps),false,"duplicate prevention is a separate check");
});
test("event checklists are scoped and progress is accurate",()=>{
 const records=[{event_id:"e1",status:"done"},{event_id:"e1",status:"todo"},{event_id:"e2",status:"done"}];
 assert.equal(eventPreparation(records,"e1").length,2);
 assert.deepEqual(preparationProgress(eventPreparation(records,"e1")),{done:1,total:2,percent:50});
 assert.deepEqual(preparationProgress([]),{done:0,total:0,percent:0});
 assert.ok(preparationCategories.includes("inspection"));
});
test("demo team data has independent task links and event checklists",()=>{
 const a=reset("1810"),b=reset("9316");
 for(const ws of [a,b]){
  assert.ok(ws.taskDependencies.every(x=>ws.tasks.some(t=>t.id===x.task_id)&&ws.tasks.some(t=>t.id===x.prerequisite_id)));
  assert.ok(ws.eventChecklist.every(x=>ws.events.some(e=>e.id===x.event_id)));
  assert.equal(taskBlockers("t2",ws.taskDependencies,ws.tasks).length,1);
 }
 assert.notEqual(a.eventChecklist[0].id,b.eventChecklist[0].id);
});
