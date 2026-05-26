export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#ffffff', color: '#0f172a', fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={{ display: 'grid', gap: 14, textAlign: 'center', padding: 24 }}>
        <h1 style={{ margin: 0 }}>MAQ2 Credito</h1>
        <p style={{ margin: 0, color: '#475569' }}>Plataforma enterprise de credito imobiliario Caixa + Agehab.</p>
        <a href="/corretor" style={{ color: '#166534', fontWeight: 800 }}>Entrar no painel do corretor</a>
        <a href="/cca/acompanhamento" style={{ color: '#075985', fontWeight: 800 }}>Entrar no painel CCA</a>
        <a href="/analista" style={{ color: '#92400e', fontWeight: 800 }}>Entrar no painel do analista</a>
        <a href="/gestor/telemetria" style={{ color: '#334155', fontWeight: 800 }}>Entrar na telemetria do gestor</a>
      </div>
    </main>
  );
}
