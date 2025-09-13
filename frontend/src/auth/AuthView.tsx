import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

type View = 'sign_in' | 'sign_up'

export function AuthView() {
  const [view, setView] = useState<View>('sign_in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) setSessionToken(data.session.access_token)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionToken(session?.access_token ?? null)
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = async () => {
    setLoading(true); setError(null); setInfo(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const signUp = async () => {
    setLoading(true); setError(null); setInfo(null)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    if (data?.user && !data.session) setInfo('Check your email to confirm your account, then sign in.')
    setLoading(false)
  }

  const signInWithGoogle = async () => {
    setError(null)
    const redirectTo = import.meta.env.VITE_OAUTH_REDIRECT_URL || window.location.origin
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    })
    if (error) setError(error.message)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  if (sessionToken) {
    return (
      <div className="auth-card">
        <h2 className="auth-title">You are signed in</h2>
        <div className="auth-stack">
          <button className="btn" onClick={signOut}>Sign out</button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-card">
      <h2 className="auth-title">{view === 'sign_in' ? 'Sign in' : 'Create account'}</h2>
      <div className="auth-stack">
        {error && <div className="error">{error}</div>}
        {info && <div className="note">{info}</div>}
        <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="input" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        {view === 'sign_in' ? (
          <button className="btn btn-primary" disabled={loading} onClick={signIn}>{loading ? 'Signing in…' : 'Sign in'}</button>
        ) : (
          <button className="btn btn-primary" disabled={loading} onClick={signUp}>{loading ? 'Creating…' : 'Create account'}</button>
        )}
        <button className="btn btn-google" onClick={signInWithGoogle}>Continue with Google</button>
        <div className="btn-row">
          <button className="btn" onClick={() => setView('sign_in')}>Sign in</button>
          <button className="btn" onClick={() => setView('sign_up')}>Sign up</button>
        </div>
      </div>
    </div>
  )
}


