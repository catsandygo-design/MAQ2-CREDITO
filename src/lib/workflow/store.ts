import { criarProcessoCv } from './engine';
import type { ProcessoCredito } from './types';

const globalStore = globalThis as typeof globalThis & {
  maq2Processos?: Map<string, ProcessoCredito>;
};

function seed() {
  const processo = criarProcessoCv({
    reserva: '458713',
    cliente: 'Ana Paula Ribeiro',
    corretor: 'Douglas Silva',
  });

  return new Map<string, ProcessoCredito>([[processo.id, processo]]);
}

export function processosStore() {
  if (!globalStore.maq2Processos) {
    globalStore.maq2Processos = seed();
  }

  return globalStore.maq2Processos;
}

export function listProcessos() {
  return Array.from(processosStore().values());
}

export function getProcesso(id: string) {
  return processosStore().get(id) ?? null;
}

export function saveProcesso(processo: ProcessoCredito) {
  processosStore().set(processo.id, processo);
  return processo;
}
