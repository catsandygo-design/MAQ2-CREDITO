'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';

const TEST_PASSWORD = '123456';
const TEST_USERS = [
  { email: 'analista@siocred.com', label: 'Analista', path: '/analista' },
  { email: 'corretor@siocred.com', label: 'Corretor', path: '/corretor' },
  { email: 'gestor@siocred.com', label: 'Gestor', path: '/gestor/telemetria' },
  { email: 'cca@siocred.com', label: 'CCA', path: '/cca/acompanhamento' },
] as const;

export default function LoginPage() {
  const [email, setEmail] = useState<string>(TEST_USERS[0].email);
  const [password, setPassword] = useState(TEST_PASSWORD);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const testUser = TEST_USERS.find((user) => user.email === email);

    if (testUser && password === TEST_PASSWORD) {
      localStorage.setItem('siocred_test_session', testUser.email);
      window.location.href = testUser.path;
      return;
    }

    const supabase = createClient();
    const result = await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setError('E-mail ou senha invalidos.');
      setLoading(false);
      return;
    }

    window.location.href = '/analista';
  }

  return (
    <main className="login-page">
      <div className="bg-orb bg-orb--green" />
      <div className="bg-orb bg-orb--blue" />
      <div className="bg-orb bg-orb--purple" />

      <div className="login-wrapper">
        <section className="login-card">
          <div className="logo-container">
            <div className="logo-icon" aria-label="SioCred">SC</div>
          </div>

          <h1 className="login-title">Sistema de Credito</h1>
          <p className="login-subtitle">Faca login para acessar o painel do seu perfil.</p>

          <div className="card-hint" style={{ marginBottom: 16 }}>
            {TEST_USERS.map((user) => (
              <button
                key={user.email}
                type="button"
                className="btn-ghost"
                style={{ margin: 4, padding: '8px 10px' }}
                onClick={() => {
                  setEmail(user.email);
                  setPassword(TEST_PASSWORD);
                  setError('');
                }}
              >
                {user.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <label className="field-label" htmlFor="email">E-mail</label>
              <input className="field-input" id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="password">Senha</label>
              <input className="field-input" id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>

            <button className="submit-btn" type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
            <div className="error-box">{error}</div>
          </form>

          <div className="card-hint">
            Senha de teste: {TEST_PASSWORD}
          </div>
        </section>
      </div>
    </main>
  );
}
