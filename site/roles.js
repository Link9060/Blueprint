// Browser presentation only. Database row-level security is authoritative.
export const roleLabels=Object.freeze({
 owner:"Owner",admin:"Admin",captain:"Captain",
 mentor:"Mentor",lead:"Lead",member:"Member"
});
export const rolePreviewOptions=Object.freeze(["admin","captain","mentor","lead","member"]);
export function canManageTeam(role){return ["owner","admin"].includes(role);}
export function canManageWork(role){return ["owner","admin","captain","mentor","lead"].includes(role);}
export function roleIsPreviewable(role){return rolePreviewOptions.includes(role);}
