'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';

const LOGO_SRC = 'data:image/png;base64,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';

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
            <div className="logo-icon" aria-label="SioCred">
              <img className="logo-image" src={LOGO_SRC} alt="SioCred" />
            </div>
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
