'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
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
      display: block;
      padding: 14px 16px 14px 14px;
      border: 1px solid rgba(148, 163, 184, .24);
      border-left: 4px solid #cbd5e1;
      border-radius: 12px;
      background: #ffffff;
      margin-bottom: 12px;
      transition: var(--transition);
    }
    .file-row[data-status="pendenciado"] { border-left-color: #ef4444; }
    .file-row[data-status="enviado"] { border-left-color: #0ea5e9; }
    .file-row[data-status="aprovado"] { border-left-color: #22c55e; }
    .file-row[data-status="em-analise"] { border-left-color: #f59e0b; }

    .file-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 18px;
      align-items: start;
    }

    .file-info {
      min-width: 0;
    }

    .file-row-title {
      color: #0f172a;
      font-size: 0.88rem;
      font-weight: 900;
      display: block;
      gap: 8px;
    }

    .file-row-title i {
      color: var(--accent);
    }

    .file-row-desc {
      display: block;
      margin-top: 4px;
      font-size: 0.75rem;
      color: #475569;
      line-height: 1.35;
    }

    .file-upload-action {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      font-size: 0.75rem;
    }

    .btn-upload {
      border-radius: 999px;
      min-height: 34px;
      padding: 0 13px;
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
      white-space: nowrap;
    }

    .btn-upload:hover {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.3));
      border-color: var(--accent);
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
      padding: 20px 22px;
      box-shadow: var(--shadow);
    }
    .kit-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 18px;
    }
    .kit-header h2 {
      margin: 0;
      color: #0f172a;
      font-size: 1rem;
      letter-spacing: .1em;
      font-weight: 900;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .kit-status-badge {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid rgba(14, 165, 233, .26);
      background: rgba(14, 165, 233, .09);
      color: #075985;
      font-size: .72rem;
      font-weight: 900;
      white-space: nowrap;
    }
    .kit-agehab .kit-status-badge {
      border-color: rgba(245, 158, 11, .28);
      background: rgba(245, 158, 11, .12);
      color: #92400e;
    }
    .kit-stepper {
      position: relative;
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      margin-bottom: 14px;
      padding-top: 4px;
    }
    .kit-stepper::before {
      content: "";
      position: absolute;
      left: calc(8.33% + 10px);
      right: calc(8.33% + 10px);
      top: 14px;
      height: 3px;
      background: #dbe4ef;
      border-radius: 999px;
    }
    .kit-progress-fill {
      position: absolute;
      left: calc(8.33% + 10px);
      top: 14px;
      display: block;
      width: 0;
      max-width: calc(83.33% - 20px);
      height: 3px;
      border-radius: 999px;
      background: #22c55e;
      transition: width .25s ease;
    }
    .kit-step {
      position: relative;
      z-index: 1;
      min-width: 0;
      width: 100%;
      display: grid;
      justify-items: center;
      gap: 8px;
      color: #64748b;
      font-size: .68rem;
      font-weight: 800;
      text-align: center;
      line-height: 1.15;
    }
    .kit-dot {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #ffffff;
      border: 2px solid #cbd5e1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: .58rem;
      font-weight: 900;
    }
    .kit-step.done {
      color: #0f172a;
    }
    .kit-step.done .kit-dot {
      border-color: #22c55e;
      background: #22c55e;
    }
    .kit-step.active {
      color: #0f172a;
      font-weight: 900;
    }
    .kit-step.active .kit-dot {
      border-color: transparent;
      box-shadow: 0 0 0 7px rgba(14, 165, 233, .14);
      background: #0ea5e9;
    }
    .kit-agehab .kit-step.active .kit-dot {
      box-shadow: 0 0 0 10px rgba(245, 158, 11, .16);
      background: #f59e0b;
    }
    .kit-step-label {
      display: block;
      width: 64px;
      max-width: calc(100% - 4px);
      font-size: 11px;
      line-height: 1.18;
      text-align: center;
      white-space: normal;
      overflow-wrap: break-word;
      word-break: keep-all;
    }
    .kit-stage-description {
      margin: 12px 0 0;
      color: #334155;
      font-size: .86rem;
      font-weight: 800;
      line-height: 1.4;
    }
    .dados-proponente-card {
      max-width: none;
    }
    .header-card {
      padding: 16px 20px;
      border-radius: 16px;
      background: #ffffff;
      border: 1px solid rgba(148, 163, 184, 0.28);
      box-shadow: 0 12px 26px rgba(15, 23, 42, 0.07);
    }
    .dados-proponente-card > h2,
    .dados-proponente-card > small {
      display: none;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
      margin-bottom: 12px;
    }
    .header-title {
      margin: 0;
      font-size: 24px;
      line-height: 1.1;
      font-weight: 900;
      letter-spacing: 0;
      text-transform: none;
      color: #0f172a;
    }
    .header-subtitle {
      margin: 4px 0 0;
      font-size: 13px;
      color: #475569;
      line-height: 1.35;
      font-weight: 700;
    }
    .header-badge {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      padding: 0 10px;
      border-radius: 999px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #475569;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .08em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .dados-proponente-card .section {
      margin-top: 0;
      padding-top: 0;
      border-top: 0;
    }
    .dados-proponente-card .section:first-of-type {
      border-top: 0;
    }
    .dados-proponente-card .section-title {
      display: none;
    }
    .executive-title-input,
    .executive-meta-field input {
      width: 100%;
      height: auto;
      min-height: 0;
      padding: 0;
      border: 0;
      background: transparent;
      box-shadow: none;
      border-radius: 0;
      pointer-events: none;
    }
    .executive-title-input {
      color: #0f172a;
      font-size: 30px;
      line-height: 1.12;
      font-weight: 900;
      letter-spacing: -0.01em;
    }
    .executive-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      color: #475569;
      font-size: 13px;
      font-weight: 700;
    }
    .executive-meta-field {
      display: inline-flex;
      align-items: center;
      min-width: 0;
    }
    .executive-meta-field input {
      display: inline-block;
      width: auto;
      max-width: 190px;
      color: #475569;
      font: inherit;
      opacity: .92;
    }
    .executive-meta-separator {
      color: #94a3b8;
    }
    .status-strip {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin: 10px 0 12px;
    }
    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 28px;
      padding: 0 10px;
      border-radius: 999px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #334155;
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
    }
    .status-chip::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
    }
    .status-chip[data-status-kind="caixa"]::before {
      background: #0ea5e9;
    }
    .status-chip[data-status-kind="agehab"]::before {
      background: #f59e0b;
    }
    .status-chip input {
      display: inline;
      width: auto;
      max-width: 110px;
      height: auto;
      min-height: 0;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      pointer-events: none;
      box-shadow: none;
      border-radius: 0;
    }
    .editable-grid,
    .dados-proponente-card .form-grid {
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px 12px;
    }
    .dados-proponente-card label {
      display: block;
      margin-bottom: 4px;
      color: #334155;
      font-size: 10px;
      line-height: 1.2;
      font-weight: 900;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .dados-proponente-card input,
    .dados-proponente-card select {
      width: 100%;
      height: 44px;
      min-height: 0;
      padding: 0 12px;
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      box-sizing: border-box;
    }
    .dados-proponente-card .executive-title-input {
      height: auto;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: #0f172a;
      font-size: 30px;
      line-height: 1.12;
      font-weight: 900;
      letter-spacing: -0.01em;
      box-shadow: none;
    }
    .dados-proponente-card .executive-meta-field input,
    .dados-proponente-card .status-chip input {
      width: auto;
      height: auto;
      min-height: 0;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      box-shadow: none;
      pointer-events: none;
    }
    .dados-proponente-card .hint {
      display: none;
    }
    .dados-proponente-card > .section:nth-of-type(2),
    .dados-proponente-card .dados-actions {
      display: none;
    }
    .header-actions {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-top: 14px;
    }
    .header-actions .btn-primary {
      min-width: 0;
      width: 100%;
      min-height: 44px;
    }
    .header-actions #btnAcompanhar {
      background: #ffffff;
      color: #0f172a;
      border: 1px solid var(--border);
      box-shadow: none;
    }
    .header-actions #btnProcessChat {
      background: #ffffff;
      color: #0f172a;
      border: 1px solid var(--border);
      box-shadow: none;
    }
    @media (max-width: 1100px) {
      .editable-grid,
      .dados-proponente-card .form-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (max-width: 700px) {
      .kit-timeline-grid { grid-template-columns: 1fr; }
      .kit-header { flex-direction: column; gap: 10px; }
      .kit-stepper { grid-template-columns: repeat(3, minmax(0, 1fr)); row-gap: 18px; }
      .kit-stepper::before,
      .kit-progress-fill { display: none; }
      .header-top { flex-direction: column; }
      .editable-grid,
      .header-actions,
      .dados-proponente-card .form-grid { grid-template-columns: 1fr; }
      .header-card { padding: 14px; border-radius: 14px; }
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
    .analyst-review {
      margin-top: 12px;
      max-width: 780px;
    }
    .review-fields {
      display: grid;
      grid-template-columns: minmax(160px, 220px) minmax(240px, 1fr) minmax(170px, 210px);
      gap: 10px 12px;
      align-items: end;
    }
    .review-fields [data-pendency-box] {
      display: contents;
    }
    .document-body [data-pendency-box] {
      display: contents;
    }
    .review-fields [data-pendency-box][hidden] {
      display: none;
    }
    .document-body [data-pendency-box][hidden] {
      display: none;
    }
    .analyst-review select,
    .analyst-review input,
    .analyst-review textarea {
      width: 100%;
      border: 1px solid rgba(15, 23, 42, .14);
      border-radius: 12px;
      background: #fff;
      color: #0f172a;
      padding: 8px 10px;
      font: inherit;
      font-size: .82rem;
      box-sizing: border-box;
    }
    .review-field {
      min-width: 0;
    }
    .review-field label {
      display: block;
      margin-bottom: 5px;
      color: #475569;
      font-size: 10px;
      line-height: 1;
      font-weight: 900;
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    .analyst-review textarea {
      min-height: 78px;
      resize: vertical;
      overflow: hidden;
    }
    .review-field-observation {
      grid-column: span 2;
    }
    .review-actions {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 2px;
    }
    .analyst-review button {
      width: auto;
      box-sizing: border-box;
      min-height: 34px;
      padding: 0 14px;
      border: 0;
      border-radius: 999px;
      background: #16a34a;
      color: #fff;
      font-weight: 900;
      cursor: pointer;
      white-space: nowrap;
    }
    .document-actions > button {
      width: auto;
      box-sizing: border-box;
      min-height: 34px;
      padding: 0 14px;
      border: 0;
      border-radius: 999px;
      background: #16a34a;
      color: #fff;
      font-weight: 900;
      cursor: pointer;
      white-space: nowrap;
    }
    .file-upload-action { min-width: 145px; }
    .document-card {
      padding: 18px 24px;
      border-radius: 18px;
      border: 1px solid #dbe3ef;
      border-left: 5px solid #ef4444;
      background: #fff;
    }
    .document-inner {
      max-width: 1180px;
      margin: 0 auto;
    }
    .document-card[data-status="pendenciado"] { border-left-color: #ef4444; }
    .document-card[data-status="enviado"] { border-left-color: #0ea5e9; }
    .document-card[data-status="aprovado"] { border-left-color: #22c55e; }
    .document-card[data-status="em-analise"] { border-left-color: #f59e0b; }
    .document-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 18px;
    }
    .document-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 800;
    }
    .document-desc {
      margin-top: 6px;
      color: #475569;
      line-height: 1.4;
    }
    .document-status-badge {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #334155;
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
    }
    .document-table-mode .section {
      padding: 14px;
      overflow: visible;
    }
    .document-table-mode .section-title {
      margin-bottom: 4px;
    }
    .document-table-mode .section-summary {
      margin-bottom: 10px;
    }
    .document-table-wrap {
      width: 100%;
      overflow-x: auto;
      overflow-y: visible;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
    }
    .document-table-header,
    .document-table-mode .file-header {
      min-width: 1040px;
      display: grid;
      grid-template-columns: minmax(190px, 1.35fr) minmax(280px, 1.75fr) 105px 120px 155px 165px minmax(292px, 292px);
      align-items: center;
      gap: 0;
    }
    .document-table-header {
      position: sticky;
      top: 0;
      z-index: 3;
      background: #f8fafc;
      border-bottom: 1px solid #dbe3ee;
      color: #475569;
      font-size: .68rem;
      font-weight: 800;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .document-table-header > span,
    .document-table-cell {
      min-height: 42px;
      padding: 9px 10px;
      border-right: 1px solid #edf2f7;
      display: flex;
      align-items: center;
      min-width: 0;
    }
    .document-table-header > span:last-child,
    .document-table-cell:last-child {
      border-right: 0;
    }
    .document-table-mode .file-row {
      display: block;
      padding: 0;
      margin: 0;
      border: 0;
      border-radius: 0;
      border-left: 0;
      background: #fff;
      border-bottom: 1px solid #eef2f7;
    }
    .document-table-mode .file-row:hover {
      background: #f8fafc;
    }
    .document-table-mode .file-row:last-child {
      border-bottom: 0;
    }
    .document-table-mode .file-info {
      display: flex;
      align-items: center;
    }
    .document-table-mode .file-row-title {
      font-size: .78rem;
      line-height: 1.25;
      font-weight: 800;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .document-table-mode .file-row-title i {
      display: none;
    }
    .document-table-mode .file-row-desc {
      margin: 0;
      font-size: .72rem;
      line-height: 1.3;
      color: #475569;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      white-space: normal;
    }
    .document-table-mode .file-row-desc.is-expanded {
      display: block;
      overflow: visible;
    }
    .doc-description-cell {
      align-items: flex-start;
      flex-direction: column;
      gap: 4px;
    }
    .doc-description-toggle {
      border: 0;
      background: transparent;
      color: #2563eb;
      font-size: .7rem;
      font-weight: 700;
      padding: 0;
      cursor: pointer;
    }
    .doc-muted {
      color: #64748b;
      font-size: .74rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .doc-status-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      min-width: fit-content;
      padding: 10px 14px;
      font-size: .64rem;
      font-weight: 900;
      line-height: 1;
      box-sizing: border-box;
      letter-spacing: .03em;
      text-transform: uppercase;
      white-space: nowrap;
      border: 1px solid #cbd5e1;
      color: #475569;
      background: #f8fafc;
    }
    .doc-status-pill.status-em-analise,
    .doc-status-pill.status-enviado {
      background: #fff7ed;
      border-color: #fed7aa;
      color: #9a3412;
    }
    .doc-status-pill.status-pendente,
    .doc-status-pill.status-pendenciado {
      background: #fef2f2;
      border-color: #fecaca;
      color: #991b1b;
    }
    .doc-status-pill.status-aprovado {
      background: #ecfdf5;
      border-color: #bbf7d0;
      color: #166534;
    }
    .doc-status-pill.status-reprovado {
      background: #f1f5f9;
      border-color: #cbd5e1;
      color: #0f172a;
    }
    .doc-deadline-cell {
      align-items: flex-start;
      flex-direction: column;
      gap: 4px;
    }
    .doc-deadline-badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      border: 1px solid #cbd5e1;
      padding: 4px 8px;
      font-size: .64rem;
      font-weight: 900;
      white-space: nowrap;
      background: #f8fafc;
      color: #475569;
    }
    .doc-deadline-badge.deadline-ok {
      background: #ecfdf5;
      border-color: #bbf7d0;
      color: #166534;
    }
    .doc-deadline-badge.deadline-near {
      background: #fefce8;
      border-color: #fde68a;
      color: #854d0e;
    }
    .doc-deadline-badge.deadline-late {
      background: #fef2f2;
      border-color: #fecaca;
      color: #991b1b;
    }
    .doc-options-cell {
      justify-content: flex-start;
      gap: 8px;
      overflow: visible;
      min-width: 292px;
      flex-wrap: nowrap;
    }
    .doc-action-menu {
      position: relative;
    }
    .doc-action-trigger,
    .document-table-mode .btn-upload {
      min-width: fit-content;
      min-height: 38px;
      border-radius: 6px;
      padding: 10px 14px;
      font-size: .72rem;
      font-weight: 800;
      line-height: 1;
      box-sizing: border-box;
      border: 1px solid #cbd5e1;
      background: #fff;
      color: #0f172a;
      box-shadow: none;
      white-space: nowrap;
      overflow: visible;
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .doc-action-trigger {
      min-width: 92px;
      cursor: pointer;
    }
    .document-table-mode .btn-upload {
      min-width: 150px;
    }
    .doc-action-trigger i,
    .document-table-mode .btn-upload i,
    .doc-status-pill i {
      flex-shrink: 0;
    }
    .doc-action-dropdown {
      position: absolute;
      right: 0;
      top: calc(100% + 6px);
      min-width: 190px;
      padding: 6px;
      border: 1px solid #dbe3ee;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 18px 35px rgba(15, 23, 42, .16);
      z-index: 50;
      display: none;
    }
    .doc-action-menu.is-open .doc-action-dropdown {
      display: block;
    }
    .doc-action-dropdown button {
      width: 100%;
      border: 0;
      background: transparent;
      border-radius: 6px;
      padding: 8px 9px;
      text-align: left;
      font-size: .75rem;
      color: #334155;
      cursor: pointer;
    }
    .doc-action-dropdown button:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .document-table-mode .analyst-review {
      margin: 0;
      border: 0;
      border-top: 1px solid #e2e8f0;
      border-radius: 0;
      background: #fbfdff;
      padding: 12px;
      max-width: none;
    }
    .document-table-mode .analyst-review[hidden] {
      display: none;
    }
    .relationship-table .document-table-header,
    .relationship-table .file-header {
      min-width: 820px;
      grid-template-columns: minmax(230px, 1.5fr) minmax(260px, 1.5fr) 110px 150px 170px;
    }
    .relationship-table .file-row-title {
      font-weight: 900;
    }
    .relationship-table .file-row-desc {
      font-size: .7rem;
      -webkit-line-clamp: 3;
    }
    .relationship-response-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: fit-content;
      border-radius: 999px;
      border: 1px solid #fde68a;
      background: #fefce8;
      color: #854d0e;
      padding: 10px 14px;
      font-size: .64rem;
      font-weight: 900;
      line-height: 1;
      white-space: nowrap;
      box-sizing: border-box;
    }
    .relationship-response-pill.response-sim {
      border-color: #bbf7d0;
      background: #ecfdf5;
      color: #166534;
    }
    .relationship-response-pill.response-nao {
      border-color: #fecaca;
      background: #fef2f2;
      color: #991b1b;
    }
    .relationship-response-pill.response-na {
      border-color: #cbd5e1;
      background: #f8fafc;
      color: #475569;
    }
    .relationship-actions-cell {
      gap: 8px;
      overflow: visible;
    }
    .relationship-answer-menu {
      position: relative;
    }
    .relationship-answer-trigger,
    .relationship-answer-dropdown button {
      min-width: 112px;
      min-height: 38px;
      border-radius: 6px;
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      background: #fff;
      color: #0f172a;
      font-size: .72rem;
      font-weight: 800;
      line-height: 1;
      box-sizing: border-box;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
    }
    .relationship-answer-dropdown {
      position: absolute;
      right: 0;
      top: calc(100% + 6px);
      display: none;
      min-width: 132px;
      padding: 6px;
      border: 1px solid #dbe3ee;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 18px 35px rgba(15, 23, 42, .16);
      z-index: 50;
    }
    .relationship-answer-menu.is-open .relationship-answer-dropdown {
      display: grid;
      gap: 4px;
    }
    .relationship-native-select {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }
    .document-body {
      display: grid;
      grid-template-columns: 320px 520px;
      gap: 24px;
      align-items: start;
    }
    .document-left,
    .document-right {
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-width: 0;
    }
    .document-field label {
      display: block;
      margin-bottom: 8px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      color: #475569;
      letter-spacing: .05em;
    }
    .document-field select,
    .document-field textarea,
    .document-field input {
      width: 100%;
      min-height: 48px;
      box-sizing: border-box;
    }
    .document-field textarea {
      min-height: 110px;
      resize: vertical;
    }
    .document-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      margin-top: 0;
    }
    .upload-action {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .upload-action .dot {
      order: -1;
    }
    .doc-chat-count {
      margin-left: 6px;
      color: #0f172a;
    }
    .doc-chat-panel {
      max-width: 1180px;
      margin: 12px auto 0;
      border: 1px solid #dbe3ef;
      border-radius: 14px;
      background: #f8fafc;
      padding: 12px;
    }
    .doc-chat-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 260px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .doc-chat-empty {
      color: #64748b;
      font-size: .82rem;
      font-weight: 800;
    }
    .doc-chat-message {
      max-width: 72%;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
      padding: 8px 10px;
      color: #0f172a;
      font-size: .82rem;
      line-height: 1.35;
    }
    .doc-chat-message.mine {
      align-self: flex-end;
      background: #ecfdf5;
      border-color: #bbf7d0;
    }
    .doc-chat-meta {
      display: block;
      margin-bottom: 4px;
      color: #64748b;
      font-size: .68rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    .doc-chat-compose {
      display: grid;
      grid-template-columns: 180px minmax(0, 1fr) auto;
      gap: 10px;
      margin-top: 10px;
      align-items: end;
    }
    .doc-chat-compose select,
    .doc-chat-compose textarea {
      width: 100%;
      box-sizing: border-box;
      color: #0f172a;
      background: #fff;
      font: inherit;
      font-size: .82rem;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
    }
    .doc-chat-compose select {
      min-height: 46px;
      padding: 0 11px;
      font-weight: 900;
    }
    .doc-chat-compose textarea {
      min-height: 46px;
      max-height: 120px;
      resize: vertical;
      padding: 9px 11px;
    }
    .doc-chat-compose button {
      min-height: 42px;
      padding: 0 14px;
      border: 0;
      border-radius: 999px;
      background: #0f172a;
      color: #fff;
      font-weight: 900;
      cursor: pointer;
    }
    .document-actions .analyst-review button {
      width: auto;
    }
    .section-summary { color: var(--text-soft); font-size: .78rem; }
    .doc-counter { color: var(--accent); font-weight: 700; }
    .btn-upload input[type="file"] { display: none; }
    @media (max-width: 1000px) {
      .document-body {
        grid-template-columns: 1fr;
      }

      .document-actions {
        justify-content: stretch;
      }

      .document-actions button,
      .document-actions label {
        flex: 1;
      }
      .doc-chat-compose { grid-template-columns: 1fr; }
      .doc-chat-message { max-width: 100%; }
    }
    @media (max-width: 700px) {
      .file-header { grid-template-columns: 1fr; }
      .file-upload-action { width: 100%; justify-content: flex-start; }
      .analyst-review { max-width: 100%; }
      .review-fields { grid-template-columns: 1fr; }
      .review-field-observation { grid-column: auto; }
      .review-actions { justify-content: flex-start; flex-wrap: wrap; }
      .btn-upload { flex: 1; justify-content: center; }
    }`;

type KitStep = {
  key: string;
  label: string;
};

type TimelineCardProps = {
  tone: 'caixa' | 'agehab';
  title: string;
  steps: KitStep[];
  currentStep: string;
  description: string;
};

const caixaTimelineSteps: KitStep[] = [
  { key: 'reserva', label: 'Recebido' },
  { key: 'em_analise_credito', label: 'Conferência' },
  { key: 'emitindo_formularios', label: 'Emitir Formulários' },
  { key: 'formularios_em_assinatura', label: 'Formulários Anexos' },
  { key: 'formularios_assinados', label: 'Formulários Assinados' },
  { key: 'envio_conformidade', label: 'Envio Conformidade' },
];

const agehabTimelineSteps: KitStep[] = [
  { key: 'reserva', label: 'Recebido' },
  { key: 'em_analise_credito', label: 'Análise' },
  { key: 'ficha_emitida', label: 'Critérios' },
  { key: 'ficha_recebida', label: 'Ficha' },
  { key: 'em_validacao_agehab', label: 'Envio' },
  { key: 'agehab_validada', label: 'Finalizado' },
];

const renderTimelineCard = ({ tone, title, steps, currentStep, description }: TimelineCardProps) => {
  const activeIndex = Math.max(0, steps.findIndex((step) => step.key === currentStep));
  const activeLabel = steps[activeIndex]?.label || steps[0]?.label || 'Recebido';
  const progress = steps.length > 1 ? (activeIndex / (steps.length - 1)) * 100 : 0;

  return String.raw`<div class="kit-timeline-card kit-${tone}" data-timeline="${tone}" data-current-stage="${currentStep}">
        <div class="kit-header">
          <h2>${title}</h2>
          <span class="kit-status-badge" data-stage-badge="${tone}">${activeLabel}</span>
        </div>
        <div class="kit-stepper" role="list" aria-label="${title}">
          <span class="kit-progress-fill" data-stage-progress="${tone}" style="width:${progress}%"></span>
          ${steps.map((step, index) => {
            const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending';
            const dotText = state === 'done' ? '✓' : String(index + 1);
            return String.raw`<div class="kit-step ${state}" data-stage="${step.key}" data-state="${state}" role="listitem">
            <span class="kit-dot" aria-hidden="true">${dotText}</span>
            <span class="kit-step-label">${step.label}</span>
          </div>`;
          }).join('')}
        </div>
        <p class="kit-stage-description" data-stage-description="${tone}">${description}</p>
      </div>`;
};

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
      ${renderTimelineCard({
        tone: 'caixa',
        title: 'KIT CAIXA',
        steps: caixaTimelineSteps,
        currentStep: 'reserva',
        description: 'Cliente em reserva. Aguardando inicio da analise de credito.',
      })}
      ${renderTimelineCard({
        tone: 'agehab',
        title: 'KIT AGEHAB',
        steps: agehabTimelineSteps,
        currentStep: 'reserva',
        description: 'Cliente em reserva. Aguardando inicio da analise de credito.',
      })}
    </div>


    <div class="card dados-proponente-card header-card">
      <h2><i class="fas fa-user-circle"></i> Dados do Proponente & Dependentes</h2>
      <small>Preencha os dados básicos. Informações sensíveis (CPF, telefone, etc.) continuam apenas no CRM.</small>

      <div class="section">
        <div class="header-top">
          <div>
            <h2 class="header-title">Proponente</h2>
            <p class="header-subtitle">Identificação e dados comerciais do processo</p>
          </div>
          <span class="header-badge">Identificação do processo</span>
        </div>

        <div class="header-top">
          <div>
            <input class="executive-title-input" type="text" id="nomeCompleto" placeholder="Nome do proponente" />
            <div class="executive-meta">
              <span>Reserva #</span><span class="executive-meta-field"><input type="text" id="numeroReserva" placeholder="458712" readonly /></span>
              <span class="executive-meta-separator">-</span>
              <span>Produto</span><span class="executive-meta-field"><input type="text" id="produto" value="PP" readonly /></span>
              <span class="executive-meta-separator">-</span>
              <span>Corretor</span><span class="executive-meta-field"><input type="text" id="corretor" placeholder="Nome do corretor" /></span>
            </div>
          </div>
        </div>

        <div class="status-strip" aria-label="Status operacional">
          <span class="status-chip" data-status-kind="sinal">Sinal <input type="text" id="sinalOk" value="Nao tem" readonly /></span>
          <span class="status-chip" data-status-kind="fiador">Fiador <input type="text" id="fiadorOk" value="Nao tem" readonly /></span>
          <span class="status-chip" data-status-kind="caixa">Caixa <select id="caixaStatus"><option value="reserva">Recebido</option><option value="em_analise_credito">Conferência</option><option value="emitindo_formularios">Emitir Formulários</option><option value="formularios_em_assinatura">Formulários Anexos</option><option value="formularios_assinados">Formulários Assinados</option></select></span>
          <span class="status-chip" data-status-kind="agehab">Agehab <select id="agehabStatus"><option value="reserva">Recebido</option><option value="em_analise_credito">Análise</option><option value="ficha_emitida">Critérios</option><option value="ficha_recebida">Ficha</option><option value="em_validacao_agehab">Envio</option><option value="agehab_validada">Finalizado</option></select></span>
          <span class="status-chip" data-status-kind="caixa" data-cca-conformidade-chip hidden>Conformidade <input type="checkbox" id="ccaEnviadoConformidade" /> Enviado</span>
        </div>

        <div class="form-grid editable-grid">
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

          <div class="form-group">
            <label>Tipo de dependente</label>
            <select id="tipoDependente">
              <option value="">Nao definido</option>
              <option value="filho_menor">Filho menor</option>
              <option value="filho_maior">Filho maior</option>
              <option value="parente">Parente ate 3 grau</option>
            </select>
          </div>

          <div class="form-group" id="dependenteCasadoGroup">
            <label>Dependente casado?</label>
            <select id="dependenteCasado">
              <option value="nao" selected>Nao</option>
              <option value="sim">Sim</option>
            </select>
          </div>
        </div>      </div>

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

      <div class="header-actions">
        <button class="btn-primary" id="btnSalvar">
          <i class="fas fa-save"></i> Salvar
        </button>
        <button class="btn-primary" id="btnAcompanhar">
          <i class="fas fa-list"></i> Acompanhamento
        </button>
        <button class="btn-primary" id="btnProcessChat">
          <i class="fas fa-comments"></i> Chat CCA <span class="doc-chat-count"></span>
        </button>
      </div>
    </div>

    <div class="card checklist-only-card">
      <h2><i class="fas fa-list-check"></i> Conferência e envio do checklist</h2>
      <small>Somente tipo de documento, descrição, indicador visual e botão de upload. Sem os campos extras do painel do analista.</small>
      <div data-kit-caixa-download-slot></div>

          <div class="section">
            <div class="section-title">
              <span>Documentos do Proponente</span>
              <span class="pill"><span class="doc-counter">6</span> documentos</span>
            </div>
            <div class="section-summary">Base do dossiê do proponente (identidade, estado civil, residência, etc.).</div>


            <div class="file-row document-card" data-doc="documentos-do-proponente-identidade-e-cpf-1" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-id-card"></i> Identidade e CPF</span>
                <span class="file-row-desc document-desc">CNH, RG, Identidade Militar, Passaporte brasileiro ou carteira funcional com fé pública (dentro da validade) do proponente.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-do-proponente-identidade-e-cpf-1" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-do-proponente-identidade-e-cpf-1">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-do-proponente-identidade-e-cpf-1" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-do-proponente-comp-de-estado-civil-2" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-heart"></i> Comp. de estado civil</span>
                <span class="file-row-desc document-desc">Certidão de nascimento.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-do-proponente-comp-de-estado-civil-2" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-do-proponente-comp-de-estado-civil-2">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-do-proponente-comp-de-estado-civil-2" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-do-proponente-comprovante-de-residencia-3" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-house"></i> Comprovante de residência</span>
                <span class="file-row-desc document-desc">Comprovante aberto; não precisa estar no nome do cliente.
Água, luz, telefone, internet, celular, cartão de crédito.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-do-proponente-comprovante-de-residencia-3" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-do-proponente-comprovante-de-residencia-3">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-do-proponente-comprovante-de-residencia-3" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-do-proponente-irpf-recibo-4" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-file-lines"></i> IRPF + recibo</span>
                <span class="file-row-desc document-desc">Declaração completa do ano atual + recibo de entrega + DARF pago (se houver).
⚠️ Somente se perfil = INFORMAL e IRPF para informal = SIM.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-do-proponente-irpf-recibo-4" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-do-proponente-irpf-recibo-4">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-do-proponente-irpf-recibo-4" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-do-proponente-extrato-fgts-5" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-money-bill-wave"></i> Extrato FGTS</span>
                <span class="file-row-desc document-desc">App FGTS / site Caixa / agência.
Militar/soldado: anexar também 3 últimos extratos bancários da conta salário.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-do-proponente-extrato-fgts-5" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-do-proponente-extrato-fgts-5">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-do-proponente-extrato-fgts-5" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-do-proponente-ctps-carteira-6" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-file-lines"></i> CTPS (carteira)</span>
                <span class="file-row-desc document-desc">Carteira Digital (todas infos) ou CTPS física: qualificação, contratos e anotações.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-do-proponente-ctps-carteira-6" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-do-proponente-ctps-carteira-6">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-do-proponente-ctps-carteira-6" />
                </label>
              </div>
              </div>
            </div>

          </div>

          <div class="section">
            <div class="section-title">
              <span>Dependente — Filhos menores de 18 anos</span>
              <span class="pill"><span class="doc-counter">1</span> documentos</span>
            </div>
            <div class="section-summary">Aparece quando o tipo de dependente for &quot;Filho menor&quot;.</div>


            <div class="file-row document-card" data-doc="dependente-filhos-menores-de-18-anos-certidao-de-nascimento-1" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-heart"></i> Certidão de nascimento</span>
                <span class="file-row-desc document-desc">Guarda/adoção: anexar termos respectivos.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-dependente-filhos-menores-de-18-anos-certidao-de-nascimento-1" title="Não enviado"></span>
                <label class="btn-upload" id="btn-dependente-filhos-menores-de-18-anos-certidao-de-nascimento-1">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="dependente-filhos-menores-de-18-anos-certidao-de-nascimento-1" />
                </label>
              </div>
              </div>
            </div>

          </div>

          <div class="section">
            <div class="section-title">
              <span>Dependente — Filhos maiores / parentes até 3º grau</span>
              <span class="pill"><span class="doc-counter">3</span> documentos</span>
            </div>
            <div class="section-summary">Aparece quando o dependente não for &quot;Filho menor&quot;.</div>


            <div class="file-row document-card" data-doc="dependente-filhos-maiores-parentes-ate-3-grau-identidade-e-cpf-1" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-id-card"></i> Identidade e CPF</span>
                <span class="file-row-desc document-desc">CNH, RG, Identidade Militar, Passaporte brasileiro ou carteira funcional com fé pública (dentro da validade) do dependente.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-dependente-filhos-maiores-parentes-ate-3-grau-identidade-e-cpf-1" title="Não enviado"></span>
                <label class="btn-upload" id="btn-dependente-filhos-maiores-parentes-ate-3-grau-identidade-e-cpf-1">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="dependente-filhos-maiores-parentes-ate-3-grau-identidade-e-cpf-1" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="dependente-filhos-maiores-parentes-ate-3-grau-comp-de-estado-civil-2" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-heart"></i> Comp. de estado civil</span>
                <span class="file-row-desc document-desc">SOLTEIRO: Certidão de nascimento
CASADO: Certidão de casamento – RG/CPF do cônjuge se houver renda
VIÚVO: Certidão de casamento e óbito
DIVORCIADO: Certidão averbada.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-dependente-filhos-maiores-parentes-ate-3-grau-comp-de-estado-civil-2" title="Não enviado"></span>
                <label class="btn-upload" id="btn-dependente-filhos-maiores-parentes-ate-3-grau-comp-de-estado-civil-2">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="dependente-filhos-maiores-parentes-ate-3-grau-comp-de-estado-civil-2" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="dependente-filhos-maiores-parentes-ate-3-grau-declaracao-de-parentesco-3" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-file-lines"></i> Declaração de parentesco</span>
                <span class="file-row-desc document-desc">Declaração conforme regras Caixa, vinculando dependente ao proponente.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-dependente-filhos-maiores-parentes-ate-3-grau-declaracao-de-parentesco-3" title="Não enviado"></span>
                <label class="btn-upload" id="btn-dependente-filhos-maiores-parentes-ate-3-grau-declaracao-de-parentesco-3">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="dependente-filhos-maiores-parentes-ate-3-grau-declaracao-de-parentesco-3" />
                </label>
              </div>
              </div>
            </div>

          </div>

          <div class="section">
            <div class="section-title">
              <span>Renda formal (CLT / vínculo)</span>
              <span class="pill"><span class="doc-counter">2</span> documentos</span>
            </div>
            <div class="section-summary">Aparece quando perfil de renda = CLT.</div>


            <div class="file-row document-card" data-doc="renda-formal-clt-vinculo-holerites-1" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-money-bill-wave"></i> Holerites</span>
                <span class="file-row-desc document-desc">3 últimos holerites/contracheques (nome/CNPJ/cargo/admissão/bruto).</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-renda-formal-clt-vinculo-holerites-1" title="Não enviado"></span>
                <label class="btn-upload" id="btn-renda-formal-clt-vinculo-holerites-1">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="renda-formal-clt-vinculo-holerites-1" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="renda-formal-clt-vinculo-renda-variavel-2" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-money-bill-wave"></i> Renda variável</span>
                <span class="file-row-desc document-desc">Comissões/HE/adicional: holerites suficientes para média conforme Caixa.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-renda-formal-clt-vinculo-renda-variavel-2" title="Não enviado"></span>
                <label class="btn-upload" id="btn-renda-formal-clt-vinculo-renda-variavel-2">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="renda-formal-clt-vinculo-renda-variavel-2" />
                </label>
              </div>
              </div>
            </div>

          </div>

          <div class="section">
            <div class="section-title">
              <span>Renda informal (autônomo / liberal)</span>
              <span class="pill"><span class="doc-counter">1</span> documentos</span>
            </div>
            <div class="section-summary">Aparece quando perfil de renda = INFORMAL.</div>


            <div class="file-row document-card" data-doc="renda-informal-autonomo-liberal-extrato-bancario-1" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-money-bill-wave"></i> Extrato bancário</span>
                <span class="file-row-desc document-desc">3 últimos meses (preferir mês fechado). Aceita PDF/impresso e bancos digitais.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-renda-informal-autonomo-liberal-extrato-bancario-1" title="Não enviado"></span>
                <label class="btn-upload" id="btn-renda-informal-autonomo-liberal-extrato-bancario-1">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="renda-informal-autonomo-liberal-extrato-bancario-1" />
                </label>
              </div>
              </div>
            </div>

          </div>

          <div class="section">
            <div class="section-title">
              <span>Aposentados / Pensionistas</span>
              <span class="pill"><span class="doc-counter">1</span> documentos</span>
            </div>
            <div class="section-summary">Aparece quando perfil de renda = APOSENTADO.</div>


            <div class="file-row document-card" data-doc="aposentados-pensionistas-extrato-do-beneficio-1" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-money-bill-wave"></i> Extrato do benefício</span>
                <span class="file-row-desc document-desc">Último extrato (Meu INSS / Dataprev).</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-aposentados-pensionistas-extrato-do-beneficio-1" title="Não enviado"></span>
                <label class="btn-upload" id="btn-aposentados-pensionistas-extrato-do-beneficio-1">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="aposentados-pensionistas-extrato-do-beneficio-1" />
                </label>
              </div>
              </div>
            </div>

          </div>

          <div class="section">
            <div class="section-title">
              <span>Domésticos / contratação por CPF</span>
              <span class="pill"><span class="doc-counter">1</span> documentos</span>
            </div>
            <div class="section-summary">Aparece quando perfil de renda = DOMÉSTICO.</div>


            <div class="file-row document-card" data-doc="domesticos-contratacao-por-cpf-esocial-1" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-file-lines"></i> eSocial</span>
                <span class="file-row-desc document-desc">3 últimos comprovantes do eSocial.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-domesticos-contratacao-por-cpf-esocial-1" title="Não enviado"></span>
                <label class="btn-upload" id="btn-domesticos-contratacao-por-cpf-esocial-1">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="domesticos-contratacao-por-cpf-esocial-1" />
                </label>
              </div>
              </div>
            </div>

          </div>

          <div class="section">
            <div class="section-title">
              <span>Documentos Caixa</span>
              <span class="pill"><span class="doc-counter">7</span> documentos</span>
            </div>
            <div class="section-summary">Extras (Cheque Azul/Cartão) aparecem se &quot;CCA gerou formulários&quot; = SIM.</div>


            <div class="file-row document-card" data-doc="documentos-caixa-damp-1" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-file-lines"></i> DAMP</span>
                <span class="file-row-desc document-desc">Preenchida e assinada digitalmente. Físico só com aprovação do crédito.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-caixa-damp-1" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-caixa-damp-1">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-caixa-damp-1" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-caixa-ficha-de-cadastro-caixa-2" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-building-columns"></i> Ficha de cadastro Caixa</span>
                <span class="file-row-desc document-desc">Preenchida (endereço igual ao cadastro). Assinada digitalmente; físico com aprovação.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-caixa-ficha-de-cadastro-caixa-2" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-caixa-ficha-de-cadastro-caixa-2">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-caixa-ficha-de-cadastro-caixa-2" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-caixa-abertura-de-conta-3" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-building-columns"></i> Abertura de conta</span>
                <span class="file-row-desc document-desc">Assinada digitalmente; físico precisa aprovação do crédito.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-caixa-abertura-de-conta-3" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-caixa-abertura-de-conta-3">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-caixa-abertura-de-conta-3" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-caixa-mo-4" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-file-lines"></i> MO</span>
                <span class="file-row-desc document-desc">Assinatura correta (2ª página). Casal: assinatura de ambos.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-caixa-mo-4" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-caixa-mo-4">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-caixa-mo-4" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-caixa-formulario-cheque-azul-5" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-file-lines"></i> Formulário Cheque Azul</span>
                <span class="file-row-desc document-desc">Formulário de contratação (assinatura digital). Físico somente com aprovação.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-caixa-formulario-cheque-azul-5" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-caixa-formulario-cheque-azul-5">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-caixa-formulario-cheque-azul-5" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-caixa-formulario-cartao-6" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-file-lines"></i> Formulário Cartão</span>
                <span class="file-row-desc document-desc">Formulário do cartão Caixa com campos obrigatórios e assinatura digital.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-caixa-formulario-cartao-6" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-caixa-formulario-cartao-6">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-caixa-formulario-cartao-6" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-caixa-proposta-cartao-7" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-file-lines"></i> Proposta Cartão</span>
                <span class="file-row-desc document-desc">Proposta comercial vinculada ao cliente e assinada digitalmente.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-caixa-proposta-cartao-7" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-caixa-proposta-cartao-7">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-caixa-proposta-cartao-7" />
                </label>
              </div>
              </div>
            </div>

          </div>

          <div class="section">
            <div class="section-title">
              <span>Documentos Agehab</span>
              <span class="pill"><span class="doc-counter">6</span> documentos</span>
            </div>
            <div class="section-summary">Padrões Agehab: assinaturas via GOV.BR ou Clicksign (quando aplicável).</div>


            <div class="file-row document-card" data-doc="documentos-agehab-declaracao-de-endereco-1" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-house"></i> Declaração de endereço</span>
                <span class="file-row-desc document-desc">Quando necessário. Assinada via GOV.BR ou Clicksign.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-agehab-declaracao-de-endereco-1" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-agehab-declaracao-de-endereco-1">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-agehab-declaracao-de-endereco-1" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-agehab-declaracao-renda-informal-2" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-money-bill-wave"></i> Declaração renda informal</span>
                <span class="file-row-desc document-desc">Assinada pelo dependente via GOV.BR/Clicksign (modelo Agehab).</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-agehab-declaracao-renda-informal-2" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-agehab-declaracao-renda-informal-2">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-agehab-declaracao-renda-informal-2" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-agehab-declaracao-de-nao-renda-3" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-money-bill-wave"></i> Declaração de não renda</span>
                <span class="file-row-desc document-desc">Para dependentes sem renda. Assinada via GOV.BR/Clicksign.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-agehab-declaracao-de-nao-renda-3" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-agehab-declaracao-de-nao-renda-3">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-agehab-declaracao-de-nao-renda-3" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-agehab-vinculo-3-anos-4" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-file-lines"></i> Vínculo ≥ 3 anos</span>
                <span class="file-row-desc document-desc">Docs com fé pública comprovando vínculo mínimo na cidade do Cheque Moradia.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-agehab-vinculo-3-anos-4" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-agehab-vinculo-3-anos-4">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-agehab-vinculo-3-anos-4" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-agehab-checklist-agehab-5" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-list-check"></i> Checklist Agehab</span>
                <span class="file-row-desc document-desc">Preenchido e assinado GOV.BR (ou próprio punho conforme orientação).</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-agehab-checklist-agehab-5" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-agehab-checklist-agehab-5">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-agehab-checklist-agehab-5" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-agehab-ficha-agehab-6" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-list-check"></i> Ficha Agehab</span>
                <span class="file-row-desc document-desc">Preenchida pelo Assistente de Crédito; assinada GOV.BR (ou próprio punho).</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-agehab-ficha-agehab-6" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-agehab-ficha-agehab-6">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-agehab-ficha-agehab-6" />
                </label>
              </div>
              </div>
            </div>

          </div>

          <div class="section" data-creditu-section>
            <div class="section-title">
              <span>Documentos Creditú</span>
              <button type="button" class="btn-primary" style="width: auto; margin-top: 0; padding: 6px 12px; font-size: 0.75rem;" data-creditu-download>Download Creditú</button>
              <span class="pill"><span class="doc-counter">7</span> documentos</span>
            </div>
            <div class="section-summary">Documentos Creditú vinculados ao processo.</div>


            <div class="file-row document-card" data-doc="documentos-creditu-tela-score-cliente-1" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-chart-line"></i> Tela do score do Cliente</span>
                <span class="file-row-desc document-desc">Tela do score do cliente.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-creditu-tela-score-cliente-1" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-creditu-tela-score-cliente-1">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-creditu-tela-score-cliente-1" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-creditu-rg-cpf-ou-cnh-2" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-id-card"></i> RG/CPF OU CNH</span>
                <span class="file-row-desc document-desc">Documento de identificação.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-creditu-rg-cpf-ou-cnh-2" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-creditu-rg-cpf-ou-cnh-2">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-creditu-rg-cpf-ou-cnh-2" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-creditu-tela-score-segundo-proponente-3" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-chart-line"></i> Tela do score do 2º Proponente</span>
                <span class="file-row-desc document-desc">Tela do score do 2º proponente.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-creditu-tela-score-segundo-proponente-3" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-creditu-tela-score-segundo-proponente-3">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-creditu-tela-score-segundo-proponente-3" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-creditu-email-segundo-proponente-4" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-envelope"></i> Email do 2º proponente</span>
                <span class="file-row-desc document-desc">Email do 2º proponente.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-creditu-email-segundo-proponente-4" title="Não enviado"></span>
                <input type="text" data-creditu-input="documentos-creditu-email-segundo-proponente-4" />
                <button type="button" class="btn-primary" style="width: auto; margin-top: 0; margin-left: 8px; padding-left: 16px; padding-right: 16px;" data-creditu-save="documentos-creditu-email-segundo-proponente-4">Salvar</button>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-creditu-telefone-segundo-proponente-5" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-phone"></i> Telefone do 2º proponente</span>
                <span class="file-row-desc document-desc">Telefone do 2º proponente.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-creditu-telefone-segundo-proponente-5" title="Não enviado"></span>
                <input type="text" data-creditu-input="documentos-creditu-telefone-segundo-proponente-5" />
                <button type="button" class="btn-primary" style="width: auto; margin-top: 0; margin-left: 8px; padding-left: 16px; padding-right: 16px;" data-creditu-save="documentos-creditu-telefone-segundo-proponente-5">Salvar</button>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-creditu-tela-aprovacao-creditu-6" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-file-circle-check"></i> Tela de aprovação do Creditú</span>
                <span class="file-row-desc document-desc">Tela de aprovação do Creditú.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-creditu-tela-aprovacao-creditu-6" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-creditu-tela-aprovacao-creditu-6">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-creditu-tela-aprovacao-creditu-6" />
                </label>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="documentos-creditu-tela-sicaq-cliente-7" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-file-lines"></i> Tela do SICAQ do cliente</span>
                <span class="file-row-desc document-desc">Tela do SICAQ do cliente.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-documentos-creditu-tela-sicaq-cliente-7" title="Não enviado"></span>
                <label class="btn-upload" id="btn-documentos-creditu-tela-sicaq-cliente-7">
                  <i class="fas fa-paperclip"></i> Anexar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc-input="documentos-creditu-tela-sicaq-cliente-7" />
                </label>
              </div>
              </div>
            </div>

          </div>
          <div class="section">
            <div class="section-title">
              <span>Relacionamento com o banco e produto</span>
              <span class="pill"><span class="doc-counter">8</span> confirmações</span>
            </div>
            <div class="section-summary">Confirmações operacionais registradas com Sim, Não ou N/A.</div>


            <div class="file-row document-card" data-doc="relacionamento-com-o-banco-e-produto-cliente-ciente-da-portabilidade-para-a-agencia-cai-1" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-building-columns"></i> Cliente ciente da portabilidade para a agencia Caixa que vai assinar o contrato?</span>
                <span class="file-row-desc document-desc">Relacionamento Caixa</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-relacionamento-com-o-banco-e-produto-cliente-ciente-da-portabilidade-para-a-agencia-cai-1" title="Não enviado"></span>
                <select class="decision-select" data-decision-input="relacionamento-com-o-banco-e-produto-cliente-ciente-da-portabilidade-para-a-agencia-cai-1"><option value="">Selecione...</option><option>Sim</option><option>Não</option><option>N/A</option></select>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="relacionamento-com-o-banco-e-produto-cliente-ciente-que-sera-preciso-fazer-open-finance-2" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-building-columns"></i> Cliente ciente que sera preciso fazer Open Finance com a agencia Caixa?</span>
                <span class="file-row-desc document-desc">Relacionamento Caixa</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-relacionamento-com-o-banco-e-produto-cliente-ciente-que-sera-preciso-fazer-open-finance-2" title="Não enviado"></span>
                <select class="decision-select" data-decision-input="relacionamento-com-o-banco-e-produto-cliente-ciente-que-sera-preciso-fazer-open-finance-2"><option value="">Selecione...</option><option>Sim</option><option>Não</option><option>N/A</option></select>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="relacionamento-com-o-banco-e-produto-cliente-ciente-que-sera-necessario-cadastrar-o-cpf-3" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-id-card"></i> Cliente ciente que sera necessario cadastrar o CPF como Pix na agencia Caixa?</span>
                <span class="file-row-desc document-desc">Relacionamento Caixa</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-relacionamento-com-o-banco-e-produto-cliente-ciente-que-sera-necessario-cadastrar-o-cpf-3" title="Não enviado"></span>
                <select class="decision-select" data-decision-input="relacionamento-com-o-banco-e-produto-cliente-ciente-que-sera-necessario-cadastrar-o-cpf-3"><option value="">Selecione...</option><option>Sim</option><option>Não</option><option>N/A</option></select>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="relacionamento-com-o-banco-e-produto-propos-e-orientou-o-cliente-sobre-o-fgts-futuro-4" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-money-bill-wave"></i> Propos e orientou o cliente sobre o FGTS Futuro?</span>
                <span class="file-row-desc document-desc">Obrigatorio quando o cliente entrar na regra de FGTS Futuro.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-relacionamento-com-o-banco-e-produto-propos-e-orientou-o-cliente-sobre-o-fgts-futuro-4" title="Não enviado"></span>
                <select class="decision-select" data-decision-input="relacionamento-com-o-banco-e-produto-propos-e-orientou-o-cliente-sobre-o-fgts-futuro-4"><option value="">Selecione...</option><option>Sim</option><option>Não</option><option>N/A</option></select>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="relacionamento-com-o-banco-e-produto-cliente-autorizou-no-app-fgts-a-consulta-para-util-5" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-money-bill-wave"></i> Cliente autorizou no app FGTS a consulta para utilizar o FGTS Futuro?</span>
                <span class="file-row-desc document-desc">Obrigatorio quando o cliente entrar na regra de FGTS Futuro.</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-relacionamento-com-o-banco-e-produto-cliente-autorizou-no-app-fgts-a-consulta-para-util-5" title="Não enviado"></span>
                <select class="decision-select" data-decision-input="relacionamento-com-o-banco-e-produto-cliente-autorizou-no-app-fgts-a-consulta-para-util-5"><option value="">Selecione...</option><option>Sim</option><option>Não</option><option>N/A</option></select>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="relacionamento-com-o-banco-e-produto-cliente-foi-orientado-sobre-o-produto-6" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-file-lines"></i> Cliente foi orientado sobre o produto?</span>
                <span class="file-row-desc document-desc">Produto</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-relacionamento-com-o-banco-e-produto-cliente-foi-orientado-sobre-o-produto-6" title="Não enviado"></span>
                <select class="decision-select" data-decision-input="relacionamento-com-o-banco-e-produto-cliente-foi-orientado-sobre-o-produto-6"><option value="">Selecione...</option><option>Sim</option><option>Não</option><option>N/A</option></select>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="relacionamento-com-o-banco-e-produto-o-cliente-ja-pagou-o-produto-no-fechamento-7" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-file-lines"></i> O cliente ja pagou o produto no fechamento?</span>
                <span class="file-row-desc document-desc">Produto</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-relacionamento-com-o-banco-e-produto-o-cliente-ja-pagou-o-produto-no-fechamento-7" title="Não enviado"></span>
                <select class="decision-select" data-decision-input="relacionamento-com-o-banco-e-produto-o-cliente-ja-pagou-o-produto-no-fechamento-7"><option value="">Selecione...</option><option>Sim</option><option>Não</option><option>N/A</option></select>
              </div>
              </div>
            </div>


            <div class="file-row document-card" data-doc="relacionamento-com-o-banco-e-produto-cliente-saiu-ciente-que-na-assinatura-tera-que-ter-8" data-status="nao-enviado">
              <div class="file-header document-header">
              <div class="file-info">
                <span class="file-row-title document-title"><i class="fas fa-file-lines"></i> Cliente saiu ciente que na assinatura tera que ter R$ 300,00 para o produto?</span>
                <span class="file-row-desc document-desc">Produto</span>
              </div>
              <div class="file-upload-action upload-action">
                <span class="dot nao-enviado" id="dot-relacionamento-com-o-banco-e-produto-cliente-saiu-ciente-que-na-assinatura-tera-que-ter-8" title="Não enviado"></span>
                <select class="decision-select" data-decision-input="relacionamento-com-o-banco-e-produto-cliente-saiu-ciente-que-na-assinatura-tera-que-ter-8"><option value="">Selecione...</option><option>Sim</option><option>Não</option><option>N/A</option></select>
              </div>
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

type ChecklistPerfil = 'analista' | 'corretor' | 'gestor' | 'cca';
type ChecklistModo = 'analise' | 'envio' | 'validacao';

type ChecklistDocumentosFormProps = {
  perfil?: ChecklistPerfil;
  modo?: ChecklistModo;
  reserva?: string;
  cliente?: string;
  documentos?: unknown;
  ocultarAteInicializar?: boolean;
};

const permissionsByRole = {
  analista: {
    canEditAnalysis: true,
    canUpload: false,
    canViewAnalystPendingAlert: false,
    canCreateFormalPending: true,
    canOpenReceivedUpload: true,
    canMarkAttached: false,
    canSendToConformity: false,
  },
  corretor: {
    canEditAnalysis: false,
    canUpload: true,
    canViewAnalystPendingAlert: true,
    canCreateFormalPending: false,
    canOpenReceivedUpload: false,
    canMarkAttached: false,
    canSendToConformity: false,
  },
  gestor: {
    canEditAnalysis: false,
    canUpload: true,
    canViewAnalystPendingAlert: true,
    canCreateFormalPending: false,
    canOpenReceivedUpload: false,
    canMarkAttached: false,
    canSendToConformity: false,
  },
  cca: {
    canEditAnalysis: false,
    canUpload: false,
    canViewAnalystPendingAlert: true,
    canCreateFormalPending: false,
    canOpenReceivedUpload: true,
    canMarkAttached: true,
    canSendToConformity: true,
  },
} satisfies Record<ChecklistPerfil, Record<string, boolean>>;

function inferPerfil(pathname?: string | null): ChecklistPerfil {
  if (pathname?.includes('/analista')) return 'analista';
  if (pathname?.includes('/gestor')) return 'gestor';
  if (pathname?.includes('/cca')) return 'cca';
  return 'corretor';
}

function removeSectionByTitle(markup: string, title: string) {
  const titleIndex = markup.indexOf(`<span>${title}</span>`);
  if (titleIndex < 0) return markup;
  const sectionStart = markup.lastIndexOf('<div class="section"', titleIndex);
  if (sectionStart < 0) return markup;

  const tagRegex = /<\/?div\b[^>]*>/g;
  tagRegex.lastIndex = sectionStart;
  let depth = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(markup))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return `${markup.slice(0, sectionStart)}${markup.slice(tagRegex.lastIndex)}`;
  }

  return markup;
}

function backPathByPerfil(perfil: ChecklistPerfil) {
  if (perfil === 'gestor') return '/gestor/telemetria';
  if (perfil === 'analista') return '/analista';
  if (perfil === 'cca') return '/cca/acompanhamento';
  return '/corretor';
}

export default function ChecklistDocumentosForm({ perfil, modo: _modo, reserva: _reserva, cliente: _cliente, documentos: _documentos, ocultarAteInicializar = false }: ChecklistDocumentosFormProps = {}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const resolvedPerfil = perfil || inferPerfil(pathname);
  const permissions = permissionsByRole[resolvedPerfil];
  const searchParams = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const markup = useMemo(() => {
    let roleMarkup = resolvedPerfil === 'corretor' ? checklistMarkup.replace(/accept="\.pdf,.jpg,.jpeg,.png"/g, 'accept=".pdf"') : checklistMarkup;
    const kitCaixaDownloadButton = ['analista', 'cca'].includes(resolvedPerfil)
      ? '<button type="button" class="btn-primary" style="width: auto; margin-top: 12px; padding: 8px 14px; font-size: 0.78rem;" data-kit-caixa-download><i class="fas fa-file-pdf"></i> Download Kit Caixa</button>'
      : '';
    const kitAgehabDownloadButton = resolvedPerfil === 'analista'
      ? '<button type="button" class="btn-primary" style="width: auto; margin-top: 12px; margin-left: 8px; padding: 8px 14px; font-size: 0.78rem;" data-kit-agehab-download><i class="fas fa-file-pdf"></i> Download Kit AGEHAB</button>'
      : '';
    roleMarkup = roleMarkup.replace('<div data-kit-caixa-download-slot></div>', `<div data-kit-caixa-download-slot>${kitCaixaDownloadButton}${kitAgehabDownloadButton}</div>`);
    roleMarkup = roleMarkup.replace(/href="\/corretor"/g, `href="${backPathByPerfil(resolvedPerfil)}"`);
    if (resolvedPerfil !== 'analista') {
      roleMarkup = roleMarkup
        .replace(/\s*<span class="status-chip" data-status-kind="caixa">Caixa <select id="caixaStatus">[\s\S]*?<\/select><\/span>/, '')
        .replace(/\s*<span class="status-chip" data-status-kind="agehab">Agehab <select id="agehabStatus">[\s\S]*?<\/select><\/span>/, '');
    }
    if (resolvedPerfil === 'cca') {
      roleMarkup = roleMarkup.replace(/\s*<div class="section" data-creditu-section>[\s\S]*?(?=<div class="section">\s*<div class="section-title">\s*<span>Relacionamento com o banco e produto<\/span>)/, '');
      roleMarkup = removeSectionByTitle(roleMarkup, 'Documentos Agehab');
      roleMarkup = removeSectionByTitle(roleMarkup, 'Relacionamento com o banco e produto');
    }
    if (permissions.canUpload) return roleMarkup;
    return roleMarkup
      .replace(/<i class="fas fa-paperclip"><\/i>\s*Anexar\s*<input[^>]*data-doc-input="[^"]+"[^>]*>/g, '<i class="fas fa-clock"></i> Aguardando upload')
      .replace(/<i class="fas fa-rotate"><\/i>\s*Corrigir e reenviar\s*<input[^>]*data-doc-input="[^"]+"[^>]*>/g, '<i class="fas fa-clock"></i> Aguardando upload');
  }, [permissions.canUpload, resolvedPerfil]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const container = root;

    const params = new URLSearchParams(window.location.search);
    const reserva = params.get('reserva') || '';
    const workflowKey = getWorkflowKey(reserva);
    const usesAnalystChecklistLayout = ['analista', 'corretor', 'gestor', 'cca'].includes(resolvedPerfil);
    const isReceiveOnlyView = permissions.canOpenReceivedUpload && !permissions.canUpload;
    const uploadGrupo = resolvedPerfil === 'gestor' ? 'gestor' : 'corretor';
    const uploadAccept = resolvedPerfil === 'corretor' ? '.pdf' : '.pdf,.jpg,.jpeg,.png';
    let notificationTimer = 0;
    let workflowState: Record<string, any> = {};

    const prepareReceiveOnlyButtons = () => {
      if (!isReceiveOnlyView) return;
      root.querySelectorAll<HTMLElement>('.file-row[data-doc]').forEach((row) => {
        const button = row.querySelector<HTMLElement>('.btn-upload');
        const dot = row.querySelector<HTMLElement>('.dot');
        if (dot) {
          dot.className = 'dot nao-enviado';
          dot.title = 'Aguardando upload do corretor ou gestor';
        }
        if (button) {
          button.classList.remove('pending', 'uploaded', 'rejected');
          button.innerHTML = '<i class="fas fa-clock"></i> Aguardando upload';
          button.style.pointerEvents = 'none';
          button.setAttribute('aria-disabled', 'true');
          button.onclick = null;
        }
      });
    };

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
    if (resolvedPerfil === 'cca') root.querySelector<HTMLElement>('[data-creditu-section]')?.remove();

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

    const tableHeaders = ['Documento', 'Descrição', 'Origem', 'Pessoa', 'Situação', 'Prazo', 'Ações'];
    const statusLabels: Record<string, string> = {
      IDLE: 'Aguardando aprovação',
      ENVIADO: 'Em análise',
      EM_ANALISE: 'Em análise',
      PENDENTE: 'Pendente',
      APROVADO: 'Aprovado',
      REPROVADO: 'Reprovado',
      NAO_SE_APLICA: 'Aprovado',
    };
    const statusClass = (status?: string) => `status-${String(status || 'IDLE').toLowerCase().replace(/_/g, '-')}`;
    const updateCredituFieldStatus = (key: string, value?: string) => {
      const row = Array.from(root.querySelectorAll<HTMLElement>('.file-row[data-doc]')).find((item) => item.dataset.doc === key);
      const pill = row?.querySelector<HTMLElement>('[data-doc-status-pill]');
      if (!pill) return;
      const isEmail = key === 'documentos-creditu-email-segundo-proponente-4';
      const filled = Boolean((value || '').trim());
      pill.className = `doc-status-pill ${filled ? 'status-aprovado' : 'status-idle'}`;
      pill.textContent = isEmail ? (filled ? 'EMAIL SALVO' : 'AGUARDANDO EMAIL') : (filled ? 'TELEFONE SALVO' : 'AGUARDANDO TELEFONE');
    };
    const relationshipHeaders = ['Item', 'Descrição', 'Origem', 'Resposta', 'Ações'];
    const relationshipResponseLabel = (value?: string) => {
      const normalized = String(value || '').trim().toLowerCase();
      if (normalized === 'sim') return 'Sim';
      if (normalized === 'não' || normalized === 'nao') return 'Não';
      if (normalized === 'n/a' || normalized === 'nao se aplica' || normalized === 'não se aplica') return 'N/A';
      return 'Não respondido';
    };
    const relationshipResponseClass = (value?: string) => {
      const normalized = String(value || '').trim().toLowerCase();
      if (normalized === 'sim') return 'response-sim';
      if (normalized === 'não' || normalized === 'nao') return 'response-nao';
      if (normalized === 'n/a' || normalized === 'nao se aplica' || normalized === 'não se aplica') return 'response-na';
      return 'response-empty';
    };
    const resolveOrigemDocumento = (docId: string, category: string, title: string) => {
      const text = `${docId} ${category} ${title}`.toLowerCase();
      if (text.includes('agehab')) return 'AGEHAB';
      if (text.includes('declarante')) return 'Declaração';
      if (text.includes('caixa') || text.includes('proponente') || text.includes('dependente')) return 'Caixa';
      return 'Complementar';
    };
    const resolvePessoaDocumento = (docId: string, category: string, title: string) => {
      const text = `${docId} ${category} ${title}`.toLowerCase();
      if (text.includes('declarante')) return 'Declarante';
      if (text.includes('dependente') || text.includes('conjuge') || text.includes('cônjuge') || text.includes('estado-civil') || text.includes('certidao-de-casamento')) {
        return 'Dependente';
      }
      if (text.includes('agehab')) return 'Beneficiário';
      if (text.includes('documentos-do-proponente') || text.includes('proponente') || text.includes('documentos-caixa')) {
        return 'Proponente';
      }
      return '-';
    };
    const prazoResolutionHtml = (prazo?: string) => {
      if (!prazo) return '<span class="doc-muted">-</span>';
      const deadline = new Date(prazo);
      if (Number.isNaN(deadline.getTime())) return `<span class="doc-muted">${prazo}</span>`;
      const diffMs = deadline.getTime() - Date.now();
      const badge = diffMs < 0
        ? '<span class="doc-deadline-badge deadline-late">Em atraso</span>'
        : diffMs <= 24 * 60 * 60 * 1000
          ? '<span class="doc-deadline-badge deadline-near">Próximo do prazo</span>'
          : '<span class="doc-deadline-badge deadline-ok">No prazo</span>';
      return `<span class="doc-muted">${formatPrazoPendencia(prazo)}</span>${badge}`;
    };
    const closeActionMenus = () => {
      root.querySelectorAll<HTMLElement>('.doc-action-menu.is-open').forEach((menu) => menu.classList.remove('is-open'));
      root.querySelectorAll<HTMLElement>('.relationship-answer-menu.is-open').forEach((menu) => menu.classList.remove('is-open'));
    };
    const showAnalysisPanel = (row: HTMLElement) => {
      const review = row.querySelector<HTMLElement>('.analyst-review');
      if (!review) {
        showNotification('Documento indisponivel', 'A análise fica disponível quando houver upload recebido.', 3600);
        return;
      }
      review.hidden = false;
      review.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    const updateRelationshipResponse = (row: HTMLElement, value?: string) => {
      const pill = row.querySelector<HTMLElement>('[data-relationship-response]');
      if (!pill) return;
      pill.className = `relationship-response-pill ${relationshipResponseClass(value)}`;
      pill.textContent = relationshipResponseLabel(value);
    };
    const setupDocumentTable = () => {
      if (!usesAnalystChecklistLayout) return;
      root.classList.add('document-table-mode');
      root.querySelectorAll<HTMLElement>('.section').forEach((section) => {
        const rows = Array.from(section.querySelectorAll<HTMLElement>(':scope > .file-row[data-doc]'));
        if (!rows.length || section.querySelector('.document-table-wrap')) return;
        const sectionTitle = section.querySelector<HTMLElement>('.section-title')?.textContent?.replace(/\s+/g, ' ').trim() || '';
        const isRelationshipSection = sectionTitle.toLowerCase().includes('relacionamento com o banco e produto');
        const wrap = document.createElement('div');
        wrap.className = 'document-table-wrap';
        const header = document.createElement('div');
        header.className = 'document-table-header';
        header.innerHTML = (isRelationshipSection ? relationshipHeaders : tableHeaders).map((label) => `<span>${label}</span>`).join('');
        section.insertBefore(wrap, rows[0]);
        wrap.appendChild(header);
        if (isRelationshipSection) {
          section.classList.add('relationship-table');
          rows.forEach((row) => {
            const rowHeader = row.querySelector<HTMLElement>('.file-header');
            const fileInfo = row.querySelector<HTMLElement>('.file-info');
            const desc = row.querySelector<HTMLElement>('.file-row-desc');
            const select = row.querySelector<HTMLSelectElement>('[data-decision-input]');
            if (!rowHeader || !fileInfo || !desc || !select) return;

            rowHeader.classList.add('document-table-grid');
            select.classList.add('relationship-native-select');
            const originText = (desc.textContent || '').toLowerCase().includes('produto') ? 'Complementar' : 'Caixa';
            const makeCell = (className: string, content = '') => {
              const cell = document.createElement('div');
              cell.className = `document-table-cell ${className}`;
              if (content) cell.innerHTML = content;
              return cell;
            };
            const descCell = makeCell('doc-description-cell');
            descCell.appendChild(desc);
            if ((desc.textContent || '').trim().length > 100) {
              const toggle = document.createElement('button');
              toggle.type = 'button';
              toggle.className = 'doc-description-toggle';
              toggle.textContent = 'Ver mais';
              toggle.addEventListener('click', () => {
                const expanded = desc.classList.toggle('is-expanded');
                toggle.textContent = expanded ? 'Ver menos' : 'Ver mais';
              });
              descCell.appendChild(toggle);
            }
            const originCell = makeCell('doc-origin-cell', `<span class="doc-muted">${originText}</span>`);
            const responseCell = makeCell('relationship-response-cell', '<span class="relationship-response-pill" data-relationship-response>Não respondido</span>');
            const actionsCell = makeCell('relationship-actions-cell');
            const menu = document.createElement('div');
            menu.className = 'relationship-answer-menu';
            menu.innerHTML = `
              <button type="button" class="relationship-answer-trigger">Responder</button>
              <div class="relationship-answer-dropdown">
                <button type="button" data-relationship-answer="Sim">Sim</button>
                <button type="button" data-relationship-answer="Não">Não</button>
                <button type="button" data-relationship-answer="N/A">N/A</button>
              </div>
            `;
            menu.querySelector<HTMLButtonElement>('.relationship-answer-trigger')?.addEventListener('click', (event) => {
              event.preventDefault();
              event.stopPropagation();
              const open = menu.classList.contains('is-open');
              closeActionMenus();
              if (!open) menu.classList.add('is-open');
            });
            menu.querySelectorAll<HTMLButtonElement>('[data-relationship-answer]').forEach((button) => {
              button.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const answer = button.dataset.relationshipAnswer || '';
                select.value = answer;
                updateRelationshipResponse(row, answer);
                closeActionMenus();
                if (!reserva || !select.dataset.decisionInput) return;
                try {
                  const statusPayload = answer === 'N/A' ? 'Nao se Aplica' : answer;
                  const response = await fetch(apiUrl(`/api/processos/${encodeURIComponent(reserva)}/relacionamento/${encodeURIComponent(select.dataset.decisionInput)}`), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: statusPayload, updated_by: resolvedPerfil }),
                  });
                  if (!response.ok) throw new Error('Nao foi possivel salvar a resposta.');
                } catch (error) {
                  showNotification('Erro', error instanceof Error ? error.message : 'Nao foi possivel salvar a resposta.', 3600);
                }
              });
            });
            select.addEventListener('change', () => updateRelationshipResponse(row, select.value));
            actionsCell.append(menu, select);
            rowHeader.innerHTML = '';
            rowHeader.append(fileInfo, descCell, originCell, responseCell, actionsCell);
            wrap.appendChild(row);
            updateRelationshipResponse(row, select.value);
          });
          return;
        }
        rows.forEach((row) => {
          const rowHeader = row.querySelector<HTMLElement>('.file-header');
          const fileInfo = row.querySelector<HTMLElement>('.file-info');
          const desc = row.querySelector<HTMLElement>('.file-row-desc');
          const uploadAction = row.querySelector<HTMLElement>('.file-upload-action');
          if (!rowHeader || !fileInfo || !desc || !uploadAction) return;

          rowHeader.classList.add('document-table-grid');
          const title = row.querySelector<HTMLElement>('.file-row-title')?.textContent?.replace(/\s+/g, ' ').trim() || row.dataset.doc || 'Documento';
          const category = section.querySelector<HTMLElement>('.section-title')?.textContent?.replace(/\s+/g, ' ').trim() || 'Documento';
          const origemDocumento = resolveOrigemDocumento(row.dataset.doc || '', category, title);
          const pessoaDocumento = resolvePessoaDocumento(row.dataset.doc || '', category, title);
          const makeCell = (className: string, content = '') => {
            const cell = document.createElement('div');
            cell.className = `document-table-cell ${className}`;
            if (content) cell.innerHTML = content;
            return cell;
          };

          const descCell = makeCell('doc-description-cell');
          descCell.appendChild(desc);
          if ((desc.textContent || '').trim().length > 120) {
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'doc-description-toggle';
            toggle.textContent = 'Ver mais';
            toggle.addEventListener('click', () => {
              const expanded = desc.classList.toggle('is-expanded');
              toggle.textContent = expanded ? 'Ver menos' : 'Ver mais';
            });
            descCell.appendChild(toggle);
          }
          const typeCell = makeCell('doc-origin-cell', `<span class="doc-muted" title="${origemDocumento}">${origemDocumento}</span>`);
          const personCell = makeCell('doc-person-cell', `<span class="doc-muted" title="${pessoaDocumento}">${pessoaDocumento}</span>`);
          const statusCell = makeCell('doc-status-cell', '<span class="doc-status-pill status-idle" data-doc-status-pill>Aguardando aprovação</span>');
          const deadlineCell = makeCell('doc-deadline-cell', '<span data-doc-deadline>-</span>');
          const optionsCell = makeCell('doc-options-cell');
          const menu = document.createElement('div');
          menu.className = 'doc-action-menu';
          const restrictedActionProfile = ['corretor', 'gestor'].includes(resolvedPerfil);
          menu.innerHTML = `
            <button type="button" class="doc-action-trigger" aria-haspopup="menu">Ações</button>
            <div class="doc-action-dropdown" role="menu">
              <button type="button" data-doc-action="view">Visualizar Documento</button>
              ${restrictedActionProfile ? '' : `
              <button type="button" data-doc-action="review">Aprovar / Reprovar</button>
              `}
              <button type="button" data-doc-action="download">Baixar Documento</button>
              ${restrictedActionProfile ? '' : `
              <button type="button" data-doc-action="delete">Excluir Documento</button>
              <button type="button" data-doc-action="pending">Enviar pendência</button>
              `}
            </div>
          `;
          menu.querySelector<HTMLButtonElement>('.doc-action-trigger')?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const open = menu.classList.contains('is-open');
            closeActionMenus();
            if (!open) menu.classList.add('is-open');
          });
          menu.querySelectorAll<HTMLButtonElement>('[data-doc-action]').forEach((item) => {
            item.addEventListener('click', (event) => {
              event.preventDefault();
              event.stopPropagation();
              closeActionMenus();
              const action = item.dataset.docAction;
              const button = row.querySelector<HTMLElement>('.btn-upload');
              if (action === 'view' || action === 'download') button?.click();
              if (action === 'review' || action === 'pending') showAnalysisPanel(row);
              if (action === 'delete') showNotification('Ação indisponível', 'Exclusão individual de documento não existe nas regras atuais.', 3600);
            });
          });
          uploadAction.classList.add('document-table-cell', 'doc-documents-cell');
          if (!row.querySelector('[data-creditu-input]')) optionsCell.appendChild(menu);
          optionsCell.appendChild(uploadAction);
          uploadAction.querySelector<HTMLElement>('.btn-upload')?.replaceChildren(document.createTextNode('Documentos'));

          rowHeader.innerHTML = '';
          rowHeader.append(fileInfo, descCell, typeCell, personCell, statusCell, deadlineCell, optionsCell);
          const credituInput = row.querySelector<HTMLInputElement>('[data-creditu-input]');
          if (credituInput?.dataset.credituInput) updateCredituFieldStatus(credituInput.dataset.credituInput, credituInput.value);
          row.title = title;
          wrap.appendChild(row);
        });
      });
      document.addEventListener('click', closeActionMenus);
    };

    const readWorkflowState = () => {
      return workflowState;
    };

    const writeWorkflowState = (state: Record<string, any>) => {
      workflowState = state;
      try {
        window.localStorage.setItem(workflowKey, JSON.stringify(state));
      } catch {
        // Cache local e apenas apoio visual; o banco continua sendo a fonte principal.
      }
      window.dispatchEvent(new CustomEvent('maq2-workflow-updated'));
    };

    const saveProcesso = async (encaminhadoAnalista = false) => {
      if (!reserva) return;
      const caixaStatus = root.querySelector<HTMLSelectElement>('#caixaStatus')?.value || 'reserva';
      const agehabStatus = root.querySelector<HTMLSelectElement>('#agehabStatus')?.value || 'reserva';
      const enviadoConformidade = resolvedPerfil === 'cca' && Boolean(root.querySelector<HTMLInputElement>('#ccaEnviadoConformidade')?.checked);
      const payload: Record<string, unknown> = {
        caixa: enviadoConformidade ? 'envio_conformidade' : caixaStatus,
        agehab: agehabStatus,
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
    const caixaStages = caixaTimelineSteps.map((step) => step.key);
    const agehabStages = agehabTimelineSteps.map((step) => step.key);
    const stageDescriptions: Record<string, Record<string, string>> = {
      caixa: {
        reserva: 'Cliente em reserva. Aguardando inicio da analise de credito.',
        em_analise_credito: 'Credito em analise. Conferir documentacao e retorno das validacoes.',
        emitindo_formularios: 'Formularios em emissao pelo CCA para assinatura do cliente.',
        formularios_em_assinatura: 'Formularios enviados para assinatura. Acompanhar devolucao assinada.',
        formularios_assinados: 'Formularios assinados. Preparar envio para conformidade.',
        envio_conformidade: 'Kit Caixa finalizado e enviado para conformidade.',
      },
      agehab: {
        reserva: 'Cliente em reserva. Aguardando inicio da analise de credito.',
        em_analise_credito: 'Credito em analise. Validar criterios antes da ficha Agehab.',
        ficha_emitida: 'Ficha Agehab emitida. Aguardando assinatura ou retorno do cliente.',
        ficha_recebida: 'Ficha Agehab recebida. Conferir dados e documentos obrigatorios.',
        em_validacao_agehab: 'Processo em validacao na Agehab. Acompanhar retorno da analise.',
        agehab_validada: 'Agehab validada. Etapa concluida para este cliente.',
      },
    };
    const paintTimeline = (selector: string, stages: string[], value?: string, tone: 'caixa' | 'agehab' = 'caixa') => {
      const card = root.querySelector<HTMLElement>(selector);
      if (!card) return;
      const currentValue = stages.includes(value || '') ? value || 'reserva' : 'reserva';
      const currentIndex = Math.max(0, stages.indexOf(currentValue));
      card.dataset.currentStage = currentValue;
      const steps = Array.from(card.querySelectorAll<HTMLElement>('.kit-step'));
      steps.forEach((step, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'pending';
        step.classList.toggle('done', state === 'done');
        step.classList.toggle('active', state === 'active');
        step.classList.toggle('pending', state === 'pending');
        step.dataset.state = state;
        const dot = step.querySelector<HTMLElement>('.kit-dot');
        if (dot) dot.textContent = state === 'done' ? '✓' : String(index + 1);
      });
      const fill = card.querySelector<HTMLElement>('.kit-progress-fill');
      if (fill) fill.style.width = `${stages.length > 1 ? (currentIndex / (stages.length - 1)) * 100 : 0}%`;
      const activeLabel = steps[currentIndex]?.querySelector<HTMLElement>('.kit-step-label')?.textContent?.trim();
      root.querySelectorAll<HTMLElement>(`[data-stage-badge="${tone}"]`).forEach((badge) => {
        if (activeLabel) badge.textContent = activeLabel;
      });
      const description = card.querySelector<HTMLElement>('[data-stage-description]');
      if (description) description.textContent = stageDescriptions[tone][currentValue] || stageDescriptions[tone].reserva;
      const select = root.querySelector<HTMLSelectElement>(tone === 'caixa' ? '#caixaStatus' : '#agehabStatus');
      if (select) {
        select.value = currentValue === 'envio_conformidade' ? 'formularios_assinados' : currentValue;
      }
      if (tone === 'caixa') {
        const conformidade = root.querySelector<HTMLInputElement>('#ccaEnviadoConformidade');
        if (conformidade) conformidade.checked = currentValue === 'envio_conformidade';
      }
    };

    const getDocTitle = (row: Element) => row.querySelector('.file-row-title')?.textContent?.replace(/\s+/g, ' ').trim() || row.getAttribute('data-doc') || 'Documento';
    const getDocCategory = (row: Element) => row.closest('.section')?.querySelector('.section-title')?.textContent?.replace(/\s+/g, ' ').trim() || 'Documento';
    const statusFromBackend = (status?: string) => {
      const normalized = (status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (normalized.includes('aguardando')) return 'IDLE';
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
    const normalizeUploadUrl = (url?: string) => {
      if (!url) return '';
      try {
        const parsed = new URL(url, window.location.origin);
        if (parsed.pathname.startsWith('/api/processos/')) return `${parsed.pathname}${parsed.search}`;
        return url;
      } catch {
        return url.startsWith('/api/processos/') ? url : '';
      }
    };

    const autoResizeTextarea = (textarea: HTMLTextAreaElement | null) => {
      if (!textarea) return;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    const saveDocumentStatus = async (docId: string, status: string, updatedBy = 'analista') => {
      if (!reserva) throw new Error('Reserva nao informada.');
      const response = await fetch(apiUrl(`/api/processos/${encodeURIComponent(reserva)}/documentos/${encodeURIComponent(docId)}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, updated_by: updatedBy }),
      });
      if (!response.ok) throw new Error('Nao foi possivel salvar o status do documento.');
    };

    const savePendencia = async (docId: string, descricao: string, prazo: string) => {
      if (!reserva) throw new Error('Reserva nao informada.');
      const response = await fetch(apiUrl(`/api/processos/${encodeURIComponent(reserva)}/documentos/${encodeURIComponent(docId)}/pendencia`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao,
          prazo,
          documento: docId,
          origem: 'analista',
          destinoCard: 'card1',
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Nao foi possivel salvar a pendencia.');
      }
    };

    const currentRole = () => {
      return resolvedPerfil;
    };
    const currentAuthorName = () => {
      const role = currentRole();
      const corretorNome = root.querySelector<HTMLInputElement>('#corretor')?.value?.trim();
      if (role === 'corretor' && corretorNome) return corretorNome;
      return role.charAt(0).toUpperCase() + role.slice(1);
    };
    const roleLabels: Record<string, string> = {
      analista: 'Analista',
      corretor: 'Corretor',
      gestor: 'Gestor',
      cca: 'CCA',
      todos: 'Todos',
    };
    const normalizeTargetRole = (value?: string) => {
      const target = String(value || 'todos').toLowerCase();
      return roleLabels[target] ? target : 'todos';
    };
    const messagesUrl = () => apiUrl(`/api/processos/${encodeURIComponent(reserva)}/messages`);
    const formatMessageDate = (value?: string) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };
    const renderMessages = (panel: HTMLElement, messages: any[]) => {
      const list = panel.querySelector<HTMLElement>('.doc-chat-list');
      if (!list) return;
      const role = currentRole();
      const visibleMessages = messages.filter((item) => {
        const role = currentRole();
        const target = normalizeTargetRole(item.targetRole || item.target_role);
        return target === 'todos' || item.author_role === role || target === role || role === 'gestor';
      });
      if (!visibleMessages.length) {
        list.innerHTML = '<div class="doc-chat-empty">Sem mensagens neste processo.</div>';
        return;
      }
      list.innerHTML = visibleMessages.map((item) => {
        const mine = item.author_role === role ? ' mine' : '';
        const author = roleLabels[item.author_role] || item.author_role || '-';
        const target = normalizeTargetRole(item.targetRole || item.target_role);
        const targetLabel = roleLabels[target] || item.targetLabel || target;
        return `<div class="doc-chat-message${mine}">
          <span class="doc-chat-meta">${author.toUpperCase()} &rarr; ${targetLabel.toUpperCase()} &bull; ${formatMessageDate(item.created_at)}</span>
          <div>${String(item.message || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char))}</div>
        </div>`;
      }).join('');
      list.scrollTop = list.scrollHeight;
    };
    const loadMessages = async () => {
      if (!reserva) return [];
      const response = await fetch(messagesUrl(), { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok) throw new Error('Nao foi possivel carregar mensagens.');
      const messages = await response.json();
      root.querySelector<HTMLElement>('#btnProcessChat .doc-chat-count')!.textContent = messages.length ? String(messages.length) : '';
      return messages;
    };
    const openProcessChat = async () => {
      let panel = root.querySelector<HTMLElement>('.doc-chat-panel');
      if (panel) {
        panel.remove();
        return;
      }
      const actions = root.querySelector<HTMLElement>('.header-actions');
      if (!actions) return;
      panel = document.createElement('div');
      panel.className = 'doc-chat-panel';
      panel.innerHTML = `
        <div class="doc-chat-list"><div class="doc-chat-empty">Carregando mensagens...</div></div>
        <div class="doc-chat-compose">
          <select aria-label="Enviar para">
            <option value="todos">Todos</option>
            <option value="analista">Analista</option>
            <option value="corretor">Corretor</option>
            <option value="gestor">Gestor</option>
            <option value="cca">CCA</option>
          </select>
          <textarea placeholder="Escreva uma mensagem para o CCA..."></textarea>
          <button type="button">Enviar mensagem</button>
        </div>
      `;
      actions.insertAdjacentElement('afterend', panel);
      try {
        renderMessages(panel, await loadMessages());
      } catch (error) {
        showNotification('Erro', error instanceof Error ? error.message : 'Nao foi possivel carregar mensagens.', 3600);
      }
      panel.querySelector<HTMLButtonElement>('.doc-chat-compose button')?.addEventListener('click', async () => {
        const target = panel!.querySelector<HTMLSelectElement>('.doc-chat-compose select')?.value || 'todos';
        const textarea = panel!.querySelector<HTMLTextAreaElement>('textarea');
        const message = textarea?.value.trim() || '';
        if (!message) return;
        const response = await fetch(messagesUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author_name: currentAuthorName(), author_role: currentRole(), targetRole: target, message }),
        });
        if (!response.ok) {
          showNotification('Erro', 'Nao foi possivel enviar mensagem.', 3600);
          return;
        }
        if (textarea) textarea.value = '';
        renderMessages(panel!, await loadMessages());
      });
    };

    const renderAnalystReview = (row: HTMLElement, state: any) => {
      const existingReview = row.querySelector<HTMLElement>('.analyst-review');
      const existingHeader = row.querySelector<HTMLElement>('.file-header');
      const movedUpload = existingReview?.querySelector<HTMLElement>('.file-upload-action');
      if (movedUpload && existingHeader) existingHeader.appendChild(movedUpload);
      existingHeader?.querySelector('.document-status-badge')?.remove();
      existingReview?.remove();
      if (!permissions.canEditAnalysis || !isSafeFileUrl(state?.fileUrl)) return;

      const docId = row.dataset.doc || '';
      const header = row.querySelector<HTMLElement>('.file-header');
      if (!docId || !header) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'analyst-review';
      wrapper.innerHTML = `
        <div class="document-inner">
          <div class="document-body">
            <div class="document-left">
              <div class="document-field">
                <label>Status</label>
                <select data-review-status>
                  <option value="">Analisar documento...</option>
                  <option value="Aprovado">Aprovar</option>
                  <option value="Nao se Aplica">Não se Aplica</option>
                  <option value="Pendente">Pendenciar</option>
                </select>
              </div>
              <div data-pendency-box hidden>
                <div class="document-field">
                  <label>Prazo</label>
                  <input type="datetime-local" />
                </div>
              </div>
            </div>
            <div class="document-right">
              <div data-pendency-box hidden>
                <div class="document-field">
                  <label>Observacao</label>
                  <textarea placeholder="Descreva a pendencia para o Card 1"></textarea>
                </div>
              </div>
              <div class="document-actions">
                <button type="button">Enviar pendencia</button>
              </div>
            </div>
          </div>
        </div>
      `;
      header.insertAdjacentElement('afterend', wrapper);
      header.querySelector('.document-status-badge')?.remove();
      const statusBadge = document.createElement('span');
      statusBadge.className = 'document-status-badge';
      statusBadge.textContent = state?.status === 'APROVADO' ? 'Aprovado' : state?.status === 'PENDENTE' ? 'Pendente' : 'Em analise';
      if (!root.classList.contains('document-table-mode')) header.appendChild(statusBadge);
      const uploadAction = row.querySelector<HTMLElement>('.file-upload-action');
      const reviewActions = wrapper.querySelector<HTMLElement>('.document-actions');
      const sendButton = wrapper.querySelector<HTMLButtonElement>('.document-actions > button');
      if (uploadAction && reviewActions && !root.classList.contains('document-table-mode')) {
        const dot = uploadAction.querySelector<HTMLElement>('.dot');
        const uploadButton = uploadAction.querySelector<HTMLElement>('.btn-upload');
        if (dot && uploadButton && dot.parentElement !== uploadButton) uploadButton.prepend(dot);
        reviewActions.insertBefore(uploadAction, sendButton || null);
      }
      if (root.classList.contains('document-table-mode')) wrapper.hidden = true;

      const select = wrapper.querySelector<HTMLSelectElement>('[data-review-status]');
      const boxes = Array.from(wrapper.querySelectorAll<HTMLElement>('[data-pendency-box]'));
      const textarea = wrapper.querySelector<HTMLTextAreaElement>('textarea');
      const prazo = wrapper.querySelector<HTMLInputElement>('input[type="datetime-local"]');
      const button = wrapper.querySelector<HTMLButtonElement>('button');

      if (state?.status === 'APROVADO') select!.value = 'Aprovado';
      if (state?.status === 'NAO_SE_APLICA' || state?.status === 'NÃO SE APLICA' || state?.status === 'Nao se Aplica') select!.value = 'Nao se Aplica';
      if (state?.status === 'PENDENTE') {
        select!.value = 'Pendente';
        boxes.forEach((box) => { box.hidden = false; });
        if (textarea) textarea.value = state?.observacao || state?.descricao || '';
        if (prazo) prazo.value = state?.prazo || '';
        autoResizeTextarea(textarea);
      }

      textarea?.addEventListener('input', () => autoResizeTextarea(textarea));
      select?.addEventListener('change', async () => {
        if (select.value === 'Pendente') {
          boxes.forEach((box) => { box.hidden = false; });
          autoResizeTextarea(textarea);
          return;
        }
        if (select.value === 'Aprovado' || select.value === 'Nao se Aplica') {
          try {
            await saveDocumentStatus(docId, select.value);
            const next = readWorkflowState();
            next[docId] = { ...(next[docId] || state || {}), status: select.value === 'Nao se Aplica' ? 'NAO_SE_APLICA' : 'APROVADO', updatedAt: new Date().toISOString() };
            writeWorkflowState(next);
            showNotification('Status salvo', 'Status salvo no processo.');
          } catch (error) {
            showNotification('Erro', error instanceof Error ? error.message : 'Nao foi possivel salvar.', 4200);
          }
        }
      });
      button?.addEventListener('click', async () => {
        const mensagem = textarea?.value.trim() || '';
        if (!mensagem) {
          showNotification('Pendencia obrigatoria', 'Descreva a pendencia antes de enviar.', 3600);
          return;
        }
        try {
          await saveDocumentStatus(docId, 'Pendente');
          await savePendencia(docId, mensagem, prazo?.value || '');
          const next = readWorkflowState();
          next[docId] = { ...(next[docId] || state || {}), status: 'PENDENTE', observacao: mensagem, prazo: prazo?.value || '', updatedAt: new Date().toISOString() };
          writeWorkflowState(next);
          showNotification('Pendencia enviada', 'Pendencia salva e enviada para o Card 1.');
        } catch (error) {
          showNotification('Erro', error instanceof Error ? error.message : 'Nao foi possivel salvar a pendencia.', 4200);
        }
      });
    };

    const paintDocument = (row: HTMLElement, state?: any) => {
      const docId = row.dataset.doc || '';
      const dot = row.querySelector<HTMLElement>('.dot');
      const button = row.querySelector<HTMLElement>('.btn-upload');
      if (!dot || !button) return;

      const status = state?.status || 'IDLE';
      row.querySelector('.pendency-note')?.remove();
      const existingReview = row.querySelector<HTMLElement>('.analyst-review');
      const movedUpload = existingReview?.querySelector<HTMLElement>('.file-upload-action');
      const header = row.querySelector<HTMLElement>('.file-header');
      if (movedUpload && header) header.appendChild(movedUpload);
      header?.querySelector('.document-status-badge')?.remove();
      existingReview?.remove();
      row.dataset.status = status === 'APROVADO' ? 'aprovado' : status === 'PENDENTE' ? 'pendenciado' : status === 'ENVIADO' ? 'enviado' : status === 'EM_ANALISE' ? 'em-analise' : 'nao-enviado';
      const statusPill = row.querySelector<HTMLElement>('[data-doc-status-pill]');
      if (statusPill) {
        const label = statusLabels[status] || status;
        statusPill.className = `doc-status-pill ${statusClass(status)}`;
        statusPill.textContent = label;
      }
      const deadlineCell = row.querySelector<HTMLElement>('[data-doc-deadline]');
      if (deadlineCell) deadlineCell.innerHTML = prazoResolutionHtml(state?.prazo);
      button.classList.remove('pending', 'uploaded', 'rejected');
      button.onclick = null;

      if (permissions.canViewAnalystPendingAlert && (state?.observacao || state?.descricao || state?.prazo)) {
        const desc = row.querySelector<HTMLElement>('.file-row-desc');
        const mensagem = state?.observacao || state?.descricao || 'Documento pendenciado pelo analista.';
        if (desc) {
          const note = document.createElement('span');
          note.className = 'pendency-note';
          note.innerHTML = `Pendencia: ${mensagem}${state?.prazo ? `<small>Prazo: ${formatPrazoPendencia(state.prazo)}</small>` : ''}`;
          desc.insertAdjacentElement('afterend', note);
        }
      }

      if (isReceiveOnlyView) {
        dot.className = status === 'APROVADO' ? 'dot aprovado' : status === 'PENDENTE' ? 'dot rejeitado' : status === 'ENVIADO' || status === 'EM_ANALISE' ? 'dot em-analise' : 'dot nao-enviado';
        dot.title = status === 'IDLE' ? 'Aguardando upload do corretor ou gestor' : 'Upload recebido do corretor ou gestor';
        button.style.pointerEvents = '';
        button.removeAttribute('aria-disabled');

        if (isSafeFileUrl(state?.fileUrl)) {
          button.classList.add(status === 'APROVADO' ? 'uploaded' : status === 'PENDENTE' ? 'rejected' : 'pending');
          button.innerHTML = '<i class="fas fa-folder-open"></i> Documentos';
          button.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            window.open(state.fileUrl, '_blank', 'noopener,noreferrer');
          };
          if (permissions.canEditAnalysis) renderAnalystReview(row, state);
        } else {
          button.innerHTML = '<i class="fas fa-clock"></i> Documentos';
          button.style.pointerEvents = 'none';
          button.setAttribute('aria-disabled', 'true');
        }
        return;
      }

      if (status === 'ENVIADO' || status === 'EM_ANALISE') {
        dot.className = 'dot em-analise';
        dot.title = 'Enviado para analise';
        button.classList.add('pending');
        button.innerHTML = '<i class="fas fa-lock"></i> Enviado';
        button.style.pointerEvents = 'none';
        button.setAttribute('aria-disabled', 'true');
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
        button.innerHTML = '<i class="fas fa-rotate"></i> Corrigir e reenviar <input type="file" accept="' + uploadAccept + '" data-doc-input="' + docId + '" />';
        wireInput(button.querySelector<HTMLInputElement>('input[data-doc-input]'));
        return;
      }

      dot.className = 'dot nao-enviado';
      dot.title = 'Nao enviado';
      button.style.pointerEvents = '';
      button.removeAttribute('aria-disabled');
      button.innerHTML = '<i class="fas fa-paperclip"></i> Anexar <input type="file" accept="' + uploadAccept + '" data-doc-input="' + docId + '" />';
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
        const row = Array.from(container.querySelectorAll<HTMLElement>('.file-row[data-doc]')).find((item) => item.dataset.doc === docId);
        const file = input.files?.[0];
        if (!docId || !row || !file) return;
        if (resolvedPerfil === 'corretor' && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
          input.value = '';
          showNotification('Arquivo invalido', 'Anexe apenas arquivos PDF.', 3600);
          return;
        }

        const button = row.querySelector<HTMLElement>('.btn-upload');
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
            fileUrl: normalizeUploadUrl(uploadResult.url) || window.location.href,
            updatedAt: new Date().toISOString(),
          };
          writeWorkflowState(state);
          void fetch(apiUrl(`/api/processos/${encodeURIComponent(reserva)}/documentos/${encodeURIComponent(docId)}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Enviado', updated_by: resolvedPerfil }),
          });
          paintDocument(row, state[docId]);
          showNotification('Documento enviado', `${file.name} enviado para analise.`, 3200);
          updateTotal();
          input.value = '';
        } catch (error) {
          showNotification('Erro no envio', error instanceof Error ? error.message : 'Nao foi possivel enviar o documento.', 4200);
          paintDocument(row, readWorkflowState()[docId]);
        }
      }, true);
    }

    function wireKitCaixaDownload() {
      container.querySelectorAll<HTMLButtonElement>('[data-kit-caixa-download]').forEach((button) => {
        if (button.dataset.workflowWired === 'true') return;
        button.dataset.workflowWired = 'true';
        button.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!reserva) {
            showNotification('Download indisponível', 'Reserva não informada para download.', 4200);
            return;
          }
          try {
            const response = await fetch(apiUrl(`/api/processos/${encodeURIComponent(reserva)}/kit-caixa/download`), { cache: 'no-store' });
            if (!response.ok) {
              const contentType = response.headers.get('Content-Type') || '';
              const message = contentType.includes('application/json')
                ? (await response.json().catch(() => ({}))).detail
                : await response.text().catch(() => '');
              showNotification('Download indisponível', message || 'Não existem documentos do Kit Caixa disponíveis para download.', 4200);
              return;
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const disposition = response.headers.get('Content-Disposition') || '';
            const match = disposition.match(/filename="?([^"]+)"?/i);
            link.href = url;
            link.download = match?.[1] || `KIT_CAIXA_RESERVA_${reserva}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
          } catch (error) {
            showNotification('Download indisponível', error instanceof Error ? error.message : 'Não existem documentos do Kit Caixa disponíveis para download.', 4200);
          }
        });
      });
    }

    function wireKitAgehabDownload() {
      container.querySelectorAll<HTMLButtonElement>('[data-kit-agehab-download]').forEach((button) => {
        if (button.dataset.workflowWired === 'true') return;
        button.dataset.workflowWired = 'true';
        button.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!reserva) {
            showNotification('Download indisponível', 'Reserva não informada para download.', 4200);
            return;
          }
          try {
            const response = await fetch(apiUrl(`/api/processos/${encodeURIComponent(reserva)}/kit-agehab/download`), { cache: 'no-store' });
            if (!response.ok) {
              const contentType = response.headers.get('Content-Type') || '';
              const message = contentType.includes('application/json')
                ? (await response.json().catch(() => ({}))).detail
                : await response.text().catch(() => '');
              showNotification('Download indisponível', message || 'Não existem documentos do Kit AGEHAB disponíveis para download.', 4200);
              return;
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const disposition = response.headers.get('Content-Disposition') || '';
            const match = disposition.match(/filename="?([^"]+)"?/i);
            link.href = url;
            link.download = match?.[1] || `KIT_AGEHAB_RESERVA_${reserva}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
          } catch (error) {
            showNotification('Download indisponível', error instanceof Error ? error.message : 'Não existem documentos do Kit AGEHAB disponíveis para download.', 4200);
          }
        });
      });
    }

    function wireCredituFields() {
      container.querySelectorAll<HTMLButtonElement>('[data-creditu-download]').forEach((button) => {
        if (button.dataset.workflowWired === 'true') return;
        button.dataset.workflowWired = 'true';
        button.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!reserva) return;
          try {
            const response = await fetch(apiUrl(`/api/processos/${encodeURIComponent(reserva)}/creditu/download`), { cache: 'no-store' });
            if (!response.ok) {
              const contentType = response.headers.get('Content-Type') || '';
              const message = contentType.includes('application/json')
                ? (await response.json().catch(() => ({}))).detail
                : await response.text().catch(() => '');
              showNotification('Download indisponível', message || 'Não existem documentos disponíveis para download.', 4200);
              return;
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const disposition = response.headers.get('Content-Disposition') || '';
            const match = disposition.match(/filename="?([^"]+)"?/i);
            link.href = url;
            link.download = match?.[1] || `CREDITU_RESERVA_${reserva}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
          } catch (error) {
            showNotification('Download indisponível', error instanceof Error ? error.message : 'Não existem documentos disponíveis para download.', 4200);
          }
        });
      });
      container.querySelectorAll<HTMLButtonElement>('[data-creditu-save]').forEach((button) => {
        if (button.dataset.workflowWired === 'true') return;
        button.dataset.workflowWired = 'true';
        button.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const key = button.dataset.credituSave || '';
          const input = container.querySelector<HTMLInputElement>(`[data-creditu-input="${CSS.escape(key)}"]`);
          if (!reserva || !key || !input) return;
          try {
            const payload = key === 'documentos-creditu-email-segundo-proponente-4'
              ? { email_segundo_proponente: input.value.trim() }
              : { telefone_segundo_proponente: input.value.trim() };
            const response = await fetch(apiUrl(`/api/processos/${encodeURIComponent(reserva)}/creditu`), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (!response.ok) {
              const data = await response.json().catch(() => ({}));
              throw new Error(data.detail || data.error || `Nao foi possivel salvar (${response.status}).`);
            }
            updateCredituFieldStatus(key, input.value);
            showNotification('Dados salvos', 'Informacao salva no processo.');
          } catch (error) {
            showNotification('Erro', error instanceof Error ? error.message : 'Nao foi possivel salvar.', 3600);
          }
        });
      });
    }

    const applyWorkflowState = () => {
      root.querySelectorAll<HTMLElement>('.file-row[data-doc]').forEach((row) => {
        try {
          paintDocument(row, workflowState[row.dataset.doc || '']);
        } catch (error) {
          console.error('[CHECKLIST_PAINT_ERROR]', row.dataset.doc, error);
        }
      });
      updateTotal();
    };

    const loadProcesso = async () => {
      if (!reserva) {
        prepareReceiveOnlyButtons();
        return;
      }
      try {
        let cachedState: Record<string, any> = {};
        try {
          const parsedCache = JSON.parse(window.localStorage.getItem(workflowKey) || '{}');
          cachedState = parsedCache && typeof parsedCache === 'object' && !Array.isArray(parsedCache) ? parsedCache : {};
        } catch {
          cachedState = {};
        }
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
        paintTimeline('.kit-caixa', caixaStages, data.caixa, 'caixa');
        paintTimeline('.kit-agehab', agehabStages, data.agehab, 'agehab');

        const state: Record<string, any> = { ...cachedState };
        Object.entries(data.uploadsEnviados || {}).forEach(([docId, enviado]) => {
          if (!enviado) return;
          const upload = data.uploadsCca?.[docId] || {};
          state[docId] = {
            ...(state[docId] || {}),
            status: 'ENVIADO',
            reserva,
            fileName: upload.name || state[docId]?.fileName,
            fileUrl: normalizeUploadUrl(upload.data || state[docId]?.fileUrl),
            updatedAt: state[docId]?.updatedAt || new Date().toISOString(),
          };
        });
        Object.entries(data.documentos || {}).forEach(([docId, status]) => {
          const pendencia = data.pendencias?.[docId] || {};
          const statusVisual = statusFromBackend(String(status));
          const temPendencia = Boolean(pendencia.descricao || pendencia.prazo) && statusVisual === 'PENDENTE';
          state[docId] = {
            ...(state[docId] || {}),
            status: temPendencia ? 'PENDENTE' : statusVisual,
            reserva,
            observacao: temPendencia ? pendencia.descricao || state[docId]?.observacao : undefined,
            prazo: temPendencia ? pendencia.prazo || state[docId]?.prazo : undefined,
            updatedAt: state[docId]?.updatedAt || new Date().toISOString(),
          };
        });
        Object.entries(data.relacionamento || {}).forEach(([key, value]) => {
          const field = Array.from(root.querySelectorAll<HTMLSelectElement>('[data-decision-input]')).find((item) => item.dataset.decisionInput === key);
          if (field && typeof value === 'string') {
            field.value = relationshipResponseLabel(value) === 'Não respondido' ? '' : relationshipResponseLabel(value);
            const row = field.closest<HTMLElement>('.file-row[data-doc]');
            if (row) updateRelationshipResponse(row, value);
          }
        });
        const credituData = data.creditu || {};
        const emailCreditu = root.querySelector<HTMLInputElement>('[data-creditu-input="documentos-creditu-email-segundo-proponente-4"]');
        const telefoneCreditu = root.querySelector<HTMLInputElement>('[data-creditu-input="documentos-creditu-telefone-segundo-proponente-5"]');
        if (emailCreditu) emailCreditu.value = credituData.email_segundo_proponente || '';
        if (telefoneCreditu) telefoneCreditu.value = credituData.telefone_segundo_proponente || '';
        updateCredituFieldStatus('documentos-creditu-email-segundo-proponente-4', emailCreditu?.value || '');
        updateCredituFieldStatus('documentos-creditu-telefone-segundo-proponente-5', telefoneCreditu?.value || '');
        writeWorkflowState(state);
        applyWorkflowState();
      } catch (error) {
        console.error('[CHECKLIST_LOAD_ERROR]', error);
        showNotification('Atencao', error instanceof Error ? error.message : 'Nao foi possivel carregar o checklist do banco.', 4200);
      }
    };

    const tipoDependente = root.querySelector<HTMLSelectElement>('#tipoDependente');
    const dependenteCasadoGroup = root.querySelector<HTMLElement>('#dependenteCasadoGroup');
    const dependenteCasado = root.querySelector<HTMLSelectElement>('#dependenteCasado');
    const tipoRenda = root.querySelector<HTMLSelectElement>('#tipoRenda');
    const btnSalvar = root.querySelector<HTMLButtonElement>('#btnSalvar');
    const btnAcompanhar = root.querySelector<HTMLButtonElement>('#btnAcompanhar');
    const btnProcessChat = root.querySelector<HTMLButtonElement>('#btnProcessChat');
    const caixaStatus = root.querySelector<HTMLSelectElement>('#caixaStatus');
    const agehabStatus = root.querySelector<HTMLSelectElement>('#agehabStatus');
    const ccaConformidadeChip = root.querySelector<HTMLElement>('[data-cca-conformidade-chip]');
    const ccaEnviadoConformidade = root.querySelector<HTMLInputElement>('#ccaEnviadoConformidade');
    if (ccaConformidadeChip) ccaConformidadeChip.hidden = resolvedPerfil !== 'cca';

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
    const onCaixaStatus = () => {
      paintTimeline('.kit-caixa', caixaStages, caixaStatus?.value || 'reserva', 'caixa');
      if (ccaEnviadoConformidade) ccaEnviadoConformidade.checked = false;
    };
    const onAgehabStatus = () => {
      paintTimeline('.kit-agehab', agehabStages, agehabStatus?.value || 'reserva', 'agehab');
    };
    const onCcaConformidade = () => {
      if (ccaEnviadoConformidade?.checked) paintTimeline('.kit-caixa', caixaStages, 'envio_conformidade', 'caixa');
      else paintTimeline('.kit-caixa', caixaStages, caixaStatus?.value || 'formularios_assinados', 'caixa');
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
    caixaStatus?.addEventListener('change', onCaixaStatus);
    agehabStatus?.addEventListener('change', onAgehabStatus);
    ccaEnviadoConformidade?.addEventListener('change', onCcaConformidade);
    btnSalvar?.addEventListener('click', onSalvar);
    btnAcompanhar?.addEventListener('click', onAcompanhar);
    btnProcessChat?.addEventListener('click', openProcessChat);
    loadMessages().catch(() => undefined);
    setupDocumentTable();
    if (ocultarAteInicializar) root.style.visibility = 'visible';
    wireKitCaixaDownload();
    wireKitAgehabDownload();
    wireCredituFields();
    prepareReceiveOnlyButtons();
    if (permissions.canUpload) {
      root.querySelectorAll<HTMLInputElement>('input[data-doc-input]').forEach(wireInput);
    }
    loadProcesso();
    window.addEventListener('focus', loadProcesso);
    window.addEventListener('maq2-workflow-updated', applyWorkflowState);

    return () => {
      window.clearTimeout(notificationTimer);
      tipoDependente?.removeEventListener('change', onTipoDependente);
      tipoRenda?.removeEventListener('change', onTipoRenda);
      caixaStatus?.removeEventListener('change', onCaixaStatus);
      agehabStatus?.removeEventListener('change', onAgehabStatus);
      ccaEnviadoConformidade?.removeEventListener('change', onCcaConformidade);
      btnSalvar?.removeEventListener('click', onSalvar);
      btnAcompanhar?.removeEventListener('click', onAcompanhar);
      btnProcessChat?.removeEventListener('click', openProcessChat);
      document.removeEventListener('click', closeActionMenus);
      window.removeEventListener('focus', loadProcesso);
      window.removeEventListener('maq2-workflow-updated', applyWorkflowState);
    };
  }, [searchParams, pathname, permissions, resolvedPerfil]);

  return (
    <>
      <style>{`@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');\n${checklistCss}`}</style>
      <div ref={rootRef} style={ocultarAteInicializar ? { visibility: 'hidden' } : undefined} dangerouslySetInnerHTML={{ __html: markup }} />
    </>
  );
}

