
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createClient } from '../../lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    let result;
    try {
      result = await createClient().auth.signInWithPassword({ email, password });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Autenticação indisponível.');
      setLoading(false);
      return;
    }

    if (result.error) {
      setError('E-mail ou senha invalidos.');
      setLoading(false);
      return;
    }

    const destination = typeof location.state?.from === 'string' ? location.state.from : '/analista';
    navigate(destination, { replace: true });
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

        </section>
      </div>
    </main>
  );
}
