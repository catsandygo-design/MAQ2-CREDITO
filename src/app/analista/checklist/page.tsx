<section className="cor-dash-grid cor-dash-premium" style={{ alignItems: 'stretch' }}>
        
        {/* DASHBOARD 1 - ESQUERDA */}
        <article className="cor-card cor-panel-alerts">
          <div className="cor-panel-head">
            <div>
              <small>Dashboard 1 — Pendencias acompanhadas</small>
              <p>Clientes e documentos que precisam de acao do analista ou retorno do corretor.</p>
            </div>
            <strong className="cor-urgent-pill">3 atencoes</strong>
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

        {/* DASHBOARD 2 - MOVIDO FISICAMENTE PARA O MEIO */}
        <article className="cor-card cor-panel-conversion">
            <div className="cor-panel-head">
              <div>
                <small>Dashboard 2 — Carteira em reserva</small>
                <p>Quantidade de clientes em reserva, finalizados e em pendencia documental.</p>
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

        {/* DASHBOARD 3 E RETRABALHO - MOVIDOS FISICAMENTE PARA A DIREITA */}
        <div className="cor-sla-stack" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
          <article className="cor-card cor-panel-sla">
            <div className="cor-panel-head">
              <div>
                <small>Dashboard 3 — SLA</small>
                <p>Tempo medio da carteira do analista comparado ao melhor SLA operacional.</p>
              </div>
            </div>
            <div className="cor-speed-premium" style={{ flexShrink: 0, minHeight: '110px' }}>
              <div className="cor-speed-arc" />
              <div className="cor-speed-needle" />
              <span style={{ transform: 'scale(0.8)' }} />
            </div>
            <div className="cor-sla-lines">
              <div><span>Melhor SLA documental</span><small>Referencia da operacao</small><b className="green">3h</b></div>
              <div><span>SLA atual do analista</span><small>Media de resposta da carteira</small><b className="orange">11h</b></div>
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