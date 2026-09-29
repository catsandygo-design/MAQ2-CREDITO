import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { createClient, hasSupabaseConfig } from '@/lib/supabase/client';
import VoiceCommandAssistant from './VoiceCommandAssistant';

export default function RequireAuth() {
  const location = useLocation();
  const configured = hasSupabaseConfig();
  const [authenticated, setAuthenticated] = useState<boolean | null>(configured ? null : false);

  useEffect(() => {
    if (!configured) return;
    const client = createClient();
    client.auth.getSession().then(({ data }) => setAuthenticated(Boolean(data.session)));
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session));
    });
    return () => data.subscription.unsubscribe();
  }, [configured]);

  if (authenticated === null) {
    return <main className="login-page"><div className="login-card">Validando sessão...</div></main>;
  }
  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <><VoiceCommandAssistant /><Outlet /></>;
}
