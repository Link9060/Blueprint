import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const css=readFileSync(new URL("../site/styles.css",import.meta.url),"utf8");
const app=readFileSync(new URL("../site/app.js",import.meta.url),"utf8");

test("overview alternates cards across both columns to avoid empty half-page",()=>{
 const section=app.slice(app.indexOf("function renderOverview(){"),app.indexOf("function renderTasks(){"));
 assert.match(section,/class="overview-grid"/);
 assert.doesNotMatch(section,/class="columns"/);
 assert.match(css,/\.overview-grid\{display:grid;grid-template-columns:/);
 const order=section.indexOf("'+priorities+season+activity+calendar+teamNotices+digest+");
 assert.ok(order>=0,"All six overview cards must be laid out as balanced rows");
});

test("sidebar and main have independent scroll containers",()=>{
 assert.match(css,/\.shell\{height:100dvh;min-height:0;overflow:hidden\}/);
 assert.match(css,/\.side\{height:100dvh;position:relative;top:auto;overflow-y:auto/);
 assert.match(css,/\.main\{height:100dvh;min-height:0;overflow-y:auto/);
 assert.match(css,/@media\(max-width:800px\)\{\.side\{position:fixed;top:0;left:0\}\}/);
});

test("MONO style loads after structural CSS and covers core workspace surfaces",()=>{
 const page=readFileSync(new URL("../site/index.html",import.meta.url),"utf8");
 const mono=readFileSync(new URL("../site/mono-theme.css",import.meta.url),"utf8");
 assert.match(page,/<link rel="stylesheet" href="\.\/styles\.css">\s*<link rel="stylesheet" href="\.\/mono-theme\.css">/);
 assert.match(mono,/--mono-ink:\s*#191b1a/);
 assert.match(mono,/--mono-paper:\s*#eae9e4/);
 for(const selector of [".side {",".nav button.active {",".bar {",".card, .modal",
   ".page-heading h1 {",".landing h1 {",".btn.primary {",".channel.active {",
   ".role-switch {",".profile-swatch {",".modal-cover {"]){
  assert.ok(mono.includes(selector),`MONO rule is missing: ${selector}`);
 }
 assert.match(mono,/@media\s*\(max-width:\s*560px\)/);
 assert.match(mono,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
