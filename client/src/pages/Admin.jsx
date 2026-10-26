import {useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import DecisionExplorer from '../components/admin/DecisionExplorer';
import ModelLab from '../components/admin/ModelLab';
import MonitoringOverview from '../components/admin/MonitoringOverview';
import PredictionQuality from '../components/admin/PredictionQuality';
import {useAdminData, date} from '../components/admin/adminData';
import {LoadState, Pager} from '../components/admin/AdminUI';
function Users({user,revision}){
 const [page,setPage]=useState(1);const state=useAdminData(`/api/admin/overview?page=${page}`,user,revision);
 return <section><h2 className="text-2xl font-bold mb-5">User accounts</h2><LoadState state={state}/>{state.data&&<div className="admin-panel"><p className="text-sm text-gray-500">Synced Arckiv accounts. No passwords or document contents are exposed.</p><div className="overflow-x-auto"><table className="admin-table"><thead><tr>{['Name','Email','Joined','Files','Storage'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{state.data.users.map(u=><tr key={u._id}><td>{u.name}</td><td>{u.email}</td><td>{date(u.createdAt)}</td><td>{u.documentCount}</td><td>{(u.storageBytes/1048576).toFixed(2)} MB</td></tr>)}</tbody></table></div><Pager page={page} pages={state.data.pages} onPage={setPage}/></div>}</section>;
}
const tabs=[['overview','Overview'],['decisions','ML Decision Explorer'],['comparison','Model Comparison Lab'],['quality','Prediction Quality'],['registry','Model Registry'],['health','System Health & Audit'],['users','Users']];
export default function Admin(){
 const {currentUser,dbUser}=useAuth(),[tab,setTab]=useState('overview'),[revision,setRevision]=useState(0);
 if(!dbUser?.isAdmin)return <section className="admin-panel"><h1 className="text-2xl font-bold">Administrator access required</h1><Link to="/dashboard">Back to dashboard</Link></section>;
 const props={user:currentUser,revision};
 return <section className="admin-v2 space-y-6"><header className="flex justify-between items-start gap-4"><div><p className="text-xs uppercase tracking-widest text-blue-700 font-semibold">Arckiv · Admin V2</p><h1 className="text-3xl font-bold mt-2">ML Intelligence & Monitoring</h1><p className="text-sm text-gray-500 mt-2">Decisions, evidence and operational health. Metadata only.</p></div><button className="admin-button" onClick={()=>setRevision(n=>n+1)}>Refresh</button></header><nav aria-label="Admin sections" className="flex flex-wrap gap-2">{tabs.map(([id,label])=><button key={id} type="button" className={`admin-button ${tab===id?'admin-selected':''}`} aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)}>{label}</button>)}</nav><div key={tab} className="feature-enter">{tab==='overview'?<MonitoringOverview {...props}/>:tab==='health'?<MonitoringOverview {...props} healthOnly/>:tab==='decisions'?<DecisionExplorer {...props}/>:tab==='comparison'?<ModelLab {...props}/>:tab==='registry'?<ModelLab {...props} registryOnly/>:tab==='quality'?<PredictionQuality {...props}/>:<Users {...props}/>}</div></section>;
}
