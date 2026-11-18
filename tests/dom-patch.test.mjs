import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {patchChildren,patchHtml} from "../site/dom-patch.js";
import {celebrateTask,installMotion} from "../site/motion.js";

// Minimal DOM contract: verifies reconciliation without third-party runtime
// dependencies, in addition to the app's existing mocked render tests.
class FakeNode{
 constructor(type){this.nodeType=type;this.parentNode=null;}
 get nextSibling(){
  if(!this.parentNode)return null;
  const siblings=this.parentNode.childNodes;
  return siblings[siblings.indexOf(this)+1]||null;
 }
}
class FakeText extends FakeNode{
 constructor(value){super(3);this.nodeValue=value;}
 cloneNode(){return new FakeText(this.nodeValue);}
}
class FakeElement extends FakeNode{
 constructor(tag,attrs={},children=[]){
  super(1);this.tagName=tag.toUpperCase();this._attrs=new Map(Object.entries(attrs));
  this.childNodes=[];this.value=attrs.value||"";this.checked=false;this.isContentEditable=false;
  for(const child of children)this.insertBefore(child,null);
 }
 get attributes(){return Array.from(this._attrs).map(([name,value])=>({name,value}));}
 get id(){return this.getAttribute("id")||"";}
 get firstChild(){return this.childNodes[0]||null;}
 getAttribute(name){return this._attrs.has(name)?this._attrs.get(name):null;}
 hasAttribute(name){return this._attrs.has(name);}
 setAttribute(name,value){this._attrs.set(name,String(value));}
 removeAttribute(name){this._attrs.delete(name);}
 insertBefore(node,before){
  if(node.parentNode)node.parentNode.removeChild(node);
  const index=before===null?this.childNodes.length:this.childNodes.indexOf(before);
  if(index<0)throw new Error("Invalid sibling anchor");
  this.childNodes.splice(index,0,node);node.parentNode=this;
  return node;
 }
 removeChild(node){
  const index=this.childNodes.indexOf(node);
  if(index<0)throw new Error("Child missing");
  this.childNodes.splice(index,1);node.parentNode=null;return node;
 }
 cloneNode(deep=false){
  const out=new FakeElement(this.tagName.toLowerCase(),Object.fromEntries(this._attrs));
  out.value=this.value;out.checked=this.checked;
  if(deep)for(const child of this.childNodes)out.insertBefore(child.cloneNode(true),null);
  return out;
 }
}
function el(tag,attrs={},children=[]){return new FakeElement(tag,attrs,children);}
function txt(value){return new FakeText(value);}

test("same-view reconciliation preserves shell identity and updates only changed text",()=>{
 const header=el("nav",{},[el("button",{"id":"projects"},[txt("Projects")])]);
 const content=el("main",{"data-dom-key":"view-tasks"},[
  el("div",{"data-dom-key":"task-1"},[txt("Review CAD")])
 ]);
 const shell=el("div",{"class":"shell"},[header,content]);
 const root=el("div",{},[shell]);
 const desired=el("div",{},[
  el("div",{"class":"shell"},[
   el("nav",{},[el("button",{"id":"projects"},[txt("Projects")])]),
   el("main",{"data-dom-key":"view-tasks"},[
    el("div",{"data-dom-key":"task-1"},[txt("Review CAD ✓")])
   ])
  ])
 ]);
 patchChildren(root,desired);
 assert.equal(root.firstChild,shell,"Shell must stay mounted");
 assert.equal(shell.firstChild,header,"Sidebar/nav must not be rebuilt");
 assert.equal(shell.childNodes[1],content,"The active view stays mounted");
 assert.equal(content.firstChild.firstChild.nodeValue,"Review CAD ✓");
});

test("changing views replaces only keyed view, not surrounding chrome",()=>{
 const bar=el("header",{},[txt("Workspace")]);
 const oldView=el("section",{"data-dom-key":"view-tasks"},[txt("Tasks")]);
 const shell=el("div",{},[bar,oldView]);
 const root=el("div",{},[shell]);
 patchChildren(root,el("div",{},[
  el("div",{},[el("header",{},[txt("Workspace")]),
                el("section",{"data-dom-key":"view-calendar"},[txt("Calendar")])])
 ]));
 assert.equal(root.firstChild,shell);
 assert.equal(shell.firstChild,bar);
 assert.notEqual(shell.childNodes[1],oldView);
 assert.equal(shell.childNodes[1].getAttribute("data-dom-key"),"view-calendar");
});

test("reordered keyed tasks retain original nodes without duplicating cards",()=>{
 const one=el("article",{"data-dom-key":"task-1"},[txt("One")]);
 const two=el("article",{"data-dom-key":"task-2"},[txt("Two")]);
 const parent=el("div",{},[one,two]);
 patchChildren(parent,el("div",{},[
  el("article",{"data-dom-key":"task-2"},[txt("Two done")]),
  el("article",{"data-dom-key":"task-3"},[txt("Three")]),
  el("article",{"data-dom-key":"task-1"},[txt("One")])
 ]));
 assert.equal(parent.childNodes.length,3);
 assert.equal(parent.childNodes[0],two);
 assert.equal(parent.childNodes[2],one);
 assert.equal(two.firstChild.nodeValue,"Two done");
});

test("active draft input retains value and identity during a background update",()=>{
 const draft=el("input",{"name":"body","value":"Initial"});
 draft.value="Unsent work in progress";
 const root=el("form",{},[draft]);
 globalThis.document={activeElement:draft};
 patchChildren(root,el("form",{},[
  el("input",{"name":"body","value":"Old server value"})
 ]));
 assert.equal(root.firstChild,draft);
 assert.equal(draft.value,"Unsent work in progress");
 delete globalThis.document;
 assert.equal(patchHtml(root,"<div>Unavailable in Node</div>"),false);
});

test("multiple unsaved form fields remain mounted after unrelated live updates",()=>{
 const name=el("input",{name:"title",value:"Old title"});
 const notes=el("textarea",{name:"notes"},[txt("Old notes")]);
 name.value="My new title";
 notes.value="Unsubmitted notes from two minutes of work";
 const form=el("form",{id:"task-edit-form"},[name,notes]);
 const layout=el("div",{},[form,el("aside",{},[txt("4 team messages")])]);
 const root=el("div",{},[layout]);
 patchChildren(root,el("div",{},[
  el("div",{},[
   el("form",{id:"task-edit-form"},[
    el("input",{name:"title",value:"Old title"}),
    el("textarea",{name:"notes"},[txt("Old notes")])
   ]),
   el("aside",{},[txt("5 team messages")])
  ])
 ]));
 assert.equal(root.firstChild.firstChild,form,"Background changes must keep the existing form");
 assert.equal(name.value,"My new title");
 assert.equal(notes.value,"Unsubmitted notes from two minutes of work");
 assert.equal(root.firstChild.childNodes[1].firstChild.nodeValue,"5 team messages");
});

test("completion animation only follows a confirmed, visible completed state",()=>{
 const set=new Set(["done"]);
 const b={
  dataset:{toggle:"t2"},
  classList:{contains:value=>set.has(value),add:value=>set.add(value),remove:value=>set.delete(value)},
  offsetWidth:18
 };
 const root={querySelectorAll:()=>[b]};
 const callbacks=[];
 globalThis.window={
  matchMedia:q=>({matches:q.includes("reduce")?false:true}),
  setTimeout:fn=>callbacks.push(fn)
 };
 celebrateTask(root,"t2");
 assert.equal(set.has("just-completed"),true);
 callbacks.forEach(fn=>fn());
 assert.equal(set.has("just-completed"),false);
 set.delete("done");
 celebrateTask(root,"t2");
 assert.equal(set.has("just-completed"),false);
 delete globalThis.window;
});

test("premium UI uses persistent reconciliation with reduced motion support",()=>{
 const app=readFileSync(new URL("../site/app.js",import.meta.url),"utf8");
 const css=readFileSync(new URL("../site/styles.css",import.meta.url),"utf8");
 assert.match(app,/if\(!patchHtml\(app,markup\)\)app\.innerHTML=markup/);
 assert.doesNotMatch(app,/app\.innerHTML=shell\(\)\+modal\(\)/);
 assert.match(app,/if\(!quiet&&!state\.data\)/);
 assert.match(app,/celebrateTask\(app,task\.id\)/);
 assert.match(app,/data-dom-key="view-/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.blueprint-orbit/);
 assert.match(css,/completion-spring/);
 assert.equal(typeof installMotion,"function");
});
