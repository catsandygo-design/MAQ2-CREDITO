'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const result = await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setError('E-mail ou senha inválidos.');
      setLoading(false);
      return;
    }

    window.location.href = '/dashboard';
  }

  return (
    <main className="login-page">
      <div className="bg-orb bg-orb--green" />
      <div className="bg-orb bg-orb--blue" />
      <div className="bg-orb bg-orb--purple" />

      <div className="login-wrapper">
        <section className="login-card">
          <div className="logo-container">
            <div className="logo-icon">SC</div>
          </div>

          <h1 className="login-title">Sistema de Crédito</h1>
          <p className="login-subtitle">Faça login para acessar o painel do seu perfil.</p>

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

          <div className="card-hint">Acesso seguro via Supabase Auth</div>
        </section>
      </div>
    </main>
  );
}
