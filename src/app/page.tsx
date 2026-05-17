export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#020617', color: '#e5e7eb', fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={{ display: 'grid', gap: 14, textAlign: 'center', padding: 24 }}>
        <h1 style={{ margin: 0 }}>MAQ2 Credito</h1>
        <p style={{ margin: 0, color: '#9ca3af' }}>Plataforma enterprise de credito imobiliario Caixa + Agehab.</p>
        <a href="/painel/acompanhamento" style={{ color: '#86efac', fontWeight: 800 }}>Entrar no painel do corretor</a>
      </div>
    </main>
  );
}
