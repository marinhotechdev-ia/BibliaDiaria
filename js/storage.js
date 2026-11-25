/**
 * BIBLE DAILY — storage.js
 * Gerenciamento de persistência via LocalStorage.
 *
 * Estrutura de dados armazenada:
 * {
 *   "bibleDaily_data": {
 *     "days": {
 *       "2024-01-15": {
 *         "psalm":   { bookId, bookName, chapter, read: bool, readAt: ISO|null },
 *         "proverb": { bookId, bookName, chapter, read: bool, readAt: ISO|null },
 *         "general": { bookId, bookName, chapter, read: bool, readAt: ISO|null }
 *       },
 *       ...
 *     },
 *     "settings": {
 *       "theme": "dark"|"light",
 *       "totalChaptersRead": number
 *     }
 *   }
 * }
 */

'use strict';

const STORAGE_KEY = 'bibleDaily_data';

/** Retorna a estrutura raiz do armazenamento (ou cria se não existir). */
function _loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let data;
    if (!raw) {
      data = {
        days: {},
        settings: { theme: 'dark', totalChaptersRead: 0, entropyEnabled: true },
        completedPool: {},
      };
    } else {
      data = JSON.parse(raw);
    }

    if (!data.settings) {
      data.settings = { theme: 'dark', totalChaptersRead: 0, entropyEnabled: true };
    }
    if (data.settings.entropyEnabled === undefined) {
      data.settings.entropyEnabled = true;
    }

    // Inicializa completedPool e migra históricos prévios se necessário
    if (!data.completedPool) {
      data.completedPool = {};
      if (data.days) {
        for (const k of Object.keys(data.days)) {
          const d = data.days[k];
          if (!d) continue;
          ['psalm', 'proverb', 'general'].forEach(type => {
            const item = d[type];
            if (item && item.read && item.bookId && item.chapter) {
              data.completedPool[`${item.bookId}:${item.chapter}`] = item.readAt || new Date().toISOString();
            }
          });
        }
      }
      _saveAll(data);
    }

    return data;
  } catch (e) {
    console.error('[Storage] Erro ao carregar dados:', e);
    return {
      days: {},
      settings: { theme: 'dark', totalChaptersRead: 0, entropyEnabled: true },
      completedPool: {},
    };
  }
}

/** Salva toda a estrutura no LocalStorage. */
function _saveAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[Storage] Erro ao salvar dados:', e);
  }
}

/**
 * Retorna a chave da data no formato YYYY-MM-DD.
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
function getDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Carrega os dados do dia especificado.
 * @param {string} [dateKey] - formato YYYY-MM-DD (padrão: hoje)
 * @returns {object|null}
 */
function loadDay(dateKey = getDateKey()) {
  const data = _loadAll();
  return data.days[dateKey] || null;
}

/**
 * Salva os dados de um dia.
 * @param {string} dateKey
 * @param {object} dayData - { psalm, proverb, general }
 */
function saveDay(dateKey, dayData) {
  const data = _loadAll();
  data.days[dateKey] = dayData;
  _saveAll(data);
}

/**
 * Marca uma leitura como concluída ou desconclui.
 * Melhora a entropia: ao concluir a leitura, o capítulo é adicionado ao completedPool
 * para ser retirado dos próximos sorteios.
 * @param {string} dateKey
 * @param {'psalm'|'proverb'|'general'} type
 * @param {boolean} [read=true]
 */
function markRead(dateKey, type, read = true) {
  const data = _loadAll();
  if (!data.days[dateKey]) return;
  if (!data.days[dateKey][type]) return;

  const item = data.days[dateKey][type];
  const wasRead = item.read;
  item.read = read;
  item.readAt = read ? new Date().toISOString() : null;

  // Atualiza completedPool (retirada do sorteio para alta entropia)
  data.completedPool = data.completedPool || {};
  const poolKey = `${item.bookId}:${item.chapter}`;

  if (read) {
    data.completedPool[poolKey] = item.readAt;
  } else {
    // Se estiver desmarcando, verifica se esse capítulo está concluído em outro dia
    let stillReadElsewhere = false;
    for (const otherKey of Object.keys(data.days)) {
      if (otherKey === dateKey) continue;
      const otherDay = data.days[otherKey];
      if (otherDay) {
        ['psalm', 'proverb', 'general'].forEach(t => {
          const ot = otherDay[t];
          if (ot && ot.read && ot.bookId === item.bookId && ot.chapter === item.chapter) {
            stillReadElsewhere = true;
          }
        });
      }
      if (stillReadElsewhere) break;
    }
    if (!stillReadElsewhere) {
      delete data.completedPool[poolKey];
    }
  }

  // Atualiza contador total
  if (read && !wasRead) {
    data.settings.totalChaptersRead = (data.settings.totalChaptersRead || 0) + 1;
  } else if (!read && wasRead) {
    data.settings.totalChaptersRead = Math.max(0, (data.settings.totalChaptersRead || 0) - 1);
  }

  _saveAll(data);
}

/**
 * Retorna o mapa de capítulos concluídos { "bookId:chapter": timestamp }.
 * @returns {object}
 */
function getCompletedPool() {
  const data = _loadAll();
  return data.completedPool || {};
}

/**
 * Retorna a lista plana de capítulos concluídos [{ bookId, chapter }].
 * @returns {Array<{ bookId: string, chapter: number }>}
 */
function getCompletedList() {
  const pool = getCompletedPool();
  return Object.keys(pool).map(k => {
    const [bookId, chapterStr] = k.split(':');
    return { bookId, chapter: parseInt(chapterStr, 10) };
  });
}

/**
 * Verifica se um capítulo já foi concluído (lido).
 * @param {string} bookId
 * @param {number} chapter
 * @returns {boolean}
 */
function isChapterCompleted(bookId, chapter) {
  const pool = getCompletedPool();
  return Boolean(pool[`${bookId}:${chapter}`]);
}

/**
 * Retorna estatísticas de cobertura e entropia da leitura bíblica.
 * Total da Bíblia: 1.189 capítulos (Salmos: 150, Provérbios: 31, Geral: 1.008).
 * @returns {object}
 */
function getEntropyStats() {
  const pool = getCompletedPool();
  let psalmRead = 0;
  let proverbRead = 0;
  let generalRead = 0;

  for (const k of Object.keys(pool)) {
    if (k.startsWith('PSA:')) {
      psalmRead++;
    } else if (k.startsWith('PRO:')) {
      proverbRead++;
    } else {
      generalRead++;
    }
  }

  const totalRead = psalmRead + proverbRead + generalRead;
  const settings = getSettings();

  return {
    entropyEnabled: settings.entropyEnabled !== false,
    psalm: {
      read: psalmRead,
      total: 150,
      remaining: Math.max(0, 150 - psalmRead),
      percent: Math.round((psalmRead / 150) * 100),
    },
    proverb: {
      read: proverbRead,
      total: 31,
      remaining: Math.max(0, 31 - proverbRead),
      percent: Math.round((proverbRead / 31) * 100),
    },
    general: {
      read: generalRead,
      total: 1008,
      remaining: Math.max(0, 1008 - generalRead),
      percent: Math.round((generalRead / 1008) * 100),
    },
    total: {
      read: totalRead,
      total: 1189,
      remaining: Math.max(0, 1189 - totalRead),
      percent: Math.round((totalRead / 1189) * 100),
    },
  };
}

/**
 * Reinicia o ciclo de sorteio (limpa capítulos excluídos para permitir novos sorteios).
 * @param {'all'|'psalm'|'proverb'|'general'} [type='all']
 */
function resetCompletedPool(type = 'all') {
  const data = _loadAll();
  data.completedPool = data.completedPool || {};

  if (type === 'all') {
    data.completedPool = {};
  } else if (type === 'psalm') {
    for (const k of Object.keys(data.completedPool)) {
      if (k.startsWith('PSA:')) delete data.completedPool[k];
    }
  } else if (type === 'proverb') {
    for (const k of Object.keys(data.completedPool)) {
      if (k.startsWith('PRO:')) delete data.completedPool[k];
    }
  } else if (type === 'general') {
    for (const k of Object.keys(data.completedPool)) {
      if (!k.startsWith('PSA:') && !k.startsWith('PRO:')) delete data.completedPool[k];
    }
  }

  _saveAll(data);
}

/**
 * Marca ou desmarca diretamente um capítulo bíblico no pool de concluídos (pelo Dashboard).
 * Sincroniza também com as leituras do dia atual caso o capítulo coincida.
 * @param {string} bookId
 * @param {number} chapter
 * @param {boolean} [read=true]
 * @returns {boolean}
 */
function setChapterCompleted(bookId, chapter, read = true) {
  const data = _loadAll();
  data.completedPool = data.completedPool || {};
  const poolKey = `${bookId}:${chapter}`;
  const wasRead = Boolean(data.completedPool[poolKey]);

  if (read) {
    data.completedPool[poolKey] = new Date().toISOString();
    if (!wasRead) {
      data.settings.totalChaptersRead = (data.settings.totalChaptersRead || 0) + 1;
    }
  } else {
    delete data.completedPool[poolKey];
    if (wasRead) {
      data.settings.totalChaptersRead = Math.max(0, (data.settings.totalChaptersRead || 0) - 1);
    }
  }

  // Sincroniza com as leituras do dia atual se for o mesmo capítulo
  const todayKey = getDateKey();
  if (data.days[todayKey]) {
    ['psalm', 'proverb', 'general'].forEach(type => {
      const item = data.days[todayKey][type];
      if (item && item.bookId === bookId && item.chapter === chapter) {
        item.read = read;
        item.readAt = read ? new Date().toISOString() : null;
      }
    });
  }

  _saveAll(data);
  return read;
}

/**
 * Ativa ou desativa a condição de alta entropia.
 * @param {boolean} enabled
 */
function setEntropyEnabled(enabled) {
  saveSettings({ entropyEnabled: Boolean(enabled) });
}

/**
 * Verifica se a entropia está ativa.
 * @returns {boolean}
 */
function isEntropyEnabled() {
  return getSettings().entropyEnabled !== false;
}

/**
 * Retorna as configurações do usuário.
 * @returns {{ theme: string, totalChaptersRead: number }}
 */
function getSettings() {
  const data = _loadAll();
  return data.settings || { theme: 'dark', totalChaptersRead: 0 };
}

/**
 * Salva uma ou mais configurações.
 * @param {object} updates - Objeto com as chaves a atualizar
 */
function saveSettings(updates) {
  const data = _loadAll();
  data.settings = { ...(data.settings || {}), ...updates };
  _saveAll(data);
}

/**
 * Retorna o histórico completo de todos os dias.
 * @returns {object} - { "YYYY-MM-DD": { psalm, proverb, general }, ... }
 */
function getAllDays() {
  const data = _loadAll();
  return data.days || {};
}

/**
 * Calcula a sequência de dias consecutivos (streak) até hoje.
 * @returns {number}
 */
function getStreak() {
  const days = getAllDays();
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = getDateKey(d);
    const day = days[key];

    if (!day) {
      // Se hoje ainda não tem sorteio, não quebra o streak no primeiro dia
      if (i === 0) continue;
      break;
    }

    const allRead = day.psalm?.read && day.proverb?.read && day.general?.read;
    if (allRead) {
      streak++;
    } else {
      // Hoje pode estar incompleto sem quebrar o streak
      if (i === 0) continue;
      break;
    }
  }

  return streak;
}

/**
 * Retorna o progresso do dia (quantas leituras concluídas de 3).
 * @param {string} [dateKey]
 * @returns {{ completed: number, total: number, percent: number }}
 */
function getDayProgress(dateKey = getDateKey()) {
  const day = loadDay(dateKey);
  if (!day) return { completed: 0, total: 3, percent: 0 };

  let completed = 0;
  if (day.psalm?.read)   completed++;
  if (day.proverb?.read) completed++;
  if (day.general?.read) completed++;

  return { completed, total: 3, percent: Math.round((completed / 3) * 100) };
}

/**
 * Reinicia o sorteio do dia (apaga os sorteios, mantém histórico dos outros dias).
 * @param {string} [dateKey]
 */
function resetDay(dateKey = getDateKey()) {
  const data = _loadAll();

  // Desconta do total as leituras concluídas que serão perdidas
  const day = data.days[dateKey];
  if (day) {
    let lost = 0;
    if (day.psalm?.read)   lost++;
    if (day.proverb?.read) lost++;
    if (day.general?.read) lost++;
    data.settings.totalChaptersRead = Math.max(0, (data.settings.totalChaptersRead || 0) - lost);
  }

  delete data.days[dateKey];
  _saveAll(data);
}

/**
 * Retorna o total acumulado de capítulos lidos em todos os tempos.
 * @returns {number}
 */
function getTotalChaptersRead() {
  const data = _loadAll();
  return data.settings?.totalChaptersRead || 0;
}

// Exporta via namespace global
window.Storage = {
  getDateKey,
  loadDay,
  saveDay,
  markRead,
  getSettings,
  saveSettings,
  getAllDays,
  getStreak,
  getDayProgress,
  resetDay,
  getTotalChaptersRead,
  getCompletedPool,
  getCompletedList,
  isChapterCompleted,
  getEntropyStats,
  resetCompletedPool,
  setChapterCompleted,
  setEntropyEnabled,
  isEntropyEnabled,
};
