// Blueprint v7 task and event preparation helpers (no AI or external calls).
export const preparationCategories=Object.freeze(["packing","pit","inspection","travel","other"]);
export const preparationLabels=Object.freeze({
 packing:"Packing",pit:"Pit",inspection:"Inspection",travel:"Travel",other:"Other"
});
export function taskPrerequisites(taskId,dependencies=[],tasks=[]){
 const ids=new Set(dependencies.filter(d=>d.task_id===taskId).map(d=>d.prerequisite_id));
 return tasks.filter(task=>ids.has(task.id));
}
export function taskBlockers(taskId,dependencies=[],tasks=[]){
 return taskPrerequisites(taskId,dependencies,tasks).filter(task=>task.status!=="done");
}
export function wouldCreateCycle(taskId,prerequisiteId,dependencies=[]){
 if(!taskId||!prerequisiteId||taskId===prerequisiteId)return true;
 const queue=[prerequisiteId],seen=new Set();
 while(queue.length){
  const current=queue.shift();
  if(current===taskId)return true;
  if(seen.has(current))continue;
  seen.add(current);
  for(const d of dependencies)if(d.task_id===current)queue.push(d.prerequisite_id);
 }
 return false;
}
export function eventPreparation(items=[],eventId){
 return items.filter(item=>item.event_id===eventId);
}
export function preparationProgress(items=[]){
 const done=items.filter(x=>x.status==="done").length;
 return {done,total:items.length,percent:items.length?Math.round(done/items.length*100):0};
}
