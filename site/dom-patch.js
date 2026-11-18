// Blueprint native DOM reconciliation.
// Keep the workspace shell, focus, scroll viewport and unchanged controls
// mounted. Replacing #app.innerHTML on every interaction caused visible flashing.
function keyOf(node){
 if(node?.nodeType!==1)return "";
 return node.getAttribute("data-dom-key")||node.id||"";
}
function compatible(oldNode,newNode){
 if(!oldNode||!newNode||oldNode.nodeType!==newNode.nodeType)return false;
 if(oldNode.nodeType===1){
  if(oldNode.tagName!==newNode.tagName)return false;
  const oldKey=keyOf(oldNode),newKey=keyOf(newNode);
  if(oldKey||newKey)return oldKey===newKey;
  if(["INPUT","SELECT","TEXTAREA"].includes(oldNode.tagName)){
   return oldNode.getAttribute("name")===newNode.getAttribute("name")&&
          oldNode.getAttribute("type")===newNode.getAttribute("type");
  }
 }
 return true;
}
function updateAttrs(oldNode,newNode){
 const oldAttrs=Array.from(oldNode.attributes);
 for(const a of oldAttrs)if(!newNode.hasAttribute(a.name))oldNode.removeAttribute(a.name);
 for(const a of Array.from(newNode.attributes)){
  if(oldNode.getAttribute(a.name)!==a.value)oldNode.setAttribute(a.name,a.value);
 }
}
function patchNode(oldNode,newNode){
 if(oldNode.nodeType!==1){
  if(oldNode.nodeValue!==newNode.nodeValue)oldNode.nodeValue=newNode.nodeValue;
  return;
 }
 const active=typeof document!=="undefined"&&document.activeElement===oldNode;
 const sameFormContext=oldNode.getAttribute("data-form-context")===
  newNode.getAttribute("data-form-context");
 updateAttrs(oldNode,newNode);
 // Keep filled form drafts across background updates, but refresh an intentionally
 // changed form context (for example switching #general to #design).
 if(oldNode.tagName==="FORM"&&oldNode.id&&oldNode.id===newNode.id&&sameFormContext)return;
 if(oldNode.tagName==="INPUT"){
  if(!active&&oldNode.value!==newNode.value)oldNode.value=newNode.value;
  if(oldNode.checked!==newNode.checked)oldNode.checked=newNode.checked;
 }else if(oldNode.tagName==="TEXTAREA"){
  if(!active&&oldNode.value!==newNode.value)oldNode.value=newNode.value;
 }else if(oldNode.tagName==="SELECT"){
  if(!active&&oldNode.value!==newNode.value)oldNode.value=newNode.value;
 }
 // An actively edited textarea is a user draft; incoming Realtime changes
 // must not erase it while the member is still typing.
 if(active&&(oldNode.tagName==="TEXTAREA"||oldNode.isContentEditable))return;
 patchChildren(oldNode,newNode);
}
export function patchChildren(parent,desired){
 const oldChildren=Array.from(parent.childNodes);
 const keyed=new Map();
 for(const child of oldChildren){
  const k=keyOf(child);
  if(k&&!keyed.has(k))keyed.set(k,child);
 }
 const used=new Set();
 let cursor=parent.firstChild;
 for(const target of Array.from(desired.childNodes)){
  const wantedKey=keyOf(target);
  let match=wantedKey?keyed.get(wantedKey):null;
  if(match&&(!compatible(match,target)||used.has(match)))match=null;
  if(!match&&cursor&&!used.has(cursor)&&!keyOf(cursor)&&compatible(cursor,target))match=cursor;
  // On unkeyed parent children, the previous cursor may have been moved.
  // Prefer matching existing unkeyed siblings before inserting new nodes.
  if(!match&&!wantedKey){
   match=oldChildren.find(n=>!used.has(n)&&!keyOf(n)&&compatible(n,target))||null;
  }
  if(match){
   if(match!==cursor)parent.insertBefore(match,cursor);
   used.add(match);
   patchNode(match,target);
   cursor=match.nextSibling;
  }else{
   parent.insertBefore(target.cloneNode(true),cursor);
  }
 }
 for(const child of oldChildren)if(!used.has(child)&&child.parentNode===parent)parent.removeChild(child);
}
export function patchHtml(root,html){
 if(typeof document==="undefined"||typeof document.createElement!=="function"||!root?.childNodes)return false;
 const template=document.createElement("template");
 if(!template?.content?.childNodes)return false;
 template.innerHTML=html;
 patchChildren(root,template.content);
 return true;
}
