// Offline-only repro against the assigned frozen source; never calls a provider.
import { readFileSync } from 'node:fs';
import { Engine } from '/private/tmp/paypal-judging-20261008-harambee-0ce5ebe/server/domain.mjs';
import { proposeRevisions } from '/private/tmp/paypal-judging-20261008-harambee-0ce5ebe/server/revision-options.mjs';
const recorded=JSON.parse(readFileSync('/private/tmp/paypal-judging-20261008-harambee-0ce5ebe/eval/demo-chat-live-runs.json'));
let disk;
const engine=new Engine({load:()=>structuredClone(disk),save:s=>{disk=structuredClone(s)}});
for(const p of engine.active) engine.approve(p.id,1);
engine.withdraw('organizer','sam');
const budgetsBefore=engine.active.map(p=>p.budget);
process.env.OPENAI_API_KEY='offline-fixture-no-credentials';
globalThis.fetch=async()=>({ok:true,json:async()=>({status:'completed',model:'offline-recorded-summary-fixture',output:[{content:[{type:'output_text',text:JSON.stringify({summary:recorded.results[0].summary,options:[],clarifications:[]})}]}]})});
const out=await proposeRevisions(engine,{notes:recorded.chat.join('\n')});
console.log(JSON.stringify({method:'Injected the publicly recorded summary into a fully mocked model response, not a new live-model run',acceptedUnchanged:out.summary===recorded.results[0].summary,summary:out.summary,budgetsUnchanged:JSON.stringify(budgetsBefore)===JSON.stringify(engine.active.map(p=>p.budget)),options:out.options.map(o=>({listingId:o.listingId,shares:o.rows.map(r=>r.share),ready:o.ready}))},null,2));
