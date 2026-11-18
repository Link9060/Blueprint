// Blueprint demo fixtures and isolated local preview state.
// Everything in this module is fictional, visible only in your browser, and never sent to a server.
const library = {
  "1810": {
    name:"CATATRONICS",
    tasks:[
      {id:"t1",title:"Review drivetrain CAD",subgroup:"Design",due:"Tomorrow",status:"in_progress",priority:"High"},
      {id:"t2",title:"Verify mounting dimensions",subgroup:"Manufacturing",due:"Friday",status:"todo",priority:"Normal"},
      {id:"t3",title:"Test intake roller prototype",subgroup:"Mechanical",due:"Next meeting",status:"blocked",priority:"High"},
      {id:"t4",title:"Update scouting template",subgroup:"Strategy",due:"This week",status:"done",priority:"Normal"},
      {id:"t5",title:"Check motor controller wiring",subgroup:"Electrical",due:"Next meeting",status:"todo",priority:"Normal"}
    ],
    projects:[
      {name:"Drivetrain",icon:"◇",description:"Chassis, steering, mobility and gearboxes.",progress:80,lead:"Mechanical"},
      {name:"Intake",icon:"◎",description:"Collection, geometry and roller development.",progress:55,lead:"Design"},
      {name:"Elevator",icon:"↕",description:"Vertical positioning and structural integration.",progress:33,lead:"Mechanical"},
      {name:"Electrical",icon:"⌁",description:"Power distribution, sensors and wiring.",progress:71,lead:"Electrical"},
      {name:"Autonomous",icon:"⌘",description:"Motion planning, sensors and software.",progress:46,lead:"Programming"},
      {name:"Strategy",icon:"▤",description:"Scouting, match prep and drive team.",progress:61,lead:"Strategy"}
    ],
    logs:[
      {id:"l1",title:"Intake assembly updated",body:"Updated the roller layout and verified alignment on the prototype.",subgroup:"Mechanical",author:"Alex M.",time:"4:32 PM"},
      {id:"l2",title:"Autonomous routine revised",body:"Changed a test trajectory. Validation is scheduled for the next meeting.",subgroup:"Programming",author:"Jordan K.",time:"3:14 PM"},
      {id:"l3",title:"Elevator clearance flagged",body:"An interference issue requires a new fit check before assembly.",subgroup:"Design",author:"Taylor R.",time:"Yesterday"}
    ],
    people:[
      {name:"Alex M.",role:"Subgroup lead",group:"Mechanical",initials:"AM"},
      {name:"Jordan K.",role:"Member",group:"Programming",initials:"JK"},
      {name:"Taylor R.",role:"Member",group:"Design",initials:"TR"},
      {name:"Morgan S.",role:"Team captain",group:"Strategy",initials:"MS"},
      {name:"Casey B.",role:"Member",group:"Electrical",initials:"CB"},
      {name:"Sam D.",role:"Member",group:"Manufacturing",initials:"SD"}
    ]
  },
  "9316": {
    name:"CUBATRONICS",
    tasks:[
      {id:"t1",title:"Review intake mounting concept",subgroup:"Design",due:"Tomorrow",status:"in_progress",priority:"High"},
      {id:"t2",title:"Print bracket test pieces",subgroup:"Manufacturing",due:"Friday",status:"todo",priority:"Normal"},
      {id:"t3",title:"Update driver practice checklist",subgroup:"Strategy",due:"Next meeting",status:"done",priority:"Normal"},
      {id:"t4",title:"Bench-test motor wiring",subgroup:"Electrical",due:"This week",status:"blocked",priority:"High"}
    ],
    projects:[
      {name:"Drivetrain",icon:"◇",description:"Mobility, chassis and drivetrain.",progress:68,lead:"Mechanical"},
      {name:"Intake",icon:"◎",description:"Game-piece collection and routing.",progress:48,lead:"Design"},
      {name:"Electrical",icon:"⌁",description:"Power distribution and motor control.",progress:52,lead:"Electrical"},
      {name:"Programming",icon:"⌘",description:"Autonomous and teleoperated control.",progress:39,lead:"Programming"},
      {name:"Scouting",icon:"▤",description:"Match data and competition strategy.",progress:75,lead:"Strategy"},
      {name:"Manufacturing",icon:"⬡",description:"Custom parts, prints and fabrication.",progress:61,lead:"Manufacturing"}
    ],
    logs:[
      {id:"l1",title:"Bracket prototype prepared",body:"Printed a preliminary fit-check piece for the intake assembly.",subgroup:"Manufacturing",author:"Riley P.",time:"5:18 PM"},
      {id:"l2",title:"Electrical layout reviewed",body:"Identified a cleaner cable routing path near the chassis.",subgroup:"Electrical",author:"Avery C.",time:"Yesterday"}
    ],
    people:[
      {name:"Riley P.",role:"Subgroup lead",group:"Manufacturing",initials:"RP"},
      {name:"Avery C.",role:"Member",group:"Electrical",initials:"AC"},
      {name:"Chris J.",role:"Member",group:"Design",initials:"CJ"},
      {name:"Noah H.",role:"Team captain",group:"Strategy",initials:"NH"}
    ]
  }
};
const commonEvents=[
  {day:"18",month:"NOV",title:"Build meeting",details:"3:30 PM · Robotics lab",type:"Team"},
  {day:"20",month:"NOV",title:"CAD review",details:"4:00 PM · Design subgroup",type:"Design"},
  {day:"23",month:"NOV",title:"Programming test session",details:"3:45 PM · Robotics lab",type:"Programming"}
];
const initialMessages={
  general:[
    {author:"Alex M.",initials:"AM",time:"4:20 PM",text:"I've added the updated intake notes to the build log."},
    {author:"Jordan K.",initials:"JK",time:"4:38 PM",text:"I'll check the autonomous routine at our next test."}
  ],
  mechanical:[{author:"Alex M.",initials:"AM",time:"Yesterday",text:"Please review the prototype measurements before fabrication."}],
  programming:[{author:"Jordan K.",initials:"JK",time:"Yesterday",text:"Test notes have been added to the project card."}],
  design:[],electrical:[],manufacturing:[],strategy:[]
};
function clone(value){return JSON.parse(JSON.stringify(value));}
function make(team){
 const base=clone(library[team]||library["1810"]);
 const people=base.people.map((p,i)=>({...p,id:"demo-"+team+"-"+i,status:"approved"}));
 const tasks=base.tasks.map((t,i)=>({...t,assigned_to:i<3?people[i%people.length]?.id:null,priority:t.priority||"Normal",due_date:""}));
 const projects=base.projects.map((p,i)=>({...p,id:"demo-"+team+"-project-"+i,subgroup:p.lead}));
 const pending=[{user_id:"demo-pending-"+team,name:"Jamie L.",subgroup:"Design",role:"member",status:"pending"}];
 return {team,name:base.name,tasks,projects,logs:base.logs,people,pending,events:clone(commonEvents),messages:clone(initialMessages)};
}
export const teams=[{id:"1810",name:"CATATRONICS"},{id:"9316",name:"CUBATRONICS"}];
export const groups=["Design","Mechanical","Manufacturing","Electrical","Programming","Strategy","Business"];
export const channels=["general","mechanical","design","manufacturing","electrical","programming","strategy"];
export function workspace(team){
 const fallback=make(team);
 try{
   const raw=localStorage.getItem("blueprint-preview-"+team);
   if(!raw)return fallback;
   const old=JSON.parse(raw);
   if(!old||!Array.isArray(old.tasks)||!Array.isArray(old.logs))return fallback;
   const merged={...fallback,...old};
   merged.people=(merged.people||[]).map((p,i)=>({...p,id:p.id||"demo-"+team+"-"+i,status:p.status||"approved"}));
   merged.projects=(merged.projects||[]).map((p,i)=>({...p,id:p.id||"demo-"+team+"-project-"+i,subgroup:p.subgroup||p.lead}));
   merged.pending=Array.isArray(merged.pending)?merged.pending:fallback.pending;
   return merged;
 }catch{return fallback;}
}
export function save(team,data){
 try{localStorage.setItem("blueprint-preview-"+team,JSON.stringify(data));return true;}
 catch{return false;}
}
export function reset(team){try{localStorage.removeItem("blueprint-preview-"+team);}catch{}return make(team);}
export function isComplete(status){return status==="done";}
export function progress(data){
 const tasks=data.tasks||[];
 return tasks.length?Math.round(tasks.filter(task=>isComplete(task.status)).length/tasks.length*100):0;
}
