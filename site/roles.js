// Browser presentation only. Database row-level security is authoritative.
export const roleLabels=Object.freeze({
 owner:"Owner",admin:"Admin",captain:"Captain",
 mentor:"Mentor",lead:"Lead",member:"Member"
});
export const rolePreviewOptions=Object.freeze(["admin","captain","mentor","lead","member"]);
export function canManageTeam(role){return ["owner","admin"].includes(role);}
export function canManageWork(role){return ["owner","admin","captain","mentor","lead"].includes(role);}
export function roleIsPreviewable(role){return rolePreviewOptions.includes(role);}

export const roleTiers=Object.freeze({member:1,lead:2,mentor:3,captain:3,admin:4,owner:5});
export function roleOptionsForManager(actorRole,targetRole,ownTarget=false){
 if(ownTarget || targetRole==="owner")return [];
 const actor=roleTiers[actorRole]||0;
 const target=roleTiers[targetRole]||0;
 if(actor<2||target>=actor)return [];
 return ["member","lead","mentor","captain","admin"].filter(role=>(roleTiers[role]||0)<=actor);
}
