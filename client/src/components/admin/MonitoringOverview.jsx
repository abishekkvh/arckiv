import {useAdminData, pct, time, date} from './adminData';
import {LoadState, Cards, Bars, Empty} from './AdminUI';
export default function MonitoringOverview({user,revision,healthOnly=false}){
 const state=useAdminData('/api/admin/analytics',user,revision),d=state.data;
 const rows=items=>(items||[]).map(i=>({label:String(i._id??'Unknown'),value:i.count}));
 return <div className="space-y-5"><h2 className="text-2xl font-bold">{healthOnly?'System Health & Audit':'ML Intelligence Overview'}</h2><LoadState state={state}/>{d&&<>
 <p className="text-sm text-gray-500">{d.coverage} {d.registeredUsersScope} Charts cover the last {d.window.days} days in UTC unless labelled otherwise.</p>
 {!healthOnly&&<Cards items={[
 ['Registered Arckiv users',d.totalUsers],['Documents',d.totalDocuments],...['PDF','Image','DOCX'].map(type=>[type==='Image'?'Photos / images':type,d.types.find(t=>t._id===type)?.count||0]),
 ['ML attempts',d.totals.mlAttempts,'Excludes disabled / no-text decisions'],['ML acceptance rate',pct(d.totals.acceptanceRate),'Accepted / recorded ML attempts'],['Gemini fallback rate',pct(d.totals.fallbackRate),'Gemini-selected / recorded uploads'],['Failed classifications',d.totals.failed,'Failed upload or no final classifier'],['Average processing time',time(d.totals.averageMs),'All monitored processing, including extraction']
 ]}/>}
 {healthOnly&&<Cards items={[
 ['Model service',d.health.status],['ML inference failures',d.totals.mlFailures],['Extraction failures',d.totals.extractionFailures],['Gemini fallback selections',d.totals.fallbacks],['Average inference latency',time(d.totals.averageInferenceMs)],['Recorded uploads',d.totals.records]
 ]}/>}
 <div className="admin-chart-grid">{!healthOnly&&<>
 <Bars title="Daily document uploads (existing documents)" items={rows(d.uploads)}/><Bars title="Document categories — all current documents, top 30" items={rows(d.categories)}/>
 <Bars title="Confidence distribution" items={d.charts.confidence.map(b=>({label:b._id==='unknown'?'Unknown':`${Math.round(b._id*100)}–${Math.min(100,Math.round((b._id+.2)*100))}%`,value:b.count}))}/><Bars title="Final classification source" items={rows(d.charts.sources)}/>
 </>}<Bars title="Processing issues over time" items={rows(d.charts.failures)}/><Bars title="Prediction trends by model and category (up to 300 groups)" items={d.charts.trends.map(t=>({label:`${t._id.day} · ${t._id.category||'No prediction'} · ${t._id.model||'Unknown model'}`,value:t.count}))}/></div>
 <section className="admin-panel"><h3 className="font-semibold">Recent classification events</h3><div className="overflow-x-auto"><table className="admin-table"><thead><tr>{['Time','Document','Decision','Source','Status','Latency','Errors'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{d.charts.recent.map(r=><tr key={r._id}><td>{date(r.uploadedAt)}</td><td>{r.filename}</td><td>{r.decisionStatus}</td><td>{r.finalSource}</td><td>{r.status}</td><td>{time(r.durationMs)}</td><td>{r.processingErrors?.map(e=>`${e.stage}: ${e.code}`).join('; ')||'None recorded'}</td></tr>)}</tbody></table></div>{!d.charts.recent.length&&<Empty>No recent monitored uploads.</Empty>}</section>
 </>}</div>;
}
