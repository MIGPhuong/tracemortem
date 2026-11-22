/** TraceMortem forensic engine — deterministic, inspectable, dependency-free. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_EVENTS = 8000;
const errorPattern = /\b(error|fatal|exception|failed|failure|timeout|rejected|unavailable|http\s*5\d\d|http\s*401|http\s*403)\b/i;
const infoPattern = /\b(trace|debug|info|notice|success|ok|healthy)\b/i;
const categories = [
  ['change', /deploy|release|rollout|config(?:uration)? (?:update|change|applied|restored)|rotation|schema (?:change|v\d|registered)|feature.flag|migration/i],
  ['pressure', /pool exhausted|pool usage|connection wait|queue (?:increased|length)|backlog|saturat|out of memory|resource limit|high latency/i],
  ['auth', /jwt|signature|jwks|signing.key|unknown kid|token verif|key.mismatch|http 401|unauthorized/i],
  ['schema', /schema.mismatch|schema validation|validation.error|dead.letter|\bDLQ\b|record rejected/i],
  ['timeout', /timed?out|timeout|deadline|latency|http 50[234]|\b503\b/i],
  ['recovery', /recovered|recovery|restored|rollback|back to|returned to baseline|normalized|healthy|rate normal|latency back|replay scheduled/i]
];
const severityRank={fatal:5,critical:5,error:4,warn:3,warning:3,info:2,debug:1,trace:1};
function asText(value, limit=3000){ return String(value ?? '').slice(0,limit).trim(); }
function parseTimestamp(value){
  if(value instanceof Date) return value.getTime();
  if(typeof value==='number' && Number.isFinite(value)) return value < 1e11? value*1000:value;
  if(typeof value==='string' && /^\d{10,13}$/.test(value)) return parseTimestamp(Number(value));
  const ms=Date.parse(String(value ?? ''));
  return Number.isFinite(ms)?ms:NaN;
}
export function classify(message,code=''){
  const text=String(code||'')+' '+String(message||'');
  const found=categories.find(([,pattern])=>pattern.test(text));
  return found?.[0] ?? 'other';
}
export function normalizeEvent(raw, index=0){
  if(!raw || typeof raw!=='object' || Array.isArray(raw)) throw new Error(`Row ${index+1}: expected an object.`);
  const time=parseTimestamp(raw.timestamp ?? raw.time ?? raw.ts ?? raw.datetime ?? raw.date);
  if(!Number.isFinite(time)) throw new Error(`Row ${index+1}: missing or invalid timestamp.`);
  const message=asText(raw.message ?? raw.msg ?? raw.event ?? raw.description ?? raw.text);
  if(!message) throw new Error(`Row ${index+1}: missing message.`);
  const levelCandidate=asText(raw.level ?? raw.severity ?? raw.log_level).toLowerCase();
  let level=levelCandidate in severityRank ? levelCandidate : (errorPattern.test(message)?'error': infoPattern.test(message)?'info':'warn');
  if(level==='warning')level='warn';
  if(level==='fatal'||level==='critical')level='error';
  const latencyValue=raw.latencyMs ?? raw.latency_ms ?? raw.duration_ms ?? raw.duration;
  const latency=latencyValue===undefined||latencyValue===null||latencyValue===''?null:Number(latencyValue);
  return {
    id:`E${String(index+1).padStart(4,'0')}`,timestamp:new Date(time).toISOString(),ms:time,
    service:asText(raw.service ?? raw.component ?? raw.app ?? raw.application ?? 'unknown-service',70)||'unknown-service',
    level,message,traceId:asText(raw.traceId ?? raw.trace_id ?? raw.request_id ?? raw.requestId ?? '',100),
    code:asText(raw.code ?? raw.error_code ?? raw.status_code ?? '',80),
    latencyMs:Number.isFinite(latency)?Math.max(0,latency):null,
    category: classify(message,raw.code ?? raw.error_code ?? '')
  };
}
export function normalizeEvents(rows){
  if(!Array.isArray(rows))throw new Error('Expected an array of log events.');
  if(!rows.length)throw new Error('No events found.');
  if(rows.length>MAX_EVENTS)throw new Error(`Too many events: limit is ${MAX_EVENTS}.`);
  const result=rows.map((row,i)=>normalizeEvent(row,i));
  result.sort((a,b)=>a.ms-b.ms || a.id.localeCompare(b.id));
  return result;
}
export function parseCSV(text){
  const rows=[];let cell='',row=[],inQuotes=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){
      if(inQuotes && text[i+1]==='"'){cell+='"';i++;}else inQuotes=!inQuotes;
    } else if(c===','&&!inQuotes){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!inQuotes){
      if(c==='\r'&&text[i+1]==='\n')i++;
      row.push(cell);cell='';if(row.some(x=>x.trim()))rows.push(row);row=[];
    }else cell+=c;
  }
  if(inQuotes)throw new Error('Unclosed quoted field in CSV.');
  row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
  if(rows.length<2)throw new Error('CSV needs a header and at least one row.');
  const header=rows.shift().map(c=>c.trim());
  if(new Set(header).size!==header.length)throw new Error('CSV header contains duplicate columns.');
  return rows.map((record,idx)=>{
    if(record.length!==header.length)throw new Error(`CSV row ${idx+2}: expected ${header.length} columns.`);
    return Object.fromEntries(header.map((col,j)=>[col,record[j]]));
  });
}
function parsePlain(text){
  const rows=[];
  for(const line of text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)){
    const match=/^\[?(\d{4}-\d\d-\d\d[T ]\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:?\d\d)?)\]?\s+(?:\[)?(ERROR|WARN|WARNING|INFO|DEBUG|FATAL|CRITICAL)(?:\])?\s+(\S+)\s+(.+)$/i.exec(line);
    if(!match)throw new Error('Unsupported plain-text log format. Use: 2026-11-20T09:00:00Z ERROR service message');
    rows.push({timestamp:match[1],level:match[2],service:match[3],message:match[4]});
  }
  return rows;
}
export function parseLogText(text, filename='import.jsonl'){
  if(typeof text!=='string'||!text.trim())throw new Error('The file is empty.');
  if(new TextEncoder().encode(text).length>MAX_FILE_BYTES)throw new Error('File too large. Limit: 5 MB.');
  const clean=text.replace(/^\uFEFF/,'').trim();
  let rows;
  const ext=filename.split('.').pop()?.toLowerCase();
  try {
    if(ext==='csv')rows=parseCSV(clean);
    else if(clean.startsWith('['))rows=JSON.parse(clean);
    else if(clean.startsWith('{') && clean.split(/\r?\n/).length===1){
      const obj=JSON.parse(clean); rows=Array.isArray(obj.events)?obj.events:[obj];
    } else if(ext==='txt'||ext==='log') rows=parsePlain(clean);
    else rows=clean.split(/\r?\n/).filter(Boolean).map((line,i)=>{
      try{return JSON.parse(line);}catch{throw new Error(`Invalid JSON on line ${i+1}.`);}
    });
  }catch(e){if(e instanceof SyntaxError)throw new Error('Malformed JSON. Upload JSON, JSONL, CSV or supported plain-text logs.');throw e;}
  return normalizeEvents(rows);
}
export function metrics(events){
 const errors=events.filter(e=>e.level==='error');const warnings=events.filter(e=>e.level==='warn');
 const services=[...new Set(events.map(e=>e.service))];
 const durations=events.map(e=>e.latencyMs).filter(n=>typeof n==='number').sort((a,b)=>a-b);
 return {total:events.length,errors:errors.length,warnings:warnings.length,services:services.length,serviceNames:services,
  errorRate:events.length?Math.round(errors.length/events.length*100):0,
  p95:durations.length?durations[Math.ceil(durations.length*.95)-1]:null,
  traces:new Set(events.map(e=>e.traceId).filter(Boolean)).size,
  firstError:errors[0]??null,
  start:events[0]?.ms??null,end:events.at(-1)?.ms??null};
}
export function activity(events,bins=20){
 if(!events.length)return [];
 const start=events[0].ms,stop=events.at(-1).ms,span=Math.max(60000,stop-start),width=span/bins;
 return Array.from({length:bins},(_,i)=>{
  const from=start+i*width, to=i===bins-1?stop+1:start+(i+1)*width;
  const current=events.filter(e=>e.ms>=from&&e.ms<to);
  return {start:from,end:to,total:current.length,errors:current.filter(e=>e.level==='error').length,warnings:current.filter(e=>e.level==='warn').length};
 });
}
export function traces(events){
 const grouped=new Map();
 for(const e of events){if(!e.traceId)continue;if(!grouped.has(e.traceId))grouped.set(e.traceId,[]);grouped.get(e.traceId).push(e);}
 const edges=new Map();
 for(const chain of grouped.values()){
  const services=[...new Set(chain.map(e=>e.service))];
  for(let i=0;i<services.length;i++)for(let j=i+1;j<services.length;j++){
    const pair=[services[i],services[j]].sort(); const key=pair.join(' / ');
    if(!edges.has(key))edges.set(key,{source:pair[0],target:pair[1],sharedTraces:0});
    edges.get(key).sharedTraces++;
  }
 }
 return [...edges.values()].sort((a,b)=>b.sharedTraces-a.sharedTraces);
}
const hypothesisRules=[
 {key:'change',title:'Release or configuration regression',summary:'A software or configuration change precedes the failure window.',categories:['change'],keywords:/deploy|config|rollout|release|rotation|migration|schema/i,next:'Compare the change diff and feature flags. Reproduce with and without the change.'},
 {key:'pressure',title:'Resource saturation',summary:'Capacity warnings and failures appear together.',categories:['pressure'],keywords:/pool|saturat|queue|backlog|resource/i,next:'Inspect resource utilization, queue depth, and connection limits across the same time window.'},
 {key:'auth',title:'Authentication key mismatch',summary:'Signature/key symptoms overlap with denied requests.',categories:['auth'],keywords:/jwt|key|signature|jwks|401/i,next:'Verify signing key IDs, issuer metadata, and key cache refresh timing.'},
 {key:'schema',title:'Schema compatibility break',summary:'Validation failures track schema changes or dead-letter growth.',categories:['schema'],keywords:/schema|validation|DLQ|dead.letter/i,next:'Diff producer and consumer schemas and replay representative records in a safe environment.'},
 {key:'timeout',title:'Downstream timeout propagation',summary:'Timeouts and elevated latency cluster near request failures.',categories:['timeout'],keywords:/timeout|503|latency|deadline/i,next:'Inspect trace spans and service dependency timeouts before changing retries.'}
];
export function hypotheses(events){
 const firstError=events.find(e=>e.level==='error');const stop=firstError?.ms??events[0]?.ms;
 const signals=[];
 for(const rule of hypothesisRules){
  const matched=events.filter(e=>rule.categories.includes(e.category)||rule.keywords.test(e.message+' '+e.code));
  const before=matched.filter(e=>e.ms<=stop && e.ms>=stop-10*60000);
  const relatedErrors=matched.filter(e=>e.level==='error');
  if(!matched.length)continue;
  // A transparent evidence score — NOT a probability, root-cause certainty, or ML prediction.
  const signalCount=matched.length+before.length*2+relatedErrors.length*2;
  signals.push({...rule,score:signalCount,evidenceIds:matched.slice(0,7).map(e=>e.id),beforeFailure:before.length,matching:matched.length,
    explanation:`${matched.length} matching event${matched.length===1?'':'s'}, ${before.length} near or before first error; ${relatedErrors.length} at ERROR level.`});
 }
 return signals.sort((a,b)=>b.score-a.score || a.title.localeCompare(b.title));
}
function readable(ms){return new Date(ms).toISOString().replace('T',' ').slice(0,19)+'Z';}
export function buildReport({title,events,source='Uploaded / sample data'}){
 const m=metrics(events),h=hypotheses(events),ed=traces(events);const lines=[
 '# TraceMortem — Incident Investigation', '',`**Case:** ${title}`,`**Evidence source:** ${source}`,
 '**Analysis:** deterministic heuristics; hypotheses are not root-cause confirmation.',
 `**Coverage:** ${m.total} events · ${m.services} services · ${m.errors} errors · ${m.warnings} warnings`,
 `**Window (UTC):** ${m.start===null?'n/a':readable(m.start)} — ${m.end===null?'n/a':readable(m.end)}`,
 '', '## Key observations', '',`- First ERROR: ${m.firstError ? `${readable(m.firstError.ms)} · ${m.firstError.service} · ${m.firstError.id}` : 'None detected'}`,
 `- Errors in sample: ${m.errorRate}% (not production error rate)`,
 `- Shared trace links: ${ed.length}`, '', '## Ranked investigative leads', ''
 ];
 for(const [i,x] of h.entries()) lines.push(`### ${i+1}. ${x.title}`,x.summary,`- Evidence signal score (not probability): ${x.score}`,`- Supporting events: ${x.evidenceIds.join(', ')}`,`- Rationale: ${x.explanation}`,`- Next validation: ${x.next}`,'');
 if(!h.length)lines.push('No matching investigative leads. Review raw evidence.','');
 lines.push('## Raw evidence excerpt','','| ID | UTC | Service | Level | Evidence |','|---|---|---|---|---|');
 for(const e of events.slice(0,100)) lines.push(`| ${e.id} | ${readable(e.ms)} | ${e.service.replaceAll('|','\\|')} | ${e.level} | ${e.message.replace(/\r?\n/g,' ').replaceAll('|','\\|')} |`);
 lines.push('','## Methodology and limitations','','- Data is processed locally in the browser; no incident logs are sent to a backend by this app.','- Graph edges are shared trace IDs, not causal proof.','- Rankings are transparent heuristic signals and can be misleading. Validate against metrics, code changes, and operator knowledge.','- Imported logs may contain secrets. Handle exports carefully.','');
 return lines.join('\n');
}
