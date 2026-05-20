{/* AJUSTE: alignItems stretch fortelece o alinhamento das 3 colunas em conjunto */}
      <section className="cor-dash-grid cor-dash-premium" style={{ alignItems: 'stretch' }}>
        
        {/* COLUNA 1 - ALERTAS (ESQUERDA) */}
        <article className="cor-card cor-panel-alerts">
          <div className="cor-panel-head">
            <div>
              <small>Dashboard 1 — Pendências Acompanhadas</small>
              <p>Clientes e documentos que necessitam de ação do analista ou retorno do corretor.</p>
            </div>
            <strong className="cor-urgent-pill">3 Atenções</strong>
          </div>
          <div className="cor-alert-list">
            {pendenciasAnalista.map(([tone, nome, desc, prazo]) => (
              <div className={`cor-alert-item cor-alert-${tone}`} key={nome}>
                <i />
                <div>
                  <b>{nome}</b>
                  <span>{desc}</span>
                </div>
                <em><small>Prazo</small>{prazo}</em>
              </div>
            ))}
          </div>
        </article>

        {/* COLUNA 2 - CARTEIRA (MEIO) - Injetada dentro da classe cor-middle-stack */}
        <div className="cor-middle-stack" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <article className="cor-card cor-panel-sla" style={{ flex: 1 }}>
            <div className="cor-panel-head">
              <div>
                <small>Dashboard 2 — Carteira em Reserva</small>
                <p>Quantidade de clientes em reserva, finalizados e em pendência documental.</p>
              </div>
            </div>
            <div className="cca-flow-metrics">
              {resumoCarteira.map(([label, total, desc]) => (
                <div key={label}>
                  <span>{label}</span>
                  <b>{total}</b>
                  <small>{desc}</small>
                </div>
              ))}
            </div>
          </article>
        </div>

        {/* COLUNA 3 - SLA E RETRABALHO (DIREITA) - Injetada dentro da classe cor-sla-stack */}
        <div className="cor-sla-stack" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
          <article className="cor-card cor-panel-conversion">
            <div className="cor-panel-head">
              <div>
                <small>Dashboard 3 — SLA</small>
                <p>Tempo médio da carteira do analista face ao melhor SLA operacional.</p>
              </div>
            </div>
            {/* AJUSTE: flexShrink impede o esmagamento; minHeight protege o espaço da agulha */}
            <div className="cor-speed-premium" style={{ flexShrink: 0, minHeight: '110px' }}>
              <div className="cor-speed-arc" />
              <div className="cor-speed-needle" />
              {/* AJUSTE: Scale 0.8 reduz visualmente o círculo branco central */}
              <span style={{ transform: 'scale(0.8)' }} />
            </div>
            <div className="cor-sla-lines">
              <div><span>Melhor SLA documental</span><small>Referência da operação</small><b className="green">3h</b></div>
              <div><span>SLA atual do analista</span><small>Média de resposta da carteira</small><b className="orange">11h</b></div>
            </div>
          </article>
          
          <article className="cor-card cor-rework-card" style={{ marginTop: '16px' }}>
            <div className="cor-rework">
              <span className="cor-rework-icon">🔨</span>
              <span>Taxa de retrabalho</span>
              <b>3,2%</b>
            </div>
          </article>
        </div>
      </section>