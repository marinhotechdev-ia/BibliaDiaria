/**
 * BIBLE DAILY — randomizer.js
 * Motor de sorteio: implementa seleção aleatória criptograficamente adequada
 * para os três tipos de sorteio (Salmos, Provérbios, Bíblia Geral).
 *
 * GARANTIAS:
 * - Sorteio de Salmos: somente capítulos 1-150 de Salmos.
 * - Sorteio de Provérbios: somente capítulos 1-31 de Provérbios.
 * - Sorteio Geral: lista plana de todos os capítulos dos 64 livros restantes.
 *   Cada capítulo tem a mesma probabilidade de ser sorteado.
 * - Nenhum capítulo aparece duplicado entre os três sorteios do mesmo dia.
 */

'use strict';

/**
 * Retorna um inteiro aleatório no intervalo [min, max] (inclusive).
 * Utiliza crypto.getRandomValues para maior qualidade de aleatoriedade.
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function secureRandomInt(min, max) {
  const range = max - min + 1;
  const maxValid = Math.floor(0xFFFFFFFF / range) * range;
  let rand;
  const arr = new Uint32Array(1);
  do {
    crypto.getRandomValues(arr);
    rand = arr[0];
  } while (rand >= maxValid);
  return min + (rand % range);
}

/**
 * Retorna a lista combinada de exclusões:
 * Capítulos já concluídos (se a condição de entropia estiver ativa) + exclusões explícitas.
 * @param {Array} [explicitExcludes=[]]
 * @returns {Array}
 */
function getActiveExcludes(explicitExcludes = []) {
  const entropyEnabled = (window.Storage && window.Storage.isEntropyEnabled)
    ? window.Storage.isEntropyEnabled()
    : true;

  if (!entropyEnabled) {
    return explicitExcludes.filter(Boolean);
  }

  const completedList = (window.Storage && window.Storage.getCompletedList)
    ? window.Storage.getCompletedList()
    : [];

  return [...completedList, ...explicitExcludes.filter(Boolean)];
}

/**
 * Sorteio de Salmos com melhoria de entropia:
 * Capítulos já lidos são automaticamente retirados do sorteio.
 * @param {Array} [excludeList=[]] - Lista de { bookId, chapter } a evitar adicionalmente
 * @returns {{ bookId: string, bookName: string, chapter: number, cycleReset?: boolean }}
 */
function drawPsalm(excludeList = []) {
  const psalmsBook = window.BibleData.getPsalmsBook();
  const total = psalmsBook.chapters; // 150
  const fullExcludes = getActiveExcludes(excludeList);
  const excluded = new Set(
    fullExcludes
      .filter(e => e.bookId === 'PSA')
      .map(e => e.chapter)
  );

  // Constrói lista de candidatos (capítulos não concluídos e não excluídos)
  let candidates = [];
  for (let ch = 1; ch <= total; ch++) {
    if (!excluded.has(ch)) candidates.push(ch);
  }

  let cycleReset = false;
  if (candidates.length === 0) {
    // Todos os 150 Salmos foram lidos! Reinicia o ciclo de Salmos para novos sorteios
    if (window.Storage && window.Storage.resetCompletedPool) {
      window.Storage.resetCompletedPool('psalm');
    }
    cycleReset = true;
    const explicitSet = new Set(excludeList.filter(e => e && e.bookId === 'PSA').map(e => e.chapter));
    candidates = [];
    for (let ch = 1; ch <= total; ch++) {
      if (!explicitSet.has(ch)) candidates.push(ch);
    }
    if (candidates.length === 0) candidates = [secureRandomInt(1, total)];
  }

  const chosen = candidates[secureRandomInt(0, candidates.length - 1)];
  return { bookId: 'PSA', bookName: psalmsBook.name, chapter: chosen, cycleReset };
}

/**
 * Sorteio de Provérbios com melhoria de entropia:
 * Capítulos já lidos são retirados do sorteio.
 * @param {Array} [excludeList=[]] - Lista de { bookId, chapter } a evitar adicionalmente
 * @returns {{ bookId: string, bookName: string, chapter: number, cycleReset?: boolean }}
 */
function drawProverb(excludeList = []) {
  const proverbsBook = window.BibleData.getProverbsBook();
  const total = proverbsBook.chapters; // 31
  const fullExcludes = getActiveExcludes(excludeList);
  const excluded = new Set(
    fullExcludes
      .filter(e => e.bookId === 'PRO')
      .map(e => e.chapter)
  );

  let candidates = [];
  for (let ch = 1; ch <= total; ch++) {
    if (!excluded.has(ch)) candidates.push(ch);
  }

  let cycleReset = false;
  if (candidates.length === 0) {
    // Todos os 31 Provérbios foram lidos! Reinicia o ciclo de Provérbios
    if (window.Storage && window.Storage.resetCompletedPool) {
      window.Storage.resetCompletedPool('proverb');
    }
    cycleReset = true;
    const explicitSet = new Set(excludeList.filter(e => e && e.bookId === 'PRO').map(e => e.chapter));
    candidates = [];
    for (let ch = 1; ch <= total; ch++) {
      if (!explicitSet.has(ch)) candidates.push(ch);
    }
    if (candidates.length === 0) candidates = [secureRandomInt(1, total)];
  }

  const chosen = candidates[secureRandomInt(0, candidates.length - 1)];
  return { bookId: 'PRO', bookName: proverbsBook.name, chapter: chosen, cycleReset };
}

/**
 * Sorteio Geral com melhoria de entropia:
 * Trabalha com a lista plana de todos os capítulos dos 64 livros excluindo
 * Salmos e Provérbios. Capítulos já concluídos são retirados do sorteio.
 *
 * @param {Array} [excludeList=[]] - Lista de { bookId, chapter } a evitar adicionalmente
 * @returns {{ bookId: string, bookName: string, chapter: number, cycleReset?: boolean }}
 */
function drawGeneral(excludeList = []) {
  const allChapters = window.BibleData.getGeneralChapters();
  const fullExcludes = getActiveExcludes(excludeList);

  const excludedSet = new Set(
    fullExcludes.map(e => `${e.bookId}:${e.chapter}`)
  );

  let candidates = allChapters.filter(
    entry => !excludedSet.has(`${entry.bookId}:${entry.chapter}`)
  );

  let cycleReset = false;
  if (candidates.length === 0) {
    // Todos os 1.008 capítulos gerais foram lidos! Reinicia o ciclo geral
    if (window.Storage && window.Storage.resetCompletedPool) {
      window.Storage.resetCompletedPool('general');
    }
    cycleReset = true;
    const explicitSet = new Set(excludeList.map(e => `${e.bookId}:${e.chapter}`));
    candidates = allChapters.filter(entry => !explicitSet.has(`${entry.bookId}:${entry.chapter}`));
    if (candidates.length === 0) {
      const idx = secureRandomInt(0, allChapters.length - 1);
      return { ...allChapters[idx], cycleReset: true };
    }
  }

  const idx = secureRandomInt(0, candidates.length - 1);
  return { ...candidates[idx], cycleReset };
}

/**
 * Realiza os três sorteios do dia de uma vez, garantindo que não haja
 * repetição de capítulo entre as três seleções.
 *
 * @returns {{ psalm: object, proverb: object, general: object }}
 */
function drawDailyReadings() {
  const psalm   = drawPsalm([]);
  const proverb = drawProverb([psalm]);
  const general = drawGeneral([psalm, proverb]);
  return { psalm, proverb, general };
}

/**
 * Novo sorteio individual de Salmos, evitando conflito com as outras leituras atuais
 * e com o capítulo que já está atualmente no cartão.
 * @param {object} currentProverb - { bookId, chapter }
 * @param {object} currentGeneral - { bookId, chapter }
 * @param {object} [currentPsalm=null] - capítulo atual a evitar repetição imediata
 * @returns {object}
 */
function redrawPsalm(currentProverb, currentGeneral, currentPsalm = null) {
  return drawPsalm([currentProverb, currentGeneral, currentPsalm].filter(Boolean));
}

/**
 * Novo sorteio individual de Provérbios, evitando conflito com as outras leituras atuais
 * e com o capítulo que já está atualmente no cartão.
 * @param {object} currentPsalm - { bookId, chapter }
 * @param {object} currentGeneral - { bookId, chapter }
 * @param {object} [currentProverb=null] - capítulo atual a evitar repetição imediata
 * @returns {object}
 */
function redrawProverb(currentPsalm, currentGeneral, currentProverb = null) {
  return drawProverb([currentPsalm, currentGeneral, currentProverb].filter(Boolean));
}

/**
 * Novo sorteio individual Geral, evitando conflito com as outras leituras atuais
 * e com o capítulo que já está atualmente no cartão.
 * @param {object} currentPsalm - { bookId, chapter }
 * @param {object} currentProverb - { bookId, chapter }
 * @param {object} [currentGeneral=null] - capítulo atual a evitar repetição imediata
 * @returns {object}
 */
function redrawGeneral(currentPsalm, currentProverb, currentGeneral = null) {
  return drawGeneral([currentPsalm, currentProverb, currentGeneral].filter(Boolean));
}

/**
 * Retorna o Provérbio correspondente ao dia do mês atual.
 * Dias 1-31 → capítulos 1-31 de Provérbios.
 * Para meses com menos de 31 dias, os dias além do mês são mapeados
 * ciclicamente (ex: dia 29 de fevereiro → Pv 29).
 * Nunca ultrapassa 31.
 *
 * @param {Date} [date=new Date()]
 * @returns {{ bookId: string, bookName: string, chapter: number, isDaily: true }}
 */
function getTodayProverb(date = new Date()) {
  const day = date.getDate(); // 1-31
  const chapter = Math.min(day, 31); // Provérbios tem 31 capítulos
  const proverbsBook = window.BibleData.getProverbsBook();
  return {
    bookId:   'PRO',
    bookName: proverbsBook.name,
    chapter:  chapter,
    isDaily:  true, // marca que é automático (não sorteado)
  };
}

// Exporta via namespace global
window.Randomizer = {
  drawDailyReadings,
  drawPsalm,
  drawProverb,
  drawGeneral,
  redrawPsalm,
  redrawProverb,
  redrawGeneral,
  getTodayProverb,
  secureRandomInt,
};
