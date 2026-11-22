import {CASES} from './samples.js';
import {normalizeEvents,parseLogText,metrics,hypotheses,activity,traces,buildReport,MAX_FILE_BYTES} from './engine.js';

const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=s=>new Date(s).toISOString().slice(11,19);
const shortTime=s=>new Date(s).toISOString().slice(11,16);
const dateTime=s=>new Date(s).toISOString().replace('T',' ').slice(0,19)+' UTC';
const number=n=>new Intl.NumberFormat('en-US').format(n);
const state={view:'overview',case:CASES[0],events:normalizeEvents(CASES[0].events),search:'',level:'all',service:'all',bucket:null,selected:null};
let toastTimeout;
function toast(message,error=false){const box=$('#toast');box.textContent=message;box.classList.toggle('error',error);box.hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>box.hidden=true,3800);}
function setupEvents(){
  $$('#brand-home').forEach(b=>b.addEventListener('click',event=>{event.preventDefault();navigate('overview')}));
  $$('[data-nav]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.nav)));
  $$('[data-go]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.go)));
  $('#import-sidebar').addEventListener('click',()=>$('#upload-file').click());
  $('#load-log').addEventListener('click',()=>$('#upload-file').click());
  $('#upload-file').addEventListener('change',async event=>{const file=event.target.files?.[0];if(file)await importFile(file);event.target.value='';});
  document.addEventListener('dragover',event=>{event.preventDefault()});
  document.addEventListener('drop',async event=>{event.preventDefault();const file=event.dataTransfer?.files?.[0];if(file)await importFile(file)});
  $('#evidence-search').addEventListener('input',e=>{state.search=e.target.value;renderEvidence()});
  $('#service-filter').addEventListener('change',e=>{state.service=e.target.value;renderEvidence()});
  $('#level-filter').addEventListener('change',e=>{state.level=e.target.value;renderEvidence()});
  $('#clear-filters').addEventListener('click',()=>{state.search='';state.level='all';state.service='all';state.bucket=null;syncFilters();renderEvidence();renderCharts();});
  $('#reset-chart').addEventListener('click',()=>{state.bucket=null;renderCharts();renderEvidence()});
  $('#export-report').addEventListener('click',downloadReport);
  $('#report-download').addEventListener('click',downloadReport);
  $('#evidence-download').addEventListener('click',downloadReport);
  $('#close-event').addEventListener('click',()=>$('#event-dialog').close());
  $('#dialog-close-footer').addEventListener('click',()=>$('#event-dialog').close());
  $('#event-dialog').addEventListener('click',e=>{if(e.target===$('#event-dialog'))$('#event-dialog').close()});
  $('#dialog-copy').addEventListener('click',async()=>{if(!state.selected)return;const raw=JSON.stringify(state.selected,null,2);try{await navigator.clipboard.writeText(raw);toast('Evidence copied to clipboard.')}catch{toast('Clipboard is unavailable. Select the event text manually.',true)}});
  $('#see-first-error').addEventListener('click',()=>{const first=metrics(state.events).firstError;if(first){navigate('evidence');openEvent(first.id)}});
}
function navigate(view){if(!['overview','timeline','evidence','report'].includes(view))return;state.view=view;$$('[data-nav]').forEach(el=>el.classList.toggle('active',el.dataset.nav===view));$$('[data-panel]').forEach(el=>el.classList.toggle('is-active',el.dataset.panel===view));if(view==='evidence')renderEvidence();if(view==='timeline')renderTimeline();if(view==='report')renderReport();window.scrollTo({top:0,behavior:'smooth'});}
function setCase(data,isImported=false){
 state.case=data;state.events=isImported?data.events:normalizeEvents(data.events);state.search='';state.level='all';state.service='all';state.bucket=null;state.selected=null;syncFilters();
 renderAll();navigate('overview');toast(isImported?`${state.events.length} events analyzed locally.`:`Loaded ${data.idLabel} — ${data.dataset.toLowerCase()}.`);
}
function renderCases(){
 const list=$('#case-list');list.replaceChildren();
 for(const data of CASES){const btn=document.createElement('button');btn.className='case-button'+(state.case.id===data.id?' active':'');btn.type='button';btn.innerHTML=`<span class="case-icon">${escapeHtml(data.code.slice(-2))}</span><span class="case-info"><strong>${escapeHtml(data.label)}</strong><small>${escapeHtml(data.idLabel)} · ${escapeHtml(data.industry)}</small></span><span class="case-arrow">↗</span>`;btn.addEventListener('click',()=>setCase(data));list.append(btn);}
 if(state.case.id==='imported'){
  const data=state.case,btn=document.createElement('button');btn.className='case-button active';btn.type='button';btn.innerHTML=`<span class="case-icon">↥</span><span class="case-info"><strong>${escapeHtml(data.label)}</strong><small>LOCAL IMPORT · ${state.events.length} EVENTS</small></span>`;btn.addEventListener('click',()=>navigate('overview'));list.prepend(btn);
 }
}
async function importFile(file){
 if(file.size>MAX_FILE_BYTES){toast('File exceeds 5 MB. Export a smaller incident window.',true);return;}
 if(!/\.(json|jsonl|csv|txt|log)$/i.test(file.name)){toast('Supported formats: JSON, JSONL, CSV, TXT, LOG.',true);return;}
 try{
  const text=await file.text();const events=parseLogText(text,file.name);
  const data={id:'imported',idLabel:'LOCAL-001',code:'LOCAL',industry:'USER IMPORT',name:'An incident from your own logs',label:file.name,summary:`${events.length} events from ${file.name} · analyzed in this browser`,color:'#9ff5be',dataset:'LOCAL IMPORT · NOT UPLOADED',events};
  setCase(data,true);
 }catch(error){toast(error instanceof Error?error.message:'Could not read the selected file.',true)}
}
function renderAll(){
 const c=state.case,m=metrics(state.events);
 $('#crumb-case').textContent=c.idLabel;$('#case-number').textContent=c.idLabel;$('#case-title').textContent=c.name;$('#case-subtitle').textContent=c.summary;$('#source-kind').textContent=c.dataset;
 $('#audit-evidence').textContent=`${m.total} EVENTS`;
 $('#audit-window').textContent=m.start===null?'UNKNOWN':`${shortTime(m.start)} — ${shortTime(m.end)} UTC`;
 $('#metric-total').textContent=number(m.total);$('#metric-error').textContent=number(m.errors);$('#metric-error-rate').textContent=m.errorRate+'%';$('#metric-services').textContent=number(m.services);$('#metric-p95').innerHTML=m.p95===null?'N/A':`${number(m.p95)}<span class="metric-unit">ms</span>`;
 $('#nav-events').textContent=number(m.total);renderCases();renderFilters();renderGraph();renderLeads();renderCharts();renderFirstError();renderEvidencePreview();renderEvidence();renderTimeline();renderReport();
}
function renderFilters(){
 const box=$('#service-filter');box.replaceChildren(new Option('All services','all'));
 for(const s of metrics(state.events).serviceNames.sort())box.add(new Option(s,s));
 syncFilters();
}
function syncFilters(){ $('#evidence-search').value=state.search;$('#level-filter').value=state.level;$('#service-filter').value=state.service; }
function renderGraph(){
 const root=$('#graph');root.replaceChildren();const services=metrics(state.events).serviceNames.slice(0,7),links=traces(state.events).filter(e=>services.includes(e.source)&&services.includes(e.target));
 const positions=new Map(services.map((s,i)=>[s,{x:225+160*Math.cos((i*2*Math.PI/services.length)-Math.PI/2),y:138+84*Math.sin((i*2*Math.PI/services.length)-Math.PI/2)}]));
 const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 450 270');svg.setAttribute('aria-label','Trace-ID service correlation graph');svg.setAttribute('role','img');
 const append=(parent,name,attrs={},value=null)=>{const el=document.createElementNS(ns,name);for(const [key,val]of Object.entries(attrs))el.setAttribute(key,String(val));if(value!==null)el.textContent=String(value);parent.append(el);return el};
 for(const link of links){const a=positions.get(link.source),b=positions.get(link.target);append(svg,'line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'graph-line'});append(svg,'text',{x:(a.x+b.x)/2,y:(a.y+b.y)/2-3,class:'graph-link-count','text-anchor':'middle'},link.sharedTraces+'×');}
 for(const name of services){const loc=positions.get(name),group=append(svg,'g',{class:'graph-node',tabindex:0,role:'button','aria-label':`Filter evidence by ${name}`});
 const hasError=state.events.some(e=>e.service===name&&e.level==='error');append(group,'rect',{x:loc.x-63,y:loc.y-18,width:126,height:37,rx:6,stroke:hasError?'#c87e72':'#4e645e'});append(group,'circle',{cx:loc.x-51,cy:loc.y,fill:hasError?'#f19b87':'#9ff5be',r:3});append(group,'text',{x:loc.x-42,y:loc.y+4},name.length>18?name.slice(0,16)+'…':name);
 const activate=()=>{state.service=name;$('#service-filter').value=name;navigate('evidence');renderEvidence()};group.addEventListener('click',activate);group.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();activate()}});
 }
 root.append(svg);
}
function renderLeads(){
 const list=$('#lead-list');list.replaceChildren();const leads=hypotheses(state.events).slice(0,3);
 if(!leads.length){list.innerHTML='<p class="empty-state">No matching evidence clusters. Inspect raw logs.</p>';return;}
 for(const [i,lead]of leads.entries()){
  const row=document.createElement('button');row.type='button';row.className='lead-item';row.innerHTML=`<span class="lead-rank">0${i+1}</span><span class="lead-text"><strong>${escapeHtml(lead.title)}</strong><small>${escapeHtml(lead.summary)}</small><small>${escapeHtml(lead.matching)} matching events · view evidence ↗</small></span><span class="lead-points">${lead.score} pts</span>`;
  row.addEventListener('click',()=>{state.search='';state.service='all';state.level='all';state.bucket=null;navigate('evidence');openEvent(lead.evidenceIds[0])});list.append(row);
 }
}
function chart(parentId,bins){
 const root=$(parentId);root.replaceChildren();const buckets=activity(state.events,bins),max=Math.max(1,...buckets.map(b=>b.total));
 for(const b of buckets){
  const btn=document.createElement('button');btn.type='button';btn.className='activity-bar'+(state.bucket?.start===b.start?' active':'');btn.title=`${time(b.start)} · ${b.total} events (${b.errors} errors)`;btn.setAttribute('aria-label',btn.title);
  const height=(b.total/max)*100;const other=document.createElement('span'),err=document.createElement('span');other.className='bar-other';err.className='bar-error';other.style.height=`${height*(b.total-b.errors)/Math.max(1,b.total)}%`;err.style.height=`${height*b.errors/Math.max(1,b.total)}%`;
  btn.append(err,other);btn.addEventListener('click',()=>{state.bucket=state.bucket?.start===b.start?null:b;renderCharts();renderEvidence();navigate('evidence')});root.append(btn);
 }
}
function renderCharts(){const m=metrics(state.events);chart('#activity-chart',20);chart('#timeline-chart',32);
 for(const id of ['#chart-start','#timeline-start'])$(id).textContent=shortTime(m.start);
 for(const id of ['#chart-end','#timeline-end'])$(id).textContent=shortTime(m.end);
 $('#reset-chart').hidden=!state.bucket;
}
function renderFirstError(){const root=$('#first-error');const first=metrics(state.events).firstError;
 if(!first){root.innerHTML='<p>No ERROR-level event appears in this sample.</p>';$('#see-first-error').disabled=true;return}
 $('#see-first-error').disabled=false;
 root.innerHTML=`<div class="first-error-when">${escapeHtml(dateTime(first.ms))} · ${escapeHtml(first.id)}</div><div class="first-error-message">${escapeHtml(first.message)}</div><div class="first-error-source">${escapeHtml(first.service)} &nbsp; · &nbsp; ${escapeHtml(first.code||'UNCLASSIFIED')}</div>`;
}
function renderEvidencePreview(){const body=$('#evidence-preview-body');body.replaceChildren();for(const event of state.events.filter(e=>e.level==='error').slice(0,5))body.append(makeRow(event));if(!body.children.length)for(const e of state.events.slice(0,4))body.append(makeRow(e));}
function makeRow(event){const tr=document.createElement('tr');tr.tabIndex=0;tr.setAttribute('aria-label',`Inspect event ${event.id}`);
 tr.innerHTML=`<td>${escapeHtml(event.id)}</td><td>${escapeHtml(time(event.ms))}</td><td>${escapeHtml(event.service)}</td><td><span class="level-pill ${escapeHtml(event.level)}">${escapeHtml(event.level.toUpperCase())}</span></td><td title="${escapeHtml(event.message)}">${escapeHtml(event.message)}</td><td class="table-arrow">↗</td>`;
 tr.addEventListener('click',()=>openEvent(event.id));tr.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();openEvent(event.id)}});return tr;
}
function filteredEvents(){const needle=state.search.trim().toLowerCase();return state.events.filter(e=>{
  if(state.level!=='all'&&e.level!==state.level)return false;
  if(state.service!=='all'&&e.service!==state.service)return false;
  if(state.bucket&&(e.ms<state.bucket.start||e.ms>=state.bucket.end))return false;
  return !needle||[e.id,e.service,e.message,e.traceId,e.code,e.level].some(s=>String(s).toLowerCase().includes(needle));
 });}
function renderEvidence(){const rows=filteredEvents();const body=$('#evidence-body');body.replaceChildren();for(const e of rows)body.append(makeRow(e));$('#empty-evidence').hidden=rows.length>0;$('#filter-result').textContent=`${rows.length} of ${state.events.length} events · click to inspect`;
 $('#filter-window').textContent=state.bucket?`Selected: ${time(state.bucket.start)}–${time(state.bucket.end)} · Reset filters to clear`:'Showing full investigation window';
}
function renderTimeline(){const root=$('#timeline-feed');root.replaceChildren();for(const event of state.events){const b=document.createElement('article');b.className='timeline-entry '+event.level;b.innerHTML=`<span class="timeline-time">${escapeHtml(time(event.ms))}</span><span class="timeline-dot"></span><div class="timeline-content"><strong>${escapeHtml(event.service)}</strong><p>${escapeHtml(event.message)}</p><small>${escapeHtml(event.id)} · ${escapeHtml(event.level.toUpperCase())} · ${escapeHtml(event.code||event.category.toUpperCase())}</small></div>`;b.addEventListener('click',()=>openEvent(event.id));b.tabIndex=0;b.setAttribute('role','button');b.setAttribute('aria-label',`Inspect ${event.id}`);b.addEventListener('keydown',ev=>{if(ev.key==='Enter')openEvent(event.id)});root.append(b)}}
function renderReport(){const root=$('#report-document'),m=metrics(state.events),leads=hypotheses(state.events);const caseName=escapeHtml(state.case.name),source=escapeHtml(state.case.dataset);
 root.innerHTML=`<div class="section-overline">TRACE MORTEM / INCIDENT BRIEF / ${escapeHtml(state.case.idLabel)}</div><h3>${caseName}</h3><p>Reproducible analysis generated from ${source}. Findings are evidence signals, not a certified diagnosis.</p>
 <div class="report-meta"><span>EVENTS &nbsp; ${m.total}</span><span>ERRORS &nbsp; ${m.errors}</span><span>SERVICES &nbsp; ${m.services}</span><span>TRACES &nbsp; ${m.traces}</span></div>
 <h4>01 / Initial observation</h4><p>${m.firstError?`The earliest ERROR event was recorded at <strong>${escapeHtml(dateTime(m.firstError.ms))}</strong> by ${escapeHtml(m.firstError.service)} (${escapeHtml(m.firstError.id)}).`:'No ERROR event was identified in the submitted evidence.'}</p>
 <h4>02 / Investigative leads</h4><ol>${leads.length?leads.map(x=>`<li><strong>${escapeHtml(x.title)}</strong> — ${escapeHtml(x.summary)}<br/><span class="report-source">SCORE ${x.score} · EVIDENCE ${escapeHtml(x.evidenceIds.join(', '))}</span><br/><span class="report-source">VERIFY: ${escapeHtml(x.next)}</span></li>`).join(''):'<li>No matching lead found. Inspect raw evidence.</li>'}</ol>
 <h4>03 / Provenance</h4><p>${m.total} events from ${m.services} services, covering ${escapeHtml(dateTime(m.start))} through ${escapeHtml(dateTime(m.end))}. All data was processed in the browser.</p>
 <div class="report-disclaimer">This case file is a starting point for a human investigator. Correlations, pattern matches and rankings do not establish root cause. No source logs are sent to a server by TraceMortem.</div>`;
}
function openEvent(id){const e=state.events.find(r=>r.id===id);if(!e)return;state.selected=e;$('#dialog-event-id').textContent=`${e.id} / ${e.service}`;
 $('#dialog-event-body').innerHTML=`<div class="event-detail"><div><label>UTC TIMESTAMP</label><strong>${escapeHtml(dateTime(e.ms))}</strong></div><div><label>SEVERITY</label><strong>${escapeHtml(e.level.toUpperCase())}</strong></div><div><label>TRACE ID</label><strong>${escapeHtml(e.traceId||'NOT PROVIDED')}</strong></div><div><label>CODE</label><strong>${escapeHtml(e.code||'NOT PROVIDED')}</strong></div><div><label>CLASSIFICATION</label><strong>${escapeHtml(e.category.toUpperCase())}</strong></div><div><label>LATENCY</label><strong>${e.latencyMs===null?'NOT PROVIDED':number(e.latencyMs)+' ms'}</strong></div><div class="event-message">${escapeHtml(e.message)}</div></div>`;
 $('#event-dialog').showModal();
}
function downloadReport(){const result=buildReport({title:state.case.name,events:state.events,source:state.case.dataset});const blob=new Blob([result],{type:'text/markdown; charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`tracemortem-${state.case.idLabel.toLowerCase()}-report.md`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Report exported as a local Markdown file.')}
function init(){setupEvents();$('#clock').textContent=new Date().toISOString().slice(11,16)+' UTC';setInterval(()=>$('#clock').textContent=new Date().toISOString().slice(11,16)+' UTC',60000);renderAll();}
init();
