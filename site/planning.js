// Blueprint non-AI inventory and milestone presentation logic.
export const inventoryUnits=Object.freeze(["each","mm","cm","m","g","kg","sheet"]);
export const milestoneStatuses=Object.freeze(["planned","in_progress","blocked","done"]);
export const milestoneLabels=Object.freeze({
 planned:"Planned",in_progress:"In progress",blocked:"Blocked",done:"Done"
});
export function stockCoverage(inventory=[],bom=[]){
 const totals=new Map();
 for(const line of bom){
  const q=Number(line.quantity_required);
  if(!Number.isFinite(q)||q<=0)continue;
  totals.set(line.inventory_id,(totals.get(line.inventory_id)||0)+q);
 }
 return inventory.map(item=>{
  const required=totals.get(item.id)||0;
  const available=Math.max(0,Number(item.quantity_on_hand)||0);
  const reorderAt=Math.max(0,Number(item.reorder_at)||0);
  return {...item,required,shortfall:Math.max(0,required-available),
    lowStock:reorderAt>0&&available<=reorderAt};
 });
}
export function milestonesFor(milestones=[],projectId){
 return milestones.filter(m=>m.project_id===projectId)
  .slice().sort((a,b)=>(a.due_on||"9999").localeCompare(b.due_on||"9999"));
}
export function milestoneProgress(items=[]){
 return items.length?Math.round(items.filter(item=>item.status==="done").length/items.length*100):0;
}
export function validQuantity(value,min=0,max=1000000){
 const n=Number(value);
 return String(value).trim()!==""&&Number.isSafeInteger(n)&&n>=min&&n<=max?n:null;
}
