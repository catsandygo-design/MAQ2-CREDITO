import Link from 'next/link';

const indicadores = [
  ['Processos ativos', '74', 'Carteira em acompanhamento'],
  ['Com o analista', '23', 'Credito e validacao documental'],
  ['Enviados ao CCA', '31', 'Aguardando analise, formulario ou conformidade'],
  ['Assinados', '9', 'Minutas assinadas'],
];

const funil = [
  ['Aguardando documentos', '12', '16%'],
  ['Analise de credito', '18', '24%'],
  ['CCA analisar', '31', '42%'],
  ['Conformidade', '18', '24%'],
  ['Minuta assinada', '9', '12%'],
];

const sla = [
  ['Analista', '11h', 'ok'],
  ['CCA', '9h', 'ok'],
  ['Corretor', '14h', 'warn'],
  ['Conformidade', '18h', 'warn'],
];

const alertas = [
  ['critico', 'Ana Paula Ribeiro', 'Pendente emissao de formulario no CCA', 'Aguardando'],
  ['medio', 'Matheus Alves de Melo', 'Analista enviou para o CCA analisar', '24h'],
  ['ok', 'Joao Amorin', 'Minuta assinada', 'Finalizado'],
];

function toneClass(tone: string) {
  if (tone === 'critico') return 'gestor-danger';
  if (tone === 'medio' || tone === 'warn') return 'gestor-warn';
  return 'gestor-ok';
}

export default function GestorTelemetriaPage() {
  return (
    <main className="gestor-page">
      <header className="gestor-hero">
        <div>
          <span className="gestor-eyebrow">Governanca operacional</span>
          <h1>Telemetria do Gestor</h1>
          <p>Visao executiva do fluxo entre corretor, analista, CCA, conformidade e assinatura.</p>
        </div>
        <div className="gestor-actions">
          <Link href="/analista">Analista</Link>
          <Link href="/cca/acompanhamento">CCA</Link>
          <Link href="/painel/acompanhamento">Corretor</Link>
        </div>
      </header>

      <section className="gestor-kpi-grid">
        {indicadores.map(([titulo, total, desc]) => (
          <article className="gestor-card gestor-kpi" key={titulo}>
            <span>{titulo}</span>
            <b>{total}</b>
            <small>{desc}</small>
          </article>
        ))}
      </section>

      <section className="gestor-main-grid">
        <article className="gestor-card">
          <div className="gestor-card-head">
            <span>Pipeline</span>
            <h2>Esteira Caixa + Agehab</h2>
          </div>
          <div className="gestor-funnel">
            {funil.map(([etapa, total, perc]) => (
              <div className="gestor-funnel-row" key={etapa}>
                <div>
                  <strong>{etapa}</strong>
                  <small>{perc} da carteira</small>
                </div>
                <b>{total}</b>
              </div>
            ))}
          </div>
        </article>

        <article className="gestor-card">
          <div className="gestor-card-head">
            <span>SLA</span>
            <h2>Tempo medio por responsavel</h2>
          </div>
          <div className="gestor-sla-list">
            {sla.map(([area, tempo, tone]) => (
              <div className={`gestor-sla-row ${toneClass(tone)}`} key={area}>
                <span>{area}</span>
                <b>{tempo}</b>
              </div>
            ))}
          </div>
        </article>

        <article className="gestor-card">
          <div className="gestor-card-head">
            <span>Risco</span>
            <h2>Alertas operacionais</h2>
          </div>
          <div className="gestor-alert-list">
            {alertas.map(([tone, cliente, desc, prazo]) => (
              <div className={`gestor-alert ${toneClass(tone)}`} key={cliente}>
                <i />
                <div>
                  <strong>{cliente}</strong>
                  <span>{desc}</span>
                </div>
                <b>{prazo}</b>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
