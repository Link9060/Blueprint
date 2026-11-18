// Fixed enums and safe external reference link handling.
export const reportReasons=Object.freeze(["inappropriate","bullying","privacy","other"]);
export const fabricationMethods=Object.freeze(["3d_print","cnc","laser","assembly","other"]);
export const fabricationStatuses=Object.freeze(["requested","approved","in_progress","on_hold","completed"]);
export const engineeringKinds=Object.freeze(["cad","drawing","document","code","other"]);
export const fabricationLabels=Object.freeze({
 "3d_print":"3D print",cnc:"CNC",laser:"Laser",assembly:"Assembly",other:"Other"
});
export const fabricationStatusLabels=Object.freeze({
 requested:"Requested",approved:"Approved",in_progress:"In progress",
 on_hold:"On hold",completed:"Completed"
});
export function safeReferenceUrl(raw){
 const value=String(raw||"").trim();
 if(value.length>1000||!/^https:\/\//.test(value))return "";
 try{
  const url=new URL(value);
  if(url.protocol!=="https:"||!url.hostname||url.username||url.password)return "";
  if(!/^[A-Za-z0-9.-]+$/.test(url.hostname))return "";
  return url.href;
 }catch{return "";}
}
