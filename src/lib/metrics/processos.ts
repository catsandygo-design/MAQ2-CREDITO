export type DiagnosticoGargalo = {
  id_cliente: string;
  id_corretor?: string | null;
  Lead_Time_Total: number;
  Qtd_Retrabalho: number;
  Diagnostico: string;
};

export function metricasOperacionais(processos: any[], diagnosticos: DiagnosticoGargalo[]) {
  const processosComSla = processos.filter((processo) => processo?.sla?.elapsed_seconds);
  const horas = processosComSla.map((processo) => Number(processo.sla.elapsed_seconds || 0) / 3600);
  const mediaHoras = horas.length ? horas.reduce((total, item) => total + item, 0) / horas.length : 0;
  const melhorHoras = horas.length ? Math.min(...horas) : 0;
  const piorHoras = horas.length ? Math.max(...horas) : 0;
  const retrabalhoTotal = diagnosticos.reduce((total, item) => total + Number(item.Qtd_Retrabalho || 0), 0);
  const baseRetrabalho = diagnosticos.length || processos.length || 1;
  const taxaRetrabalho = (retrabalhoTotal / baseRetrabalho) * 100;

  return {
    melhorSla: formatarHoras(melhorHoras),
    mediaSla: formatarHoras(mediaHoras),
    piorSla: formatarHoras(piorHoras),
    slaNeedleAngle: calcularAnguloSla(mediaHoras),
    taxaRetrabalho,
    diagnosticosProblematicos: diagnosticos.filter((item) => item.Diagnostico !== 'Processo Eficiente').length,
  };
}

export function classeRetrabalho(value: number) {
  if (value <= 0) return 'cor-rework cor-rework-ok';
  if (value <= 20) return 'cor-rework cor-rework-warn';
  return 'cor-rework cor-rework-danger';
}

function formatarHoras(value: number) {
  if (!value) return '0h';
  if (value < 1) return `${Math.round(value * 60)}m`;
  return `${Math.round(value)}h`;
}

function calcularAnguloSla(horas: number) {
  const limiteHoras = 72;
  const percentual = Math.min(Math.max(horas, 0), limiteHoras) / limiteHoras;
  return Math.round(-65 + percentual * 130);
}
