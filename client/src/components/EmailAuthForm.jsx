import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function EmailAuthForm() {
  const { loginWithEmail, registerWithEmail, resetPassword } = useAuth();
  const [mode,setMode]=useState('login');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  async function submit(event) {
    event.preventDefault(); setError('');setNotice('');
    if(mode==='register' && password!==confirm) {setError('Passwords do not match.');return;}
    setBusy(true);
    try {
      if(mode==='reset') {await resetPassword(email);setNotice('If this email has an account, a password reset link has been sent.');}
      else if(mode==='register') await registerWithEmail(email,password);
      else await loginWithEmail(email,password);
    } catch(e) {
      const messages={'auth/invalid-credential':'Email or password is incorrect. If you used Google before, use Google sign-in or reset your password.', 'auth/email-already-in-use':'An account already uses this email. Sign in or reset your password.', 'auth/weak-password':'Choose a stronger password with at least 8 characters.', 'auth/too-many-requests':'Too many attempts. Please wait and try again.', 'auth/operation-not-allowed':'Email sign-in is not enabled yet. Please use Google sign-in.', 'auth/network-request-failed':'Unable to connect. Check your internet connection.'};
      setError(messages[e.code] || 'Unable to complete authentication. Check your details and try again.');
    } finally {setBusy(false);}
  }
  function changeMode(next) {setMode(next);setPassword('');setConfirm('');setError('');setNotice('');}
  return <section aria-label="Email authentication">
    <div className="flex gap-4 mb-4"><button type="button" aria-pressed={mode==='login'} onClick={()=>changeMode('login')} className="font-semibold text-blue-700">Sign in</button><button type="button" aria-pressed={mode==='register'} onClick={()=>changeMode('register')} className="font-semibold text-blue-700">Create account</button></div>
    <form onSubmit={submit} onReset={()=>{setEmail('');setPassword('');setConfirm('');setError('');setNotice('');}} className="space-y-3">
      <label className="block text-sm">Email<input className="form-field" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} /></label>
      {mode!=='reset' && <label className="block text-sm">Password<input className="form-field" name="password" type="password" autoComplete={mode==='register'?'new-password':'current-password'} required minLength={mode==='register'?8:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} /></label>}
      {mode==='register' && <label className="block text-sm">Confirm password<input className="form-field" name="confirmation" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} /><span className="text-xs text-gray-500">At least 8 characters. Never reuse an important password.</span></label>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-blue-600 text-white p-3 font-semibold disabled:opacity-50">{busy?'Please wait…':mode==='register'?'Create account':mode==='reset'?'Send reset link':'Sign in with email'}</button>
      <div className="flex justify-between text-xs"><button type="button" onClick={()=>changeMode('reset')}>Forgot password?</button><button type="reset">Clear form</button></div>
    </form>
  </section>;
}
