'use client';

import { useEffect, useMemo, useRef } from 'react';
import { apiUrl } from '@/lib/api/proxy';

const checklistCss = String.raw`:root {
      --bg: #0f172a;
      --card: #ffffff;
      --card-soft: #f8fafc;
      --accent: #22c55e;
      --accent-soft: rgba(34, 197, 94, 0.15);
      --accent-dark: #16a34a;
      --text: #0f172a;
      --text-soft: #475569;
      --danger: #ef4444;
      --warning: #f97316;
      --info: #0ea5e9;
      --border: #cbd5e1;
      --shadow: 0 18px 38px rgba(15, 23, 42, 0.12);
      --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    * {
      box-sizing: border-box;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    body {
      margin: 0;
      background: #ffffff;
      color: var(--text);
      min-height: 100vh;
    }

    .hidden {
      display: none !important;
    }

    .app-container {
      max-width: 1120px;
      margin: 0 auto;
      padding: 24px 16px 40px;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .topbar-left h1 {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .topbar-left h1 i {
      color: var(--accent);
    }

    .topbar-left .badge {
      font-size: 0.8rem;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(34, 197, 94, 0.15);
      color: var(--accent);
      border: 1px solid rgba(34, 197, 94, 0.4);
      text-transform: uppercase;
      letter-spacing: .08em;
      font-weight: 600;
      display: inline-block;
      margin-top: 8px;
    }

    .topbar-left .subtitle {
      color: var(--text-soft);
      font-size: 0.9rem;
      margin-top: 6px;
    }

    .topbar-right {
      font-size: 0.85rem;
      color: #334155;
      background: #ffffff;
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid rgba(15, 23, 42, 0.12);
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .topbar-right strong {
      color: var(--accent);
    }

    .topbar-right .user-line {
      font-size: 0.8rem;
      color: #475569;
      margin-top: 4px;
    }

    .btn-voltar-acompanhamento {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 36px;
      margin-top: 8px;
      padding: 0 14px;
      border-radius: 999px;
      border: 1px solid rgba(34, 197, 94, 0.38);
      background: rgba(34, 197, 94, 0.12);
      color: #166534;
      font-weight: 800;
      font-size: 0.82rem;
      text-decoration: none;
      white-space: nowrap;
    }

    .grid {
      display: grid;
      grid-template-columns: 2fr 1.4fr;
      gap: 20px;
    }

    @media (max-width: 900px) {
      .grid {
        grid-template-columns: 1fr;
      }
      
      .topbar {
        flex-direction: column;
        align-items: flex-start;
      }
    }

    .card {
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid rgba(15, 23, 42, 0.12);
      padding: 20px 24px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(10px);
      transition: var(--transition);
    }

    .card:hover {
      border-color: rgba(15, 23, 42, 0.22);
      box-shadow: 0 22px 36px rgba(15, 23, 42, 0.16);
    }

    .card h2 {
      color: #0f172a;
      font-size: 1.2rem;
      margin: 0 0 6px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .card h2 i {
      color: var(--accent);
    }

    .card small {
      color: #475569;
      font-size: 0.8rem;
      line-height: 1.5;
    }

    .section {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px dashed rgba(15, 23, 42, 0.22);
    }

    .section-title {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: #334155;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .section-title span.pill {
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      padding: 4px 12px;
      font-size: 0.75rem;
      color: #334155;
      background: #f8fafc;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 16px;
    }

    @media (max-width: 600px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.85rem;
    }

    label {
      color: #334155;
      font-weight: 500;
    }

    input, select {
      background: var(--card-soft);
      border-radius: 10px;
      border: 1px solid var(--border);
      padding: 10px 12px;
      color: var(--text);
      font-size: 0.85rem;
      outline: none;
      transition: var(--transition);
    }

    input:focus, select:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
    }

    .input-error {
      border-color: var(--danger) !important;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2) !important;
    }

    input[readonly] {
      background: #f1f5f9;
      color: #475569;
    }

    .hint {
      font-size: 0.75rem;
      color: #475569;
      line-height: 1.6;
      margin-top: 6px;
    }

    .hint i {
      margin-right: 4px;
      color: var(--accent);
    }

    .hint strong {
      color: var(--accent);
      font-weight: 600;
    }

    .rules-list {
      background: #f8fafc;
      color: #334155;
      border-radius: 10px;
      padding: 14px;
      margin-top: 12px;
      border: 1px solid rgba(15, 23, 42, 0.12);
      border-left: 3px solid var(--accent);
    }

    .rules-list ul {
      margin: 0;
      padding-left: 18px;
    }

    .rules-list li {
      margin-bottom: 6px;
      font-size: 0.8rem;
    }

    .status-dots {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
      font-size: 0.8rem;
      margin-top: 8px;
    }

    .dot-label {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 8px;
      background: #f8fafc;
      color: #334155;
    }

    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
    }

    .dot.nao-enviado { background: #9ca3af; box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.2); }
    .dot.em-analise { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2); }
    .dot.aprovado { background: #22c55e; box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2); }
    .dot.rejeitado { background: #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2); }
    .dot.pendenciado { background: #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2); }
    .dot.reprovado { background: #020617; border: 1px solid #4b5563; }

    .file-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px;
      border-radius: 12px;
      background: #f8fafc;
      border: 1px solid rgba(15, 23, 42, 0.12);
      margin-bottom: 10px;
      transition: var(--transition);
    }

    .file-row:hover {
      border-color: rgba(148, 163, 184, 0.4);
      transform: translateY(-2px);
    }

    .file-row-main {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .file-row-title {
      color: #0f172a;
      font-size: 0.9rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .file-row-title i {
      color: var(--accent);
    }

    .file-row-desc {
      font-size: 0.75rem;
      color: #475569;
    }

    .file-row-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.75rem;
    }

    .btn-upload {
      border-radius: 999px;
      padding: 8px 16px;
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.2));
      border: 1px solid rgba(34, 197, 94, 0.5);
      color: var(--accent);
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 500;
      transition: var(--transition);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-upload:hover {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.3));
      border-color: var(--accent);
      transform: scale(1.05);
    }

    .btn-upload.uploaded {
      background: rgba(34, 197, 94, 0.2);
      border-color: var(--accent);
      color: var(--accent);
    }

    .decision-select {
      min-width: 132px;
      border-radius: 999px;
      border: 1px solid rgba(34, 197, 94, 0.45);
      background: #ecfdf5;
      color: #166534;
      font-weight: 700;
      padding: 8px 14px;
      cursor: pointer;
    }

    .btn-upload.pending {
      background: rgba(245, 158, 11, 0.2);
      border-color: var(--warning);
      color: var(--warning);
    }

    .btn-upload.rejected {
      background: rgba(239, 68, 68, 0.2);
      border-color: var(--danger);
      color: var(--danger);
    }

    .btn-primary {
      margin-top: 20px;
      width: 100%;
      border-radius: 12px;
      padding: 14px 0;
      border: none;
      background: linear-gradient(135deg, var(--accent), var(--accent-dark));
      color: white;
      font-size: 0.95rem;
      cursor: pointer;
      font-weight: 600;
      box-shadow: 0 12px 25px rgba(34, 197, 94, 0.3);
      transition: var(--transition);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .btn-primary:hover {
      filter: brightness(1.1);
      transform: translateY(-2px);
      box-shadow: 0 16px 30px rgba(34, 197, 94, 0.4);
    }

    .btn-primary:active {
      transform: translateY(0);
    }

    .btn-primary:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .right-panel {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .sla-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.85rem;
      padding: 16px;
      border-radius: 14px;
      background: radial-gradient(circle at top left, rgba(34, 197, 94, 0.2), transparent 60%),
                  var(--card-soft);
      border: 1px solid rgba(34, 197, 94, 0.5);
      transition: var(--transition);
    }

    .sla-box:hover {
      border-color: var(--accent);
      box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
    }

    .sla-time {
      font-size: 2rem;
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      letter-spacing: 2px;
      color: var(--accent);
    }

    .sla-label {
      color: var(--text-soft);
      font-size: 0.75rem;
    }

    .sla-role {
      font-size: 0.8rem;
      text-align: right;
    }

    .sla-role strong {
      color: var(--accent);
      font-size: 1rem;
    }

    .kit-section {
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      padding: 16px;
      margin-top: 12px;
      text-align: center;
    }

    .kit-section i {
      font-size: 2rem;
      color: var(--accent);
      margin-bottom: 12px;
      display: block;
    }

    .notification {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--card);
      border: 1px solid rgba(34, 197, 94, 0.5);
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: var(--shadow);
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 1000;
      transform: translateY(100px);
      opacity: 0;
      transition: var(--transition);
    }

    .notification.show {
      transform: translateY(0);
      opacity: 1;
    }

    .notification i {
      color: var(--accent);
      font-size: 1.2rem;
    }

    .modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      opacity: 0;
      visibility: hidden;
      transition: var(--transition);
    }

    .modal.active {
      opacity: 1;
      visibility: visible;
    }

    .modal-content {
      background: var(--card);
      border-radius: 16px;
      padding: 30px;
      max-width: 500px;
      width: 90%;
      border: 1px solid rgba(148, 163, 184, 0.2);
      box-shadow: var(--shadow);
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .modal-header h3 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .modal-close {
      background: none;
      border: none;
      color: var(--text-soft);
      font-size: 1.2rem;
      cursor: pointer;
    }

    .progress-bar {
      height: 6px;
      background: rgba(148, 163, 184, 0.2);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 10px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--accent-dark));
      width: 0%;
      transition: width 0.5s ease;
    }

    .doc-thumbnail {
      height: 36px;
      width: 36px;
      object-fit: cover;
      border-radius: 6px;
      margin-left: 12px;
      border: 2px solid rgba(148, 163, 184, 0.2);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .doc-thumbnail:hover {
      transform: scale(1.8);
      border-color: var(--accent);
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      z-index: 100;
    }

    /* Loading Overlay */
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(4px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 3000;
      opacity: 0;
      visibility: hidden;
      transition: var(--transition);
    }

    .loading-overlay.active {
      opacity: 1;
      visibility: visible;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(34, 197, 94, 0.3);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  

    .checklist-only-card { max-width: 1120px; margin: 0 auto; }
    .topbar { display: none; }
    .checklist-backbar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 14px;
    }
    .checklist-backbar a {
      min-height: 42px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 16px;
      border-radius: 14px;
      background: #0f172a;
      color: #f8fafc;
      text-decoration: none;
      font-weight: 900;
      box-shadow: 0 12px 26px rgba(15, 23, 42, .16);
      white-space: nowrap;
    }
    .kit-timeline-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .kit-timeline-card {
      background: #ffffff;
      border: 1px solid rgba(15, 23, 42, 0.12);
      border-radius: 16px;
      padding: 22px 24px;
      box-shadow: var(--shadow);
    }
    .kit-timeline-card h2 {
      margin: 0 0 20px;
      color: #0f172a;
      font-size: 1.55rem;
      letter-spacing: .12em;
      font-weight: 900;
    }
    .kit-timeline-line {
      position: relative;
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      align-items: center;
      gap: 0;
      margin-bottom: 20px;
    }
    .kit-timeline-line::before {
      content: "";
      position: absolute;
      left: 10px;
      right: 10px;
      top: 50%;
      height: 3px;
      background: #dbe4ef;
      transform: translateY(-50%);
      border-radius: 999px;
    }
    .kit-dot {
      position: relative;
      z-index: 1;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #ffffff;
      border: 3px solid #cbd8e8;
      justify-self: center;
    }
    .kit-dot.active {
      width: 20px;
      height: 20px;
      border-color: transparent;
      box-shadow: 0 0 0 10px rgba(14, 165, 233, .14);
      background: #19aee6;
    }
    .kit-dot.done {
      border-color: #22c55e;
      background: #22c55e;
    }
    .kit-agehab .kit-dot.active {
      box-shadow: 0 0 0 10px rgba(245, 158, 11, .16);
      background: #f59e0b;
    }
    .kit-progress-track {
      height: 8px;
      border-radius: 999px;
      background: #dbe4ef;
      overflow: hidden;
    }
    .kit-progress-fill {
      display: block;
      width: 17%;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #22c55e, #0ea5e9);
    }
    .dados-proponente-card {
      max-width: none;
      border-radius: 18px;
      padding: 26px 28px;
    }
    .dados-proponente-card > h2,
    .dados-proponente-card > small {
      display: none;
    }
    .dados-proponente-card .section {
      margin-top: 0;
      padding-top: 0;
      border-top: 1px dashed rgba(15, 23, 42, 0.22);
    }
    .dados-proponente-card .section-title {
      padding-top: 24px;
      margin-bottom: 24px;
    }
    .dados-proponente-card .section-title > span:first-child {
      font-size: 1.05rem;
      color: #0f172a;
      letter-spacing: .18em;
      font-weight: 500;
    }
    .dados-proponente-card .section-title .pill {
      font-size: .95rem;
      letter-spacing: .18em;
      font-weight: 800;
      padding: 8px 20px;
    }
    .dados-proponente-card .form-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 22px;
    }
    .dados-proponente-card label {
      color: #334155;
      font-size: 1rem;
      font-weight: 800;
    }
    .dados-proponente-card input,
    .dados-proponente-card select {
      min-height: 63px;
      border-radius: 14px;
      font-size: 1rem;
      font-weight: 800;
      color: #020617;
      background: #f8fafc;
    }
    .dados-proponente-card .hint {
      display: none;
    }
    .dados-proponente-card > .section:nth-of-type(2),
    .dados-proponente-card .dependentes-section,
    .dados-proponente-card .dados-actions {
      display: none;
    }
    @media (max-width: 1100px) {
      .dados-proponente-card .form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 700px) {
      .kit-timeline-grid { grid-template-columns: 1fr; }
      .dados-proponente-card .form-grid { grid-template-columns: 1fr; }
    }
    .file-row-desc { white-space: pre-line; }
    .pendency-note {
      margin-top: 10px;
      padding: 10px 12px;
      border-left: 4px solid #ef4444;
      border-radius: 10px;
      background: #fff1f2;
      color: #991b1b;
      font-size: .82rem;
      font-weight: 800;
      line-height: 1.35;
      white-space: pre-line;
      max-height: 96px;
      overflow-y: auto;
    }
    .pendency-note small {
      display: block;
      margin-top: 4px;
      color: #7f1d1d;
      font-weight: 700;
    }
    .file-row-actions { min-width: 145px; justify-content: flex-end; }
    .section-summary { color: var(--text-soft); font-size: .78rem; }
    .doc-counter { color: var(--accent); font-weight: 700; }
    .btn-upload input[type="file"] { display: none; }
    @media (max-width: 700px) {
      .file-row { align-items: flex-start; flex-direction: column; }
      .file-row-actions { width: 100%; justify-content: space-between; }
      .btn-upload { flex: 1; justify-content: center; }
    }`;
const checklistMarkup = String.raw`<div class="app-container">
    <div class="topbar">
      <div class="topbar-left">
        <h1><i class="fas fa-file-contract"></i> Checklist de Documentos</h1>
        <div class="badge">UPLOAD DE DOCUMENTOS</div>
        <div class="subtitle">Checklist extraído do painel do analista com layout, cores, luz indicadora e botão de upload do DOCTYPE HTML.</div>
      </div>
      <div class="topbar-right">
        <div><strong>Total de documentos:</strong> 36</div>
        <div><strong>Status:</strong> <span id="totalEnviados">0</span> enviados</div>
        <div class="user-line">Cada documento mantém o semáforo visual individual.</div>
        <a class="btn-voltar-acompanhamento" href="/corretor">Voltar para acompanhamento</a>
      </div>
    </div>


    <div class="checklist-backbar">
      <a href="/corretor">Voltar</a>
    </div>


    <div class="kit-timeline-grid">
      <div class="kit-timeline-card kit-caixa">
        <h2>KIT CAIXA</h2>
        <div class="kit-timeline-line">
          <span class="kit-dot active"></span>
          <span class="kit-dot"></span>
          <span class="kit-dot"></span>
          <span class="kit-dot"></span>
          <span class="kit-dot"></span>
          <span class="kit-dot"></span>
        </div>
        <div class="kit-progress-track"><span class="kit-progress-fill"></span></div>
      </div>
      <div class="kit-timeline-card kit-agehab">
        <h2>KIT AGEHAB</h2>
        <div class="kit-timeline-line">
          <span class="kit-dot active"></span>
          <span class="kit-dot"></span>
          <span class="kit-dot"></span>
          <span class="kit-dot"></span>
          <span class="kit-dot"></span>
          <span class="kit-dot"></span>
        </div>
        <div class="kit-progress-track"><span class="kit-progress-fill"></span></div>
      </div>
    </div>


    <div class="card dados-proponente-card">
      <h2><i class="fas fa-user-circle"></i> Dados do Proponente & Dependentes</h2>
      <small>Preencha os dados básicos. Informações sensíveis (CPF, telefone, etc.) continuam apenas no CRM.</small>

      <div class="section">
        <div class="section-title">
          <span>Proponente</span>
          <span class="pill">Identificação do processo</span>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>Nome completo</label>
            <input type="text" id="nomeCompleto" placeholder="Nome do proponente" />
          </div>

          <div class="form-group">
            <label>Nº da reserva (cliente_id)</label>
            <input type="text" id="numeroReserva" placeholder="Ex: 458712" />
          </div>

          <div class="form-group">
            <label>Cidade</label>
            <input type="text" id="cidade" placeholder="Ex: Águas Lindas de Goiás" />
          </div>

          <div class="form-group">
            <label>Empreendimento</label>
            <select id="empreendimento">
              <option value="">Selecione...</option>
              <option>AGL</option>
              <option>FSA</option>
              <option>Catalão</option>
              <option>Outro</option>
            </select>
          </div>

          <div class="form-group">
            <label>Corretor responsável</label>
            <input type="text" id="corretor" placeholder="Nome do corretor" />
          </div>

          <div class="form-group">
            <label>Sinal ok?</label>
            <input type="text" id="sinalOk" value="Nao tem" readonly />
          </div>

          <div class="form-group">
            <label>Fiador ok?</label>
            <input type="text" id="fiadorOk" value="Nao tem" readonly />
          </div>

          <div class="form-group">
            <label>Produto?</label>
            <input type="text" id="produto" value="PP" readonly />
          </div>

          <div class="form-group">
            <label>Estado civil</label>
            <select id="estadoCivil">
              <option value="">Selecione...</option>
              <option value="solteiro">Solteiro(a)</option>
              <option value="casado">Casado(a)</option>
              <option value="uniao_estavel">União estável</option>
              <option value="divorciado">Divorciado(a)</option>
              <option value="viuvo">Viúvo(a)</option>
            </select>
            <div class="hint">
              <i class="fas fa-info-circle"></i> Se marcar <strong>casado</strong> ou <strong>união estável</strong>, serão exigidos docs do cônjuge.
            </div>
          </div>

          <div class="form-group">
            <label>Tipo de renda</label>
            <select id="tipoRenda">
              <option value="">Selecione...</option>
              <option value="formal">Formal (CLT / comprovada)</option>
              <option value="informal">Informal</option>
              <option value="mista">Mista (formal + informal)</option>
            </select>
            <div class="hint">
              <i class="fas fa-exclamation-triangle"></i>
              <strong>Formal:</strong> obrigatório enviar <strong>extrato de FGTS</strong>.<br>
              <strong>Informal:</strong> obrigatório anexar <strong>Declaração de Não Renda para Agehab.</strong>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">
          <span>Dependentes</span>
          <span class="pill">Regras automáticas por tipo</span>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>Tipo de dependente</label>
            <select id="tipoDependente">
              <option value="">Selecione...</option>
              <option value="filho_menor">Filho menor</option>
              <option value="filho_maior">Filho maior</option>
              <option value="parente">Parente até 3º grau</option>
            </select>
          </div>

          <div class="form-group" id="dependenteCasadoGroup">
            <label>Dependente casado?</label>
            <select id="dependenteCasado">
              <option value="nao" selected>Não</option>
              <option value="sim">Sim</option>
            </select>
          </div>
        </div>

      </div>

      <div style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
        <button class="btn-primary" id="btnSalvar" style="flex:1; min-width:220px;">
          <i class="fas fa-save"></i> Salvar
        </button>
        <button class="btn-primary" id="btnAcompanhar" style="flex:1; min-width:220px; background:#ffffff; color:#0f172a; border:1px solid var(--border); box-shadow:none;">
          <i class="fas fa-list"></i> Acompanhamento
        </button>
      </div>
    </div>

    <div class="card checklist-only-card">
      <h2><i class="fas fa-list-check"></i> Conferência e envio do checklist</h2>
      <small>Somente tipo de documento, descrição, indicador visual e botão de upload. Sem os campos extras do painel do analista.</small>
      
          <div class="section">
            <div class="section-title">
              <span>Documentos do Proponente</span>
              <span class="pill"><span class="doc-counter">6</span> documentos</span>
            </div>
            <div class="section-summary">Base do dossiê do proponente (identidade, estado civil, residência, etc.).</div>


            <div class="file-row" data-doc="documentos-do-proponente-identidade-e-cpf-1" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-id-card"></i> Identidade e CPF</span>
                <span class="file-row-desc">CNH, RG, Identidade Militar, Passaporte brasileiro ou carteira funcional com fé pública (dentro da validade) do proponente.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-documentos-do-proponente-identidade-e-cpf-1" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-do-proponente-identidade-e-cpf-1">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-do-proponente-identidade-e-cpf-1" />
                </label>
              </div>
            </div>


            <div class="file-row" data-doc="documentos-do-proponente-comp-de-estado-civil-2" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-heart"></i> Comp. de estado civil</span>
                <span class="file-row-desc">Certidão de nascimento.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-documentos-do-proponente-comp-de-estado-civil-2" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-do-proponente-comp-de-estado-civil-2">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-do-proponente-comp-de-estado-civil-2" />
                </label>
              </div>
            </div>


            <div class="file-row" data-doc="documentos-do-proponente-comprovante-de-residencia-3" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-house"></i> Comprovante de residência</span>
                <span class="file-row-desc">Comprovante aberto; não precisa estar no nome do cliente.
Água, luz, telefone, internet, celular, cartão de crédito.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-documentos-do-proponente-comprovante-de-residencia-3" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-do-proponente-comprovante-de-residencia-3">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-do-proponente-comprovante-de-residencia-3" />
                </label>
              </div>
            </div>


            <div class="file-row" data-doc="documentos-do-proponente-irpf-recibo-4" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-file-lines"></i> IRPF + recibo</span>
                <span class="file-row-desc">Declaração completa do ano atual + recibo de entrega + DARF pago (se houver).
⚠️ Somente se perfil = INFORMAL e IRPF para informal = SIM.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-documentos-do-proponente-irpf-recibo-4" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-do-proponente-irpf-recibo-4">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-do-proponente-irpf-recibo-4" />
                </label>
              </div>
            </div>


            <div class="file-row" data-doc="documentos-do-proponente-extrato-fgts-5" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-money-bill-wave"></i> Extrato FGTS</span>
                <span class="file-row-desc">App FGTS / site Caixa / agência.
Militar/soldado: anexar também 3 últimos extratos bancários da conta salário.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-documentos-do-proponente-extrato-fgts-5" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-do-proponente-extrato-fgts-5">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-do-proponente-extrato-fgts-5" />
                </label>
              </div>
            </div>


            <div class="file-row" data-doc="documentos-do-proponente-ctps-carteira-6" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-file-lines"></i> CTPS (carteira)</span>
                <span class="file-row-desc">Carteira Digital (todas infos) ou CTPS física: qualificação, contratos e anotações.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-documentos-do-proponente-ctps-carteira-6" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-do-proponente-ctps-carteira-6">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-do-proponente-ctps-carteira-6" />
                </label>
              </div>
            </div>

          </div>

          <div class="section">
            <div class="section-title">
              <span>Dependente — Filhos menores de 18 anos</span>
              <span class="pill"><span class="doc-counter">1</span> documentos</span>
            </div>
            <div class="section-summary">Aparece quando o tipo de dependente for &quot;Filho menor&quot;.</div>


            <div class="file-row" data-doc="dependente-filhos-menores-de-18-anos-certidao-de-nascimento-1" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-heart"></i> Certidão de nascimento</span>
                <span class="file-row-desc">Guarda/adoção: anexar termos respectivos.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-dependente-filhos-menores-de-18-anos-certidao-de-nascimento-1" title="Não enviado"></span>
                <label class="btn-upload" id="btn-dependente-filhos-menores-de-18-anos-certidao-de-nascimento-1">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="dependente-filhos-menores-de-18-anos-certidao-de-nascimento-1" />
                </label>
              </div>
            </div>

          </div>

          <div class="section">
            <div class="section-title">
              <span>Dependente — Filhos maiores / parentes até 3º grau</span>
              <span class="pill"><span class="doc-counter">3</span> documentos</span>
            </div>
            <div class="section-summary">Aparece quando o dependente não for &quot;Filho menor&quot;.</div>


            <div class="file-row" data-doc="dependente-filhos-maiores-parentes-ate-3-grau-identidade-e-cpf-1" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-id-card"></i> Identidade e CPF</span>
                <span class="file-row-desc">CNH, RG, Identidade Militar, Passaporte brasileiro ou carteira funcional com fé pública (dentro da validade) do dependente.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-dependente-filhos-maiores-parentes-ate-3-grau-identidade-e-cpf-1" title="Não enviado"></span>
                <label class="btn-upload" id="btn-dependente-filhos-maiores-parentes-ate-3-grau-identidade-e-cpf-1">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="dependente-filhos-maiores-parentes-ate-3-grau-identidade-e-cpf-1" />
                </label>
              </div>
            </div>


            <div class="file-row" data-doc="dependente-filhos-maiores-parentes-ate-3-grau-comp-de-estado-civil-2" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-heart"></i> Comp. de estado civil</span>
                <span class="file-row-desc">SOLTEIRO: Certidão de nascimento
CASADO: Certidão de casamento – RG/CPF do cônjuge se houver renda
VIÚVO: Certidão de casamento e óbito
DIVORCIADO: Certidão averbada.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-dependente-filhos-maiores-parentes-ate-3-grau-comp-de-estado-civil-2" title="Não enviado"></span>
                <label class="btn-upload" id="btn-dependente-filhos-maiores-parentes-ate-3-grau-comp-de-estado-civil-2">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="dependente-filhos-maiores-parentes-ate-3-grau-comp-de-estado-civil-2" />
                </label>
              </div>
            </div>


            <div class="file-row" data-doc="dependente-filhos-maiores-parentes-ate-3-grau-declaracao-de-parentesco-3" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-file-lines"></i> Declaração de parentesco</span>
                <span class="file-row-desc">Declaração conforme regras Caixa, vinculando dependente ao proponente.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-dependente-filhos-maiores-parentes-ate-3-grau-declaracao-de-parentesco-3" title="Não enviado"></span>
                <label class="btn-upload" id="btn-dependente-filhos-maiores-parentes-ate-3-grau-declaracao-de-parentesco-3">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="dependente-filhos-maiores-parentes-ate-3-grau-declaracao-de-parentesco-3" />
                </label>
              </div>
            </div>

          </div>

          <div class="section">
            <div class="section-title">
              <span>Renda formal (CLT / vínculo)</span>
              <span class="pill"><span class="doc-counter">2</span> documentos</span>
            </div>
            <div class="section-summary">Aparece quando perfil de renda = CLT.</div>


            <div class="file-row" data-doc="renda-formal-clt-vinculo-holerites-1" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-money-bill-wave"></i> Holerites</span>
                <span class="file-row-desc">3 últimos holerites/contracheques (nome/CNPJ/cargo/admissão/bruto).</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-renda-formal-clt-vinculo-holerites-1" title="Não enviado"></span>
                <label class="btn-upload" id="btn-renda-formal-clt-vinculo-holerites-1">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="renda-formal-clt-vinculo-holerites-1" />
                </label>
              </div>
            </div>


            <div class="file-row" data-doc="renda-formal-clt-vinculo-renda-variavel-2" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-money-bill-wave"></i> Renda variável</span>
                <span class="file-row-desc">Comissões/HE/adicional: holerites suficientes para média conforme Caixa.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-renda-formal-clt-vinculo-renda-variavel-2" title="Não enviado"></span>
                <label class="btn-upload" id="btn-renda-formal-clt-vinculo-renda-variavel-2">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="renda-formal-clt-vinculo-renda-variavel-2" />
                </label>
              </div>
            </div>

          </div>

          <div class="section">
            <div class="section-title">
              <span>Renda informal (autônomo / liberal)</span>
              <span class="pill"><span class="doc-counter">1</span> documentos</span>
            </div>
            <div class="section-summary">Aparece quando perfil de renda = INFORMAL.</div>


            <div class="file-row" data-doc="renda-informal-autonomo-liberal-extrato-bancario-1" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-money-bill-wave"></i> Extrato bancário</span>
                <span class="file-row-desc">3 últimos meses (preferir mês fechado). Aceita PDF/impresso e bancos digitais.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-renda-informal-autonomo-liberal-extrato-bancario-1" title="Não enviado"></span>
                <label class="btn-upload" id="btn-renda-informal-autonomo-liberal-extrato-bancario-1">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="renda-informal-autonomo-liberal-extrato-bancario-1" />
                </label>
              </div>
            </div>

          </div>

          <div class="section">
            <div class="section-title">
              <span>Aposentados / Pensionistas</span>
              <span class="pill"><span class="doc-counter">1</span> documentos</span>
            </div>
            <div class="section-summary">Aparece quando perfil de renda = APOSENTADO.</div>


            <div class="file-row" data-doc="aposentados-pensionistas-extrato-do-beneficio-1" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-money-bill-wave"></i> Extrato do benefício</span>
                <span class="file-row-desc">Último extrato (Meu INSS / Dataprev).</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-aposentados-pensionistas-extrato-do-beneficio-1" title="Não enviado"></span>
                <label class="btn-upload" id="btn-aposentados-pensionistas-extrato-do-beneficio-1">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="aposentados-pensionistas-extrato-do-beneficio-1" />
                </label>
              </div>
            </div>

          </div>

          <div class="section">
            <div class="section-title">
              <span>Domésticos / contratação por CPF</span>
              <span class="pill"><span class="doc-counter">1</span> documentos</span>
            </div>
            <div class="section-summary">Aparece quando perfil de renda = DOMÉSTICO.</div>


            <div class="file-row" data-doc="domesticos-contratacao-por-cpf-esocial-1" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-file-lines"></i> eSocial</span>
                <span class="file-row-desc">3 últimos comprovantes do eSocial.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-domesticos-contratacao-por-cpf-esocial-1" title="Não enviado"></span>
                <label class="btn-upload" id="btn-domesticos-contratacao-por-cpf-esocial-1">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="domesticos-contratacao-por-cpf-esocial-1" />
                </label>
              </div>
            </div>

          </div>

          <div class="section">
            <div class="section-title">
              <span>Documentos Caixa</span>
              <span class="pill"><span class="doc-counter">7</span> documentos</span>
            </div>
            <div class="section-summary">Extras (Cheque Azul/Cartão) aparecem se &quot;CCA gerou formulários&quot; = SIM.</div>


            <div class="file-row" data-doc="documentos-caixa-damp-1" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-file-lines"></i> DAMP</span>
                <span class="file-row-desc">Preenchida e assinada digitalmente. Físico só com aprovação do crédito.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-documentos-caixa-damp-1" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-caixa-damp-1">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-caixa-damp-1" />
                </label>
              </div>
            </div>


            <div class="file-row" data-doc="documentos-caixa-ficha-de-cadastro-caixa-2" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-building-columns"></i> Ficha de cadastro Caixa</span>
                <span class="file-row-desc">Preenchida (endereço igual ao cadastro). Assinada digitalmente; físico com aprovação.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-documentos-caixa-ficha-de-cadastro-caixa-2" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-caixa-ficha-de-cadastro-caixa-2">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-caixa-ficha-de-cadastro-caixa-2" />
                </label>
              </div>
            </div>


            <div class="file-row" data-doc="documentos-caixa-abertura-de-conta-3" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-building-columns"></i> Abertura de conta</span>
                <span class="file-row-desc">Assinada digitalmente; físico precisa aprovação do crédito.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-documentos-caixa-abertura-de-conta-3" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-caixa-abertura-de-conta-3">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-caixa-abertura-de-conta-3" />
                </label>
              </div>
            </div>


            <div class="file-row" data-doc="documentos-caixa-mo-4" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-file-lines"></i> MO</span>
                <span class="file-row-desc">Assinatura correta (2ª página). Casal: assinatura de ambos.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-documentos-caixa-mo-4" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-caixa-mo-4">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-caixa-mo-4" />
                </label>
              </div>
            </div>


            <div class="file-row" data-doc="documentos-caixa-formulario-cheque-azul-5" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-file-lines"></i> Formulário Cheque Azul</span>
                <span class="file-row-desc">Formulário de contratação (assinatura digital). Físico somente com aprovação.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-documentos-caixa-formulario-cheque-azul-5" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-caixa-formulario-cheque-azul-5">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-caixa-formulario-cheque-azul-5" />
                </label>
              </div>
            </div>


            <div class="file-row" data-doc="documentos-caixa-formulario-cartao-6" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-file-lines"></i> Formulário Cartão</span>
                <span class="file-row-desc">Formulário do cartão Caixa com campos obrigatórios e assinatura digital.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-documentos-caixa-formulario-cartao-6" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-caixa-formulario-cartao-6">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-caixa-formulario-cartao-6" />
                </label>
              </div>
            </div>


            <div class="file-row" data-doc="documentos-caixa-proposta-cartao-7" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-file-lines"></i> Proposta Cartão</span>
                <span class="file-row-desc">Proposta comercial vinculada ao cliente e assinada digitalmente.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-documentos-caixa-proposta-cartao-7" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-caixa-proposta-cartao-7">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-caixa-proposta-cartao-7" />
                </label>
              </div>
            </div>

          </div>

          <div class="section">
            <div class="section-title">
              <span>Documentos Agehab</span>
              <span class="pill"><span class="doc-counter">6</span> documentos</span>
            </div>
            <div class="section-summary">Padrões Agehab: assinaturas via GOV.BR ou Clicksign (quando aplicável).</div>


            <div class="file-row" data-doc="documentos-agehab-declaracao-de-endereco-1" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-house"></i> Declaração de endereço</span>
                <span class="file-row-desc">Quando necessário. Assinada via GOV.BR ou Clicksign.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-documentos-agehab-declaracao-de-endereco-1" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-agehab-declaracao-de-endereco-1">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-agehab-declaracao-de-endereco-1" />
                </label>
              </div>
            </div>


            <div class="file-row" data-doc="documentos-agehab-declaracao-renda-informal-2" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-money-bill-wave"></i> Declaração renda informal</span>
                <span class="file-row-desc">Assinada pelo dependente via GOV.BR/Clicksign (modelo Agehab).</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-documentos-agehab-declaracao-renda-informal-2" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-agehab-declaracao-renda-informal-2">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-agehab-declaracao-renda-informal-2" />
                </label>
              </div>
            </div>


            <div class="file-row" data-doc="documentos-agehab-declaracao-de-nao-renda-3" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-money-bill-wave"></i> Declaração de não renda</span>
                <span class="file-row-desc">Para dependentes sem renda. Assinada via GOV.BR/Clicksign.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-documentos-agehab-declaracao-de-nao-renda-3" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-agehab-declaracao-de-nao-renda-3">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-agehab-declaracao-de-nao-renda-3" />
                </label>
              </div>
            </div>


            <div class="file-row" data-doc="documentos-agehab-vinculo-3-anos-4" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-file-lines"></i> Vínculo ≥ 3 anos</span>
                <span class="file-row-desc">Docs com fé pública comprovando vínculo mínimo na cidade do Cheque Moradia.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-documentos-agehab-vinculo-3-anos-4" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-agehab-vinculo-3-anos-4">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-agehab-vinculo-3-anos-4" />
                </label>
              </div>
            </div>


            <div class="file-row" data-doc="documentos-agehab-checklist-agehab-5" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-list-check"></i> Checklist Agehab</span>
                <span class="file-row-desc">Preenchido e assinado GOV.BR (ou próprio punho conforme orientação).</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-documentos-agehab-checklist-agehab-5" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-agehab-checklist-agehab-5">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-agehab-checklist-agehab-5" />
                </label>
              </div>
            </div>


            <div class="file-row" data-doc="documentos-agehab-ficha-agehab-6" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-list-check"></i> Ficha Agehab</span>
                <span class="file-row-desc">Preenchida pelo Assistente de Crédito; assinada GOV.BR (ou próprio punho).</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-documentos-agehab-ficha-agehab-6" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-agehab-ficha-agehab-6">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-agehab-ficha-agehab-6" />
                </label>
              </div>
            </div>

          </div>

          <div class="section">
            <div class="section-title">
              <span>Relacionamento com o banco e produto</span>
              <span class="pill"><span class="doc-counter">8</span> confirmações</span>
            </div>
            <div class="section-summary">Confirmações operacionais registradas com Sim, Não ou N/A.</div>


            <div class="file-row" data-doc="relacionamento-com-o-banco-e-produto-cliente-ciente-da-portabilidade-para-a-agencia-cai-1" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-building-columns"></i> Cliente ciente da portabilidade para a agencia Caixa que vai assinar o contrato?</span>
                <span class="file-row-desc">Relacionamento Caixa</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-relacionamento-com-o-banco-e-produto-cliente-ciente-da-portabilidade-para-a-agencia-cai-1" title="Não enviado"></span>
                <select class="decision-select" data-decision-input="relacionamento-com-o-banco-e-produto-cliente-ciente-da-portabilidade-para-a-agencia-cai-1"><option value="">Selecione...</option><option>Sim</option><option>Não</option><option>N/A</option></select>
              </div>
            </div>


            <div class="file-row" data-doc="relacionamento-com-o-banco-e-produto-cliente-ciente-que-sera-preciso-fazer-open-finance-2" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-building-columns"></i> Cliente ciente que sera preciso fazer Open Finance com a agencia Caixa?</span>
                <span class="file-row-desc">Relacionamento Caixa</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-relacionamento-com-o-banco-e-produto-cliente-ciente-que-sera-preciso-fazer-open-finance-2" title="Não enviado"></span>
                <select class="decision-select" data-decision-input="relacionamento-com-o-banco-e-produto-cliente-ciente-que-sera-preciso-fazer-open-finance-2"><option value="">Selecione...</option><option>Sim</option><option>Não</option><option>N/A</option></select>
              </div>
            </div>


            <div class="file-row" data-doc="relacionamento-com-o-banco-e-produto-cliente-ciente-que-sera-necessario-cadastrar-o-cpf-3" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-id-card"></i> Cliente ciente que sera necessario cadastrar o CPF como Pix na agencia Caixa?</span>
                <span class="file-row-desc">Relacionamento Caixa</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-relacionamento-com-o-banco-e-produto-cliente-ciente-que-sera-necessario-cadastrar-o-cpf-3" title="Não enviado"></span>
                <select class="decision-select" data-decision-input="relacionamento-com-o-banco-e-produto-cliente-ciente-que-sera-necessario-cadastrar-o-cpf-3"><option value="">Selecione...</option><option>Sim</option><option>Não</option><option>N/A</option></select>
              </div>
            </div>


            <div class="file-row" data-doc="relacionamento-com-o-banco-e-produto-propos-e-orientou-o-cliente-sobre-o-fgts-futuro-4" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-money-bill-wave"></i> Propos e orientou o cliente sobre o FGTS Futuro?</span>
                <span class="file-row-desc">Obrigatorio quando o cliente entrar na regra de FGTS Futuro.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-relacionamento-com-o-banco-e-produto-propos-e-orientou-o-cliente-sobre-o-fgts-futuro-4" title="Não enviado"></span>
                <select class="decision-select" data-decision-input="relacionamento-com-o-banco-e-produto-propos-e-orientou-o-cliente-sobre-o-fgts-futuro-4"><option value="">Selecione...</option><option>Sim</option><option>Não</option><option>N/A</option></select>
              </div>
            </div>


            <div class="file-row" data-doc="relacionamento-com-o-banco-e-produto-cliente-autorizou-no-app-fgts-a-consulta-para-util-5" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-money-bill-wave"></i> Cliente autorizou no app FGTS a consulta para utilizar o FGTS Futuro?</span>
                <span class="file-row-desc">Obrigatorio quando o cliente entrar na regra de FGTS Futuro.</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-relacionamento-com-o-banco-e-produto-cliente-autorizou-no-app-fgts-a-consulta-para-util-5" title="Não enviado"></span>
                <select class="decision-select" data-decision-input="relacionamento-com-o-banco-e-produto-cliente-autorizou-no-app-fgts-a-consulta-para-util-5"><option value="">Selecione...</option><option>Sim</option><option>Não</option><option>N/A</option></select>
              </div>
            </div>


            <div class="file-row" data-doc="relacionamento-com-o-banco-e-produto-cliente-foi-orientado-sobre-o-produto-6" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-file-lines"></i> Cliente foi orientado sobre o produto?</span>
                <span class="file-row-desc">Produto</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-relacionamento-com-o-banco-e-produto-cliente-foi-orientado-sobre-o-produto-6" title="Não enviado"></span>
                <select class="decision-select" data-decision-input="relacionamento-com-o-banco-e-produto-cliente-foi-orientado-sobre-o-produto-6"><option value="">Selecione...</option><option>Sim</option><option>Não</option><option>N/A</option></select>
              </div>
            </div>


            <div class="file-row" data-doc="relacionamento-com-o-banco-e-produto-o-cliente-ja-pagou-o-produto-no-fechamento-7" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-file-lines"></i> O cliente ja pagou o produto no fechamento?</span>
                <span class="file-row-desc">Produto</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-relacionamento-com-o-banco-e-produto-o-cliente-ja-pagou-o-produto-no-fechamento-7" title="Não enviado"></span>
                <select class="decision-select" data-decision-input="relacionamento-com-o-banco-e-produto-o-cliente-ja-pagou-o-produto-no-fechamento-7"><option value="">Selecione...</option><option>Sim</option><option>Não</option><option>N/A</option></select>
              </div>
            </div>


            <div class="file-row" data-doc="relacionamento-com-o-banco-e-produto-cliente-saiu-ciente-que-na-assinatura-tera-que-ter-8" data-status="nao-enviado">
              <div class="file-row-main">
                <span class="file-row-title"><i class="fas fa-file-lines"></i> Cliente saiu ciente que na assinatura tera que ter R$ 300,00 para o produto?</span>
                <span class="file-row-desc">Produto</span>
              </div>
              <div class="file-row-actions">
                <span class="dot nao-enviado" id="dot-relacionamento-com-o-banco-e-produto-cliente-saiu-ciente-que-na-assinatura-tera-que-ter-8" title="Não enviado"></span>
                <select class="decision-select" data-decision-input="relacionamento-com-o-banco-e-produto-cliente-saiu-ciente-que-na-assinatura-tera-que-ter-8"><option value="">Selecione...</option><option>Sim</option><option>Não</option><option>N/A</option></select>
              </div>
            </div>

          </div>
    </div>
  </div>

  <div class="notification" id="notification">
    <i class="fas fa-check-circle"></i>
    <div>
      <strong id="notificationTitle">Documento anexado</strong>
      <div id="notificationText">Arquivo selecionado com sucesso.</div>
    </div>
  </div>`;

function safeFileName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'documento';
}

function getWorkflowKey(reserva: string) {
  return `maq2_workflow_docs_${reserva || 'sem-reserva'}`;
}

export default function ChecklistDocumentosForm() {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchParams = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const container = root;

    const params = new URLSearchParams(window.location.search);
    const reserva = params.get('reserva') || '';
    const workflowKey = getWorkflowKey(reserva);
    const isAnalistaView = window.location.pathname.includes('/analista');
    const uploadGrupo = window.location.pathname.includes('/gestor') ? 'gestor' : 'corretor';
    let notificationTimer = 0;
    let workflowState: Record<string, any> = {};

    const setInputValue = (id: string, value: string | null) => {
      const field = root.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`);
      if (field && value) field.value = value;
    };

    setInputValue('nomeCompleto', params.get('cliente'));
    setInputValue('numeroReserva', reserva);
    setInputValue('empreendimento', params.get('empreendimento'));
    setInputValue('corretor', params.get('corretor'));
    setInputValue('sinalOk', params.get('sinal'));
    setInputValue('fiadorOk', params.get('fiador'));
    setInputValue('produto', params.get('produto'));

    const notification = root.querySelector<HTMLElement>('#notification');
    const notificationTitle = root.querySelector<HTMLElement>('#notificationTitle');
    const notificationText = root.querySelector<HTMLElement>('#notificationText');
    const totalEnviados = root.querySelector<HTMLElement>('#totalEnviados');

    const showNotification = (title: string, text: string, duration = 2800) => {
      if (!notification || !notificationTitle || !notificationText) return;
      notificationTitle.textContent = title;
      notificationText.textContent = text;
      notification.classList.add('show');
      window.clearTimeout(notificationTimer);
      notificationTimer = window.setTimeout(() => notification.classList.remove('show'), duration);
    };

    const readWorkflowState = () => {
      return workflowState;
    };

    const writeWorkflowState = (state: Record<string, any>) => {
      workflowState = state;
      window.dispatchEvent(new CustomEvent('maq2-workflow-updated'));
    };

    const saveProcesso = async (encaminhadoAnalista = false) => {
      if (!reserva) return;
      const payload: Record<string, unknown> = {
        cliente: root.querySelector<HTMLInputElement>('#nomeCompleto')?.value || params.get('cliente'),
        empreendimento: root.querySelector<HTMLSelectElement>('#empreendimento')?.value || params.get('empreendimento'),
        corretor: root.querySelector<HTMLInputElement>('#corretor')?.value || params.get('corretor'),
        produto: root.querySelector<HTMLInputElement>('#produto')?.value || params.get('produto'),
        sinal: root.querySelector<HTMLInputElement>('#sinalOk')?.value || params.get('sinal'),
        fiador: root.querySelector<HTMLInputElement>('#fiadorOk')?.value || params.get('fiador'),
      };

      if (encaminhadoAnalista) {
        payload.encaminhado_analista = true;
      }

      const response = await fetch(apiUrl(`/api/processos/${encodeURIComponent(reserva)}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Nao foi possivel salvar o processo.');
      }
    };

    const updateTotal = () => {
      if (!totalEnviados) return;
      totalEnviados.textContent = String(root.querySelectorAll('.file-row[data-status="em-analise"], .file-row[data-status="aprovado"]').length);
    };
    const caixaStages = ['reserva', 'em_analise_credito', 'emitindo_formularios', 'formularios_em_assinatura', 'formularios_assinados', 'envio_conformidade'];
    const agehabStages = ['reserva', 'em_analise_credito', 'ficha_emitida', 'ficha_recebida', 'em_validacao_agehab', 'agehab_validada'];
    const paintTimeline = (selector: string, stages: string[], value?: string) => {
      const card = root.querySelector<HTMLElement>(selector);
      if (!card) return;
      const currentIndex = Math.max(0, stages.indexOf(value || 'reserva'));
      const dots = Array.from(card.querySelectorAll<HTMLElement>('.kit-dot'));
      dots.forEach((dot, index) => {
        dot.classList.toggle('done', index < currentIndex);
        dot.classList.toggle('active', index === currentIndex);
      });
      const fill = card.querySelector<HTMLElement>('.kit-progress-fill');
      if (fill) fill.style.width = `${((currentIndex + 1) / stages.length) * 100}%`;
    };

    const getDocTitle = (row: Element) => row.querySelector('.file-row-title')?.textContent?.replace(/\s+/g, ' ').trim() || row.getAttribute('data-doc') || 'Documento';
    const getDocCategory = (row: Element) => row.closest('.section')?.querySelector('.section-title')?.textContent?.replace(/\s+/g, ' ').trim() || 'Documento';
    const statusFromBackend = (status?: string) => {
      const normalized = (status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (normalized.includes('aprovado') || normalized.includes('nao se aplica')) return 'APROVADO';
      if (normalized.includes('pendente') || normalized.includes('bloqueado')) return 'PENDENTE';
      if (normalized.includes('analise') || normalized.includes('enviado')) return 'ENVIADO';
      return 'IDLE';
    };
    const formatPrazoPendencia = (valor?: string) => {
      if (!valor) return '';
      const data = new Date(valor);
      if (Number.isNaN(data.getTime())) return valor;
      return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };
    const isSafeFileUrl = (url?: string) => {
      if (!url) return false;
      try {
        const parsed = new URL(url, window.location.origin);
        return parsed.protocol === 'https:' || parsed.origin === window.location.origin;
      } catch {
        return false;
      }
    };

    const paintDocument = (row: HTMLElement, state?: any) => {
      const docId = row.dataset.doc || '';
      const dot = root.querySelector<HTMLElement>(`#dot-${CSS.escape(docId)}`);
      const button = root.querySelector<HTMLElement>(`#btn-${CSS.escape(docId)}`);
      if (!dot || !button) return;

      const status = state?.status || 'IDLE';
      row.querySelector('.pendency-note')?.remove();
      row.dataset.status = status === 'APROVADO' ? 'aprovado' : status === 'ENVIADO' || status === 'EM_ANALISE' ? 'em-analise' : 'nao-enviado';
      button.classList.remove('pending', 'uploaded', 'rejected');
      button.onclick = null;

      if (state?.observacao || state?.descricao || state?.prazo) {
        const desc = row.querySelector<HTMLElement>('.file-row-desc');
        const mensagem = state?.observacao || state?.descricao || 'Documento pendenciado pelo analista.';
        if (desc) {
          const note = document.createElement('span');
          note.className = 'pendency-note';
          note.innerHTML = `Pendencia: ${mensagem}${state?.prazo ? `<small>Prazo: ${formatPrazoPendencia(state.prazo)}</small>` : ''}`;
          desc.insertAdjacentElement('afterend', note);
        }
      }

      if (status === 'ENVIADO' || status === 'EM_ANALISE') {
        dot.className = 'dot em-analise';
        dot.title = 'Enviado para analise';
        button.classList.add('pending');
        if (isAnalistaView) {
          button.innerHTML = '<i class="fas fa-folder-open"></i> Abrir para analise';
          button.style.pointerEvents = '';
          button.removeAttribute('aria-disabled');
          button.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (isSafeFileUrl(state?.fileUrl)) {
              window.open(state.fileUrl, '_blank', 'noopener,noreferrer');
            } else {
              showNotification('Arquivo indisponivel', 'O documento foi enviado, mas o link do arquivo nao foi localizado.', 4200);
            }
          };
        } else {
          button.innerHTML = '<i class="fas fa-lock"></i> Enviado';
          button.style.pointerEvents = 'none';
          button.setAttribute('aria-disabled', 'true');
        }
        return;
      }

      if (status === 'APROVADO') {
        dot.className = 'dot aprovado';
        dot.title = 'Aprovado pelo analista';
        button.classList.add('uploaded');
        button.innerHTML = '<i class="fas fa-lock"></i> Aprovado';
        button.style.pointerEvents = 'none';
        button.setAttribute('aria-disabled', 'true');
        return;
      }

      if (status === 'PENDENTE') {
        dot.className = 'dot rejeitado';
        dot.title = state?.observacao || 'Pendenciado pelo analista';
        button.classList.add('rejected');
        button.style.pointerEvents = '';
        button.removeAttribute('aria-disabled');
        button.innerHTML = '<i class="fas fa-rotate"></i> Corrigir e reenviar <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="' + docId + '" />';
        wireInput(button.querySelector<HTMLInputElement>('input[data-doc-input]'));
        return;
      }

      dot.className = 'dot nao-enviado';
      dot.title = 'Nao enviado';
      button.style.pointerEvents = '';
      button.removeAttribute('aria-disabled');
      button.innerHTML = '<i class="fas fa-paperclip"></i> Anexar <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="' + docId + '" />';
      wireInput(button.querySelector<HTMLInputElement>('input[data-doc-input]'));
    };

    const uploadDocument = async (docId: string, file: File) => {
      if (!reserva) throw new Error('Reserva nao informada.');
      const formData = new FormData();
      const corretor = params.get('corretor') || 'corretor';
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '');
      const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : '';
      formData.append('grupo', uploadGrupo);
      formData.append('key', docId);
      formData.append('name', `${safeFileName(docId)}-${timestamp}-${safeFileName(corretor)}${extension}`);
      formData.append('file', file);

      const response = await fetch(apiUrl(`/api/processos/${encodeURIComponent(reserva)}/uploads`), {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || data.error || 'Falha ao enviar documento.');
      }
      return response.json();
    };

    function wireInput(input: HTMLInputElement | null) {
      if (!input || input.dataset.workflowWired === 'true') return;
      input.dataset.workflowWired = 'true';
      input.addEventListener('change', async (event) => {
        event.stopImmediatePropagation();
        const docId = input.dataset.docInput || '';
        const row = container.querySelector<HTMLElement>(`.file-row[data-doc="${CSS.escape(docId)}"]`);
        const file = input.files?.[0];
        if (!docId || !row || !file) return;

        const button = container.querySelector<HTMLElement>(`#btn-${CSS.escape(docId)}`);
        if (button) {
          button.classList.add('pending');
          button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        }
        showNotification('Salvando documento', 'Enviando arquivo para CCA e analista...', 6000);

        try {
          await saveProcesso();
          const uploadResult = await uploadDocument(docId, file);
          const state = readWorkflowState();
          state[docId] = {
            status: 'ENVIADO',
            nome: getDocTitle(row),
            categoria: getDocCategory(row),
            cliente: container.querySelector<HTMLInputElement>('#nomeCompleto')?.value || params.get('cliente') || 'Cliente',
            reserva,
            fileName: file.name,
            fileUrl: uploadResult.url || window.location.href,
            updatedAt: new Date().toISOString(),
          };
          writeWorkflowState(state);
          void fetch(apiUrl(`/api/processos/${encodeURIComponent(reserva)}/documentos/${encodeURIComponent(docId)}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Enviado', updated_by: 'corretor' }),
          });
          paintDocument(row, state[docId]);
          showNotification('Documento enviado', `${file.name} enviado para analise.`, 3200);
          updateTotal();
        } catch (error) {
          showNotification('Erro no envio', error instanceof Error ? error.message : 'Nao foi possivel enviar o documento.', 4200);
          paintDocument(row, readWorkflowState()[docId]);
        }
      }, true);
    }

    const applyWorkflowState = () => {
      root.querySelectorAll<HTMLElement>('.file-row[data-doc]').forEach((row) => paintDocument(row, workflowState[row.dataset.doc || '']));
      updateTotal();
    };

    const loadProcesso = async () => {
      if (!reserva) return;
      try {
        const response = await fetch(`/api/processos/${encodeURIComponent(reserva)}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`Erro ao carregar processo: ${response.status}`);
        }
        const data = await response.json();

        setInputValue('nomeCompleto', data.cliente || params.get('cliente'));
        setInputValue('empreendimento', data.empreendimento || params.get('empreendimento'));
        setInputValue('corretor', data.corretor || params.get('corretor'));
        setInputValue('produto', data.produto || params.get('produto'));
        setInputValue('sinalOk', data.sinal || params.get('sinal'));
        setInputValue('fiadorOk', data.fiador || params.get('fiador'));
        paintTimeline('.kit-caixa', caixaStages, data.caixa);
        paintTimeline('.kit-agehab', agehabStages, data.agehab);

        const state: Record<string, any> = {};
        Object.entries(data.uploadsEnviados || {}).forEach(([docId, enviado]) => {
          if (!enviado) return;
          const upload = data.uploadsCca?.[docId] || {};
          state[docId] = {
            ...(state[docId] || {}),
            status: 'ENVIADO',
            reserva,
            fileName: upload.name || state[docId]?.fileName,
            fileUrl: upload.data || state[docId]?.fileUrl,
            updatedAt: state[docId]?.updatedAt || new Date().toISOString(),
          };
        });
        Object.entries(data.documentos || {}).forEach(([docId, status]) => {
          const pendencia = data.pendencias?.[docId] || {};
          const temPendencia = Boolean(pendencia.descricao || pendencia.prazo);
          state[docId] = {
            ...(state[docId] || {}),
            status: temPendencia ? 'PENDENTE' : statusFromBackend(String(status)),
            reserva,
            observacao: pendencia.descricao || state[docId]?.observacao,
            prazo: pendencia.prazo || state[docId]?.prazo,
            updatedAt: state[docId]?.updatedAt || new Date().toISOString(),
          };
        });
        writeWorkflowState(state);
        applyWorkflowState();
      } catch (error) {
        console.error('[CHECKLIST_LOAD_ERROR]', error);
        showNotification('Atencao', 'Nao foi possivel carregar o checklist do banco.', 4200);
      }
    };

    const tipoDependente = root.querySelector<HTMLSelectElement>('#tipoDependente');
    const dependenteCasadoGroup = root.querySelector<HTMLElement>('#dependenteCasadoGroup');
    const dependenteCasado = root.querySelector<HTMLSelectElement>('#dependenteCasado');
    const tipoRenda = root.querySelector<HTMLSelectElement>('#tipoRenda');
    const btnSalvar = root.querySelector<HTMLButtonElement>('#btnSalvar');
    const btnAcompanhar = root.querySelector<HTMLButtonElement>('#btnAcompanhar');

    const onTipoDependente = () => {
      if (!tipoDependente || !dependenteCasadoGroup || !dependenteCasado) return;
      if (tipoDependente.value === 'filho_menor') {
        dependenteCasadoGroup.classList.add('hidden');
        dependenteCasado.value = 'nao';
      } else {
        dependenteCasadoGroup.classList.remove('hidden');
      }
    };
    const onTipoRenda = () => {
      if (!tipoRenda) return;
      root.querySelectorAll<HTMLElement>('[data-doc*="nao-renda"], [data-doc*="declaracao-renda-informal"]').forEach((row) => {
        if (tipoRenda.value === 'informal') row.classList.remove('hidden');
      });
    };
    const onSalvar = () => {
      const originalText = btnSalvar?.innerHTML || '';
      if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
      }

      saveProcesso(true)
        .then(() => showNotification('Dados salvos', 'Cadastro enviado para a tela do analista.'))
        .catch(() => showNotification('Erro', 'Nao foi possivel salvar no banco.', 4200))
        .finally(() => {
          if (btnSalvar) {
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = originalText;
          }
        });
    };
    const onAcompanhar = () => { window.location.href = '/corretor'; };

    tipoDependente?.addEventListener('change', onTipoDependente);
    tipoRenda?.addEventListener('change', onTipoRenda);
    btnSalvar?.addEventListener('click', onSalvar);
    btnAcompanhar?.addEventListener('click', onAcompanhar);
    root.querySelectorAll<HTMLInputElement>('input[data-doc-input]').forEach(wireInput);
    saveProcesso().catch(() => undefined);
    loadProcesso();
    window.addEventListener('focus', loadProcesso);
    window.addEventListener('maq2-workflow-updated', applyWorkflowState);

    return () => {
      window.clearTimeout(notificationTimer);
      tipoDependente?.removeEventListener('change', onTipoDependente);
      tipoRenda?.removeEventListener('change', onTipoRenda);
      btnSalvar?.removeEventListener('click', onSalvar);
      btnAcompanhar?.removeEventListener('click', onAcompanhar);
      window.removeEventListener('focus', loadProcesso);
      window.removeEventListener('maq2-workflow-updated', applyWorkflowState);
    };
  }, [searchParams]);

  return (
    <>
      <style>{`@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');\n${checklistCss}`}</style>
      <div ref={rootRef} dangerouslySetInnerHTML={{ __html: checklistMarkup }} />
    </>
  );
}
