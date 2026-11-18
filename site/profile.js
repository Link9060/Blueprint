// Safe, fixed presentation tokens. Never concatenate arbitrary database values into CSS.
export const avatarColors=Object.freeze(["slate","blue","sage","amber","violet","rose"]);
export const avatarColorNames=Object.freeze({
 slate:"Graphite",blue:"Steel blue",sage:"Forest",amber:"Amber",violet:"Iris",rose:"Rose"
});
export function safeAvatarColor(value){return avatarColors.includes(value)?value:"slate";}
export function avatarClass(value){return "avatar-"+safeAvatarColor(value);}
export function localDateTime(value){
 if(!value)return "";
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return "";
 const local=new Date(date.getTime()-date.getTimezoneOffset()*60_000);
 return local.toISOString().slice(0,16);
}
