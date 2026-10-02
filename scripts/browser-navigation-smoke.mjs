// Read-only browser regression for audience switches, mobile navigation and login rendering.
// Uses the Chrome installation provided by the GitHub ubuntu-24.04 runner; no browser package needed.
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const base = process.env.LIVE_BASE_URL || process.env.RUNTIME_BASE_URL || "http://127.0.0.1:3000";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const profile = await mkdtemp(path.join(tmpdir(), "tarifwerk-ui-"));
const chrome = spawn("google-chrome", ["--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--no-zygote", "--remote-debugging-port=9222", "--user-data-dir=" + profile, "about:blank"], {stdio:["ignore","ignore","pipe"]});
let chromeError = ""; chrome.stderr.on("data",chunk=>{chromeError=(chromeError+chunk.toString()).slice(-4000);});
let socket;
const pending = new Map();
const issues = [];
let sequence = 0;
let activePage = "startup";
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => {pending.delete(id); reject(new Error("CDP timeout: " + method));}, 15000);
    pending.set(id, {resolve, reject, timer});
    socket.send(JSON.stringify({id, method, params}));
  });
}
async function evaluate(expression) {
  const r = await call("Runtime.evaluate", {expression, returnByValue:true, awaitPromise:true});
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result?.value;
}
async function waitFor(expression) {
  for (let i=0;i<80;i++) {
    try { if (await evaluate(expression)) return; } catch {}
    await delay(150);
  }
  throw new Error("UI wait failed: " + expression);
}
async function navigate(route) {
  activePage=route;
  const result=await call("Page.navigate", {url:base+route});
  if (result.errorText) throw new Error(result.errorText);
  await waitFor("document.readyState === 'complete' && location.href.startsWith(" + JSON.stringify(base+route) + ")");
  await delay(1000);
}
const snapshot = `JSON.stringify({path:location.pathname+location.search,h1:document.querySelector('h1')?.innerText||null,main:!!document.querySelector('main'),footerAudiences:[...new Set([...document.querySelectorAll('footer a[href]')].map(a=>new URL(a.href).searchParams.get('audience')).filter(Boolean))],chatLabel:[...document.querySelectorAll('button')].filter(b=>/KI|Chat/.test(b.textContent)).map(b=>b.textContent.trim()).slice(0,3)})`;
try {
  let target;
  for (let i=0;i<50;i++) {
    try {target=(await (await fetch("http://127.0.0.1:9222/json/list")).json()).find(t=>t.type==="page"); if(target)break;} catch {}
    await delay(200);
  }
  if(!target) throw new Error("Chrome did not start: " + chromeError);
  socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
  socket.addEventListener("message",event=>{
    const r=JSON.parse(event.data);
    if(r.id && pending.has(r.id)) {
      const p=pending.get(r.id); clearTimeout(p.timer);pending.delete(r.id);
      if(r.error)p.reject(new Error(r.error.message));else p.resolve(r.result);
    } else if(r.method==="Runtime.exceptionThrown") {
      issues.push({page:activePage,type:"exception",message:r.params.exceptionDetails.exception?.description||r.params.exceptionDetails.text});
    } else if(r.method==="Runtime.consoleAPICalled" && r.params.type==="error") {
      issues.push({page:activePage,type:"console",message:r.params.args.map(a=>a.value||a.description||"").join(" ").slice(0,700)});
    } else if(r.method==="Network.responseReceived" && r.params.response.status>=400 && r.params.response.url.startsWith(base)) {
      issues.push({page:activePage,type:"http",url:r.params.response.url,status:r.params.response.status});
    }
  });
  await call("Page.enable"); await call("Runtime.enable"); await call("Network.enable");
  await call("Emulation.setDeviceMetricsOverride",{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await navigate("/?audience=b2c");
  console.log("initial", await evaluate(snapshot));
  const initialHeading=await evaluate("document.querySelector('h1')?.innerText");
  await evaluate("[...document.querySelectorAll('header a')].find(a=>a.textContent.trim()==='Business').click()");
  await waitFor("document.readyState === 'complete' && !!document.querySelector('h1') && location.search.includes('audience=b2b') && document.querySelector('h1').innerText !== "+JSON.stringify(initialHeading));
  await delay(800);
  console.log("business_click", await evaluate(snapshot));
  await waitFor("!!document.querySelector('footer a[href]')");
  const staleFooter=await evaluate("[...document.querySelectorAll('footer a[href]')].some(a=>new URL(a.href).searchParams.get('audience')==='b2c')");
  if(staleFooter)issues.push({page:"business click",type:"audience",message:"Footer still routes to b2c after switching to Business"});
  await evaluate("[...document.querySelectorAll('header a')].find(a=>a.textContent.trim()==='Privat').click()");
  await waitFor("location.search.includes('audience=b2c') && document.querySelector('h1')?.innerText === "+JSON.stringify(initialHeading));
  console.log("private_click",await evaluate(snapshot));
  await call("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate("document.querySelector('button[aria-controls=mobile-menu]').click()");
  await waitFor("!!document.querySelector('#mobile-menu')");
  console.log("mobile_menu",{opened:true});
  await evaluate("[...document.querySelectorAll('#mobile-menu nav a')].find(a=>a.textContent.includes('Leistungen')).click()");
  await waitFor("location.pathname==='/leistungen' && !document.querySelector('#mobile-menu')");
  await delay(500);
  console.log("mobile_navigation",await evaluate(snapshot));
  for(const route of ["/anfrage","/berater","/portal/login"]) {
    await navigate(route);console.log("page",await evaluate(snapshot));
  }
  const login=await evaluate("({email:!!document.querySelector('input[type=email]'),password:!!document.querySelector('input[type=password]'),submit:!!document.querySelector('button[type=submit]')})");
  if(!login.email||!login.password||!login.submit)throw new Error("Login controls missing");
  console.log("login_controls",login);
  console.log("browser_result",JSON.stringify({ok:issues.length===0,issues},null,2));
  if(issues.length)process.exitCode=1;
} catch(error) {
  console.error("browser_failure",error.message,JSON.stringify(issues));process.exitCode=1;
} finally {
  for(const p of pending.values())clearTimeout(p.timer);
  if(socket)socket.close();
  chrome.kill("SIGTERM");
  await delay(500);
  await rm(profile,{recursive:true,force:true,maxRetries:3}).catch(()=>{});
}
