import { useEffect, useState } from 'react';
import { apiUrl } from '../../lib/api';
export function useAdminData(path,user,revision=0) {
 const [state,setState]=useState({data:null,error:'',loading:true});
 useEffect(()=>{if(!path||!user)return;const controller=new AbortController();setState({data:null,error:'',loading:true});
 (async()=>{try{const token=await user.getIdToken();const res=await fetch(apiUrl(path),{headers:{Authorization:`Bearer ${token}`},signal:controller.signal});const data=await res.json();if(!res.ok)throw Error(data.error||'Unable to load monitoring data');if(!controller.signal.aborted)setState({data,error:'',loading:false});}catch(e){if(!controller.signal.aborted)setState({data:null,error:e.message,loading:false});}})();return ()=>controller.abort();},[path,user,revision]);return state;
}
export const pct=n=>typeof n==='number'?`${(n*100).toFixed(1)}%`:'Unavailable';
export const time=n=>typeof n==='number'?`${n.toFixed(0)} ms`:'Unavailable';
export const date=n=>n?new Date(n).toLocaleString():'Not recorded';
