// Blueprint ambient interactions. Pointer-fine only; strictly decorative.
// Delegated listeners survive every UI reconciliation and keep form handling intact.
export function installMotion(root){
 if(!root||typeof window==="undefined"||typeof window.matchMedia!=="function")return ()=>{};
 const motionOK=()=>window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
 const fine=()=>window.matchMedia("(hover: hover) and (pointer: fine)").matches;
 let hovered=null,frame=0,lastPoint=null;
 const targetSelector=".btn,.round-button,.team-choice,.team-picker,.nav button,.channel,.filter,.task-check,.card.stat,.card.project,.card.stock-card,.card.manufacture-item,.calendar-prep-card";
 function clear(){
  if(hovered){
   hovered.classList.remove("pointer-near");
   hovered.style.removeProperty("--pointer-x");
   hovered.style.removeProperty("--pointer-y");
   hovered.style.removeProperty("--pointer-lift-x");
   hovered.style.removeProperty("--pointer-lift-y");
  }
  hovered=null;
 }
 function draw(){
  frame=0;
  const point=lastPoint;
  if(!point||!motionOK()||!fine()){clear();return;}
  const t=point.target;
  const candidate=t&&typeof t.closest==="function"?t.closest(targetSelector):null;
  if(candidate!==hovered){
   clear();
   hovered=candidate&&root.contains(candidate)?candidate:null;
   hovered?.classList.add("pointer-near");
  }
  if(hovered){
   const rect=hovered.getBoundingClientRect();
   if(rect.width>0&&rect.height>0){
    const x=Math.min(100,Math.max(0,(point.x-rect.left)/rect.width*100));
    const y=Math.min(100,Math.max(0,(point.y-rect.top)/rect.height*100));
    hovered.style.setProperty("--pointer-x",x+"%");
    hovered.style.setProperty("--pointer-y",y+"%");
    if(hovered.matches(".btn,.round-button,.team-picker,.team-choice")){
     hovered.style.setProperty("--pointer-lift-x",((x-50)/50*1.6).toFixed(2)+"px");
     hovered.style.setProperty("--pointer-lift-y",((y-50)/50*1.4).toFixed(2)+"px");
    }
   }
  }
  const orb=root.querySelector?.(".blueprint-orbit");
  if(orb){
   const rect=orb.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
   const dx=point.x-cx,dy=point.y-cy,dist=Math.hypot(dx,dy);
   const proximity=Math.max(0,1-dist/340);
   const x=Math.max(-16,Math.min(16,dx*.045))*proximity;
   const y=Math.max(-16,Math.min(16,dy*.045))*proximity;
   orb.style.setProperty("--orbit-near",proximity.toFixed(3));
   orb.style.setProperty("--orbit-x",x.toFixed(2)+"px");
   orb.style.setProperty("--orbit-y",y.toFixed(2)+"px");
   orb.style.setProperty("--orbit-rim-x",(x*.38).toFixed(2)+"px");
   orb.style.setProperty("--orbit-rim-y",(y*.38).toFixed(2)+"px");
   orb.style.setProperty("--orbit-axis-x",(x*.65).toFixed(2)+"px");
   orb.style.setProperty("--orbit-axis-y",(y*.65).toFixed(2)+"px");
   orb.style.setProperty("--orbit-scale",(1+proximity*.24).toFixed(3));
   orb.style.setProperty("--orbit-opacity",(.56+proximity*.38).toFixed(3));
  }
 }
 function move(event){
  if(!motionOK()||!fine())return;
  lastPoint={x:event.clientX,y:event.clientY,target:event.target};
  if(!frame)frame=window.requestAnimationFrame(draw);
 }
 function leave(){
  if(frame){window.cancelAnimationFrame(frame);frame=0;}
  lastPoint=null;clear();
  const orb=root.querySelector?.(".blueprint-orbit");
  if(orb){
   orb.style.setProperty("--orbit-near","0");
   orb.style.setProperty("--orbit-x","0px");
   orb.style.setProperty("--orbit-y","0px");
   orb.style.setProperty("--orbit-rim-x","0px");
   orb.style.setProperty("--orbit-rim-y","0px");
   orb.style.setProperty("--orbit-axis-x","0px");
   orb.style.setProperty("--orbit-axis-y","0px");
   orb.style.setProperty("--orbit-scale","1");
   orb.style.setProperty("--orbit-opacity",".56");
  }
 }
 function click(event){
  if(!motionOK())return;
  const interactive=event.target?.closest?.(".btn,.round-button,.team-picker,.nav button,.channel,.filter,.team-choice");
  if(interactive&&root.contains(interactive)){
   interactive.classList.remove("tap-ripple");
   // Restart only the tapped control's animation, never the entire view.
   void interactive.offsetWidth;
   interactive.classList.add("tap-ripple");
   window.setTimeout(()=>interactive.classList.remove("tap-ripple"),560);
  }
  const orb=event.target?.closest?.("[data-orbit-pulse]");
  if(orb&&root.contains(orb)){
   orb.classList.remove("orbit-pulse");
   void orb.offsetWidth;
   orb.classList.add("orbit-pulse");
   window.setTimeout(()=>orb.classList.remove("orbit-pulse"),900);
  }
 }
 root.addEventListener("pointermove",move,{passive:true});
 root.addEventListener("pointerleave",leave,{passive:true});
 root.addEventListener("click",click);
 return ()=>{
  root.removeEventListener("pointermove",move);
  root.removeEventListener("pointerleave",leave);
  root.removeEventListener("click",click);
  leave();
 };
}
export function celebrateTask(root,id,checklist=false){
 if(!root||!id||typeof window==="undefined"||typeof window.matchMedia!=="function"||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 const attr=checklist?"checklistToggle":"toggle";
 const buttons=root.querySelectorAll?.(checklist?"[data-checklist-toggle]":"[data-toggle]")||[];
 for(const button of buttons){
  if(button.dataset?.[attr]!==String(id)||!button.classList.contains("done"))continue;
  button.classList.remove("just-completed");
  void button.offsetWidth;
  button.classList.add("just-completed");
  window.setTimeout(()=>button.classList.remove("just-completed"),1150);
 }
}
