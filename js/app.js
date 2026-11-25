/**
 * BIBLE DAILY — app.js
 * Módulo principal: orquestra a interface, sorteios, leituras e histórico.
 *
 * Dependências (carregadas antes deste arquivo):
 *   - bible-data.js  → window.BibleData
 *   - randomizer.js  → window.Randomizer
 *   - storage.js     → window.Storage
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════════
   ESTADO GLOBAL DO DIA
   ═══════════════════════════════════════════════════════════════════ */

let APP = {
  dateKey: '',
  dayData: null,    // { psalm, proverb, general }
  theme: 'dark',
  motivationalIndex: 0,
  bibleTextCache: {},  // Cache de textos já carregados
  currentReadingModal: null, // { type, bookId, chapter, bookName, read }
};

let DASH_STATE = {
  filter: 'all',      // 'all' | 'AT' | 'NT' | 'POETIC'
  search: '',
  status: 'all',      // 'all' | 'completed' | 'pending'
  selectedChapter: null, // { bookId, chapter, bookName, isCompleted }
};

/* ═══════════════════════════════════════════════════════════════════
   INICIALIZAÇÃO
   ═══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  APP.dateKey = window.Storage.getDateKey();

  // Aplica tema salvo
  const settings = window.Storage.getSettings();
  APP.theme = settings.theme || 'dark';
  applyTheme(APP.theme);

  // Carrega ou cria dados do dia
  loadOrCreateDay();

  // Renderiza interface completa
  renderAll();

  // Inicia rotação de versículos motivacionais
  startMotivationalRotation();

  // Atualiza data/hora a cada minuto
  updateDateTime();
  setInterval(updateDateTime, 60000);

  // Event listeners globais
  bindGlobalEvents();
});

/* ═══════════════════════════════════════════════════════════════════
   LÓGICA DO DIA
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Carrega dados do dia do Storage ou cria novos sorteios se não existir.
 */
function loadOrCreateDay() {
  const saved = window.Storage.loadDay(APP.dateKey);

  // Provérbio do dia é sempre baseado no dia do mês (não sorteado)
  const todayProverb = window.Randomizer.getTodayProverb();

  if (saved) {
    APP.dayData = saved;
    // Garante que o provérbio esteja atualizado para o dia correto
    // (caso o usuário tenha dados de um dia diferente ou versão antiga)
    if (APP.dayData.proverb?.chapter !== todayProverb.chapter) {
      APP.dayData.proverb = { ...todayProverb, read: false, readAt: null };
      window.Storage.saveDay(APP.dateKey, APP.dayData);
    }
  } else {
    // Primeiro acesso do dia: sorteia Salmos e Geral; Provérbio = dia do mês
    const psalm   = window.Randomizer.redrawPsalm(null, todayProverb);
    const general = window.Randomizer.redrawGeneral(psalm, todayProverb);
    APP.dayData = {
      psalm:   { ...psalm,        read: false, readAt: null },
      proverb: { ...todayProverb, read: false, readAt: null },
      general: { ...general,      read: false, readAt: null },
    };
    window.Storage.saveDay(APP.dateKey, APP.dayData);
  }
}

/**
 * Salva o estado atual do dia.
 */
function saveCurrentDay() {
  window.Storage.saveDay(APP.dateKey, APP.dayData);
}

/* ═══════════════════════════════════════════════════════════════════
   RENDERIZAÇÃO PRINCIPAL
   ═══════════════════════════════════════════════════════════════════ */

function renderAll() {
  renderCards();
  renderProgress();
  renderStats();
  renderEntropy();
  renderHistoryPreview();
  renderDashboard();
}

/**
 * Renderiza os três cartões de leitura.
 */
function renderCards() {
  renderCard('psalm',   APP.dayData.psalm,   'Salmos',     'psalm-card');
  renderCard('proverb', APP.dayData.proverb, 'Provérbios', 'proverb-card');
  renderCard('general', APP.dayData.general, 'Bíblia Geral','general-card');
  updatePoolBadges();
}

/**
 * Atualiza os badges de capítulos disponíveis na fila de sorteio (entropia).
 */
function updatePoolBadges() {
  if (!window.Storage || !window.Storage.getEntropyStats) return;
  const stats = window.Storage.getEntropyStats();

  const psalmBadge = document.getElementById('psalm-pool-badge');
  const proverbBadge = document.getElementById('proverb-pool-badge');
  const generalBadge = document.getElementById('general-pool-badge');

  if (psalmBadge) psalmBadge.textContent = `${stats.psalm.remaining} disponíveis`;
  if (proverbBadge) proverbBadge.textContent = `${stats.proverb.remaining} disponíveis`;
  if (generalBadge) generalBadge.textContent = `${stats.general.remaining.toLocaleString('pt-BR')} disponíveis`;

  const modeBadge = document.getElementById('proverb-mode-badge');
  if (modeBadge) {
    modeBadge.textContent = APP.dayData.proverb?.isDaily ? '📅 Pv do dia' : '🎲 Pv sorteado';
  }
}

/**
 * Renderiza um cartão individual.
 * @param {string} type - 'psalm'|'proverb'|'general'
 * @param {object} reading - { bookId, bookName, chapter, read, readAt }
 * @param {string} label - Título do card
 * @param {string} cardId - ID do elemento DOM
 */
function renderCard(type, reading, label, cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;

  // Estado visual de conclusão
  card.classList.toggle('completed', reading.read);

  const chapterEl    = card.querySelector('.reading-chapter');
  const bookNameEl   = card.querySelector('.reading-book');
  const completedTag = card.querySelector('.completed-tag');
  const readBtn      = card.querySelector('.btn-read');
  const markBtn      = card.querySelector('.btn-mark');

  if (chapterEl)    chapterEl.textContent = `Capítulo ${reading.chapter}`;
  if (bookNameEl)   bookNameEl.textContent = reading.bookName;

  if (completedTag) {
    completedTag.style.display = reading.read ? 'flex' : 'none';
    if (reading.readAt) {
      const date = new Date(reading.readAt);
      completedTag.title = `Lido em ${date.toLocaleString('pt-BR')}`;
    }
  }

  if (markBtn) {
    markBtn.textContent = reading.read ? '↩ Desmarcar' : '✓ Marcar como lido';
    markBtn.classList.toggle('btn-unmark', reading.read);
  }

  if (readBtn) {
    readBtn.setAttribute('data-type', type);
  }
  if (markBtn) {
    markBtn.setAttribute('data-type', type);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PROGRESSO E ESTATÍSTICAS
   ═══════════════════════════════════════════════════════════════════ */

function renderProgress() {
  const prog = window.Storage.getDayProgress(APP.dateKey);
  const progressBar   = document.getElementById('progress-bar');
  const progressText  = document.getElementById('progress-text');
  const progressCount = document.getElementById('progress-count');

  if (progressBar)   progressBar.style.width = `${prog.percent}%`;
  if (progressText)  progressText.textContent = `${prog.percent}%`;
  if (progressCount) progressCount.textContent = `${prog.completed} / ${prog.total}`;
}

function renderStats() {
  const streak   = window.Storage.getStreak();
  const total    = window.Storage.getTotalChaptersRead();
  const prog     = window.Storage.getDayProgress(APP.dateKey);
  const allDays  = window.Storage.getAllDays();
  const totalDays = Object.keys(allDays).filter(k => {
    const d = allDays[k];
    return d && (d.psalm || d.proverb || d.general);
  }).length;

  const streakEl    = document.getElementById('streak-count');
  const totalEl     = document.getElementById('total-chapters');
  const todayEl     = document.getElementById('today-completed');
  const totalDaysEl = document.getElementById('total-days');

  if (streakEl)    streakEl.textContent    = streak;
  if (totalEl)     totalEl.textContent     = total;
  if (todayEl)     todayEl.textContent     = prog.completed;
  if (totalDaysEl) totalDaysEl.textContent = totalDays;

  // Atualiza também o aria-valuenow na barra de progresso
  const progressBar = document.getElementById('progress-bar')?.parentElement;
  if (progressBar) progressBar.setAttribute('aria-valuenow', prog.percent);
}

/* ═══════════════════════════════════════════════════════════════════
   ENTROPIA E COBERTURA BÍBLICA
   ═══════════════════════════════════════════════════════════════════ */

function renderEntropy() {
  if (!window.Storage || !window.Storage.getEntropyStats) return;
  const stats = window.Storage.getEntropyStats();

  const psalmVal = document.getElementById('entropy-psalm-val');
  const psalmBar = document.getElementById('entropy-psalm-bar');
  if (psalmVal) psalmVal.textContent = `${stats.psalm.read} / ${stats.psalm.total} lidos (${stats.psalm.remaining} no sorteio)`;
  if (psalmBar) psalmBar.style.width = `${stats.psalm.percent}%`;

  const proverbVal = document.getElementById('entropy-proverb-val');
  const proverbBar = document.getElementById('entropy-proverb-bar');
  if (proverbVal) proverbVal.textContent = `${stats.proverb.read} / ${stats.proverb.total} lidos (${stats.proverb.remaining} no sorteio)`;
  if (proverbBar) proverbBar.style.width = `${stats.proverb.percent}%`;

  const generalVal = document.getElementById('entropy-general-val');
  const generalBar = document.getElementById('entropy-general-bar');
  if (generalVal) generalVal.textContent = `${stats.general.read} / ${stats.general.total.toLocaleString('pt-BR')} lidos (${stats.general.remaining.toLocaleString('pt-BR')} no sorteio)`;
  if (generalBar) generalBar.style.width = `${stats.general.percent}%`;

  const totalVal = document.getElementById('entropy-total-val');
  const totalBar = document.getElementById('entropy-total-bar');
  if (totalVal) totalVal.textContent = `${stats.total.read} / ${stats.total.total.toLocaleString('pt-BR')} capítulos (${stats.total.percent}%)`;
  if (totalBar) totalBar.style.width = `${stats.total.percent}%`;

  const toggle = document.getElementById('entropy-toggle');
  if (toggle) toggle.checked = stats.entropyEnabled;
}

function handleResetPool() {
  if (confirm('Deseja reiniciar o ciclo de sorteio? Todos os capítulos lidos voltarão a ficar disponíveis no sorteio.')) {
    window.Storage.resetCompletedPool('all');
    renderAll();
    showToast('🔄 Ciclo de sorteio reiniciado com sucesso! Todos os 1.189 capítulos estão disponíveis.');
  }
}

function handleEntropyToggle(e) {
  const enabled = e.target.checked;
  window.Storage.setEntropyEnabled(enabled);
  renderAll();
  showToast(enabled ? '⚡ Modo Alta Entropia ativado (sem repetição de capítulos lidos).' : 'Modo padrão ativado.');
}

/* ═══════════════════════════════════════════════════════════════════
   HISTÓRICO
   ═══════════════════════════════════════════════════════════════════ */

function renderHistoryPreview() {
  const allDays = window.Storage.getAllDays();
  const container = document.getElementById('history-list');
  if (!container) return;

  // Ordena por data decrescente
  const sortedKeys = Object.keys(allDays).sort((a, b) => b.localeCompare(a));

  if (sortedKeys.length === 0) {
    container.innerHTML = '<p class="history-empty">Nenhum histórico ainda. Comece hoje!</p>';
    return;
  }

  container.innerHTML = sortedKeys.slice(0, 30).map(key => {
    const day = allDays[key];
    const completed = [day.psalm, day.proverb, day.general].filter(r => r?.read).length;
    const [year, month, dayNum] = key.split('-');
    const dateLabel = new Date(key + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'short', day: '2-digit', month: 'short'
    });

    const isToday = key === APP.dateKey;
    const allDone = completed === 3;

    return `
      <div class="history-item ${allDone ? 'all-done' : ''} ${isToday ? 'today' : ''}">
        <div class="history-date">
          <span class="history-weekday">${dateLabel}</span>
          ${isToday ? '<span class="today-badge">Hoje</span>' : ''}
        </div>
        <div class="history-readings">
          <span class="hist-dot ${day.psalm?.read ? 'done' : ''}" title="Salmos ${day.psalm?.chapter || '?'}">S</span>
          <span class="hist-dot ${day.proverb?.read ? 'done' : ''}" title="Provérbios ${day.proverb?.chapter || '?'}">P</span>
          <span class="hist-dot ${day.general?.read ? 'done' : ''}" title="${day.general?.bookName || '?'} ${day.general?.chapter || '?'}">G</span>
        </div>
        <div class="history-score">${completed}/3</div>
      </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════════════
   DATA E HORA
   ═══════════════════════════════════════════════════════════════════ */

function updateDateTime() {
  const now = new Date();
  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════
   MENSAGENS MOTIVACIONAIS
   ═══════════════════════════════════════════════════════════════════ */

function startMotivationalRotation() {
  const verses = window.BibleData.MOTIVATIONAL_VERSES;
  APP.motivationalIndex = Math.floor(Math.random() * verses.length);
  showMotivationalVerse();
  setInterval(() => {
    APP.motivationalIndex = (APP.motivationalIndex + 1) % verses.length;
    showMotivationalVerse();
  }, 12000);
}

function showMotivationalVerse() {
  const verses = window.BibleData.MOTIVATIONAL_VERSES;
  const verse = verses[APP.motivationalIndex];
  const textEl = document.getElementById('motivational-text');
  const refEl  = document.getElementById('motivational-ref');

  if (textEl && refEl) {
    textEl.classList.add('fade-out');
    refEl.classList.add('fade-out');
    setTimeout(() => {
      textEl.textContent = `"${verse.text}"`;
      refEl.textContent  = `— ${verse.ref}`;
      textEl.classList.remove('fade-out');
      refEl.classList.remove('fade-out');
    }, 400);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   TEMA CLARO / ESCURO
   ═══════════════════════════════════════════════════════════════════ */

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  APP.theme = theme;
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.title = theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro';
  }
}

function toggleTheme() {
  const newTheme = APP.theme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  window.Storage.saveSettings({ theme: newTheme });
}

/* ═══════════════════════════════════════════════════════════════════
   SORTEIOS
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Ponto de entrada ao clicar no botão "Fazer Sorteio Diário".
 * Se houver leituras já concluídas hoje, solicita confirmação para não perder dados.
 */
function handleDailyDrawClick() {
  const hasCompleted = APP.dayData.psalm?.read || APP.dayData.proverb?.read || APP.dayData.general?.read;

  if (hasCompleted) {
    const modal = document.getElementById('draw-confirm-modal');
    if (modal) {
      const readCount = [APP.dayData.psalm, APP.dayData.proverb, APP.dayData.general].filter(r => r?.read).length;
      const textEl = document.getElementById('draw-confirm-text');
      if (textEl) {
        textEl.innerHTML = `Você já possui <strong>${readCount} de 3</strong> leitura(s) marcada(s) como lida(s) hoje. Como deseja realizar o novo sorteio?`;
      }
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      return;
    }
  }

  // Se nenhuma foi concluída ainda, sorteia direto com animação
  executeDailyDraw('all');
}

function closeDrawConfirmModal() {
  const modal = document.getElementById('draw-confirm-modal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

/**
 * Executa o sorteio diário completo das três leituras.
 * @param {'all'|'unread-only'} [mode='all']
 */
async function executeDailyDraw(mode = 'all') {
  closeDrawConfirmModal();

  const cardElements = document.querySelectorAll('.reading-card');
  cardElements.forEach(c => c.classList.add('drawing'));

  await sleep(550);

  // 1. Salmos
  let newPsalm = APP.dayData.psalm;
  if (mode === 'all' || !APP.dayData.psalm?.read) {
    newPsalm = window.Randomizer.drawPsalm([]);
    newPsalm = { ...newPsalm, read: false, readAt: null };
  }

  // 2. Provérbios
  let newProverb = APP.dayData.proverb;
  if (mode === 'all' || !APP.dayData.proverb?.read) {
    newProverb = window.Randomizer.drawProverb([newPsalm]);
    newProverb = { ...newProverb, read: false, readAt: null };
  }

  // 3. Bíblia Geral
  let newGeneral = APP.dayData.general;
  if (mode === 'all' || !APP.dayData.general?.read) {
    newGeneral = window.Randomizer.drawGeneral([newPsalm, newProverb]);
    newGeneral = { ...newGeneral, read: false, readAt: null };
  }

  APP.dayData = {
    psalm: newPsalm,
    proverb: newProverb,
    general: newGeneral,
  };

  saveCurrentDay();
  renderAll();

  cardElements.forEach(c => c.classList.remove('drawing'));

  if (newPsalm.cycleReset || newProverb.cycleReset || newGeneral.cycleReset) {
    showToast('🎉 Todos os capítulos foram lidos! Novo ciclo iniciado. 🎲', 4000);
  } else {
    showToast('🎲 Sorteio diário realizado com sucesso! (Capítulos lidos retirados)', 3500);
  }
}

/**
 * Novo sorteio individual para um tipo específico.
 * @param {'psalm'|'proverb'|'general'} type
 */
async function redraw(type) {
  let newReading;
  if (type === 'psalm') {
    newReading = window.Randomizer.redrawPsalm(APP.dayData.proverb, APP.dayData.general, APP.dayData.psalm);
  } else if (type === 'proverb') {
    newReading = window.Randomizer.redrawProverb(APP.dayData.psalm, APP.dayData.general, APP.dayData.proverb);
  } else {
    newReading = window.Randomizer.redrawGeneral(APP.dayData.psalm, APP.dayData.proverb, APP.dayData.general);
  }

  // Animação de sorteio
  const cardMap = { psalm: 'psalm-card', proverb: 'proverb-card', general: 'general-card' };
  const card = document.getElementById(cardMap[type]);
  if (card) {
    card.classList.add('drawing');
    await sleep(550);
    card.classList.remove('drawing');
  }

  APP.dayData[type] = { ...newReading, read: false, readAt: null };
  saveCurrentDay();
  renderAll();

  if (newReading.cycleReset) {
    showToast('🎉 Ciclo completo! Capítulos reciclados para novos sorteios.', 4000);
  } else {
    showToast(`🎲 Novo capítulo sorteado com sucesso!`);
  }
}

/**
 * Reverte a Leitura 2 para o Provérbio correspondente ao dia do mês atual.
 */
function useTodayProverb() {
  const todayPv = window.Randomizer.getTodayProverb();
  APP.dayData.proverb = { ...todayPv, read: false, readAt: null };
  saveCurrentDay();
  renderAll();
  showToast(`Provérbio definido para o dia de hoje (Pv ${todayPv.chapter})! 📅`);
}

/* ═══════════════════════════════════════════════════════════════════
   MARCAÇÃO DE LEITURA
   ═══════════════════════════════════════════════════════════════════ */

function toggleRead(type) {
  const current = APP.dayData[type].read;
  window.Storage.markRead(APP.dateKey, type, !current);
  APP.dayData = window.Storage.loadDay(APP.dateKey);
  renderAll();

  // Confete e notificação se concluiu todas as 3 leituras
  const prog = window.Storage.getDayProgress(APP.dateKey);
  if (prog.completed === 3 && !current) {
    triggerConfetti();
    setTimeout(() => {
      showToast('🎉 Parabéns! Todas as leituras concluídas! Que tal postar no Status ou Stories? 📸', 4500);
    }, 600);
  } else if (!current) {
    showToast(`✓ Leitura concluída! Capítulo retirado dos próximos sorteios.`);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   LEITURA DO TEXTO BÍBLICO
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Abre o modal de leitura e carrega o texto do capítulo.
 * Suporta tanto as 3 leituras do dia ('psalm'|'proverb'|'general')
 * quanto qualquer capítulo da Bíblia aberto a partir do Dashboard.
 *
 * @param {'psalm'|'proverb'|'general'|string} typeOrBookId
 * @param {number} [chapterNum]
 * @param {string} [customBookName]
 */
async function openReadingModal(typeOrBookId, chapterNum, customBookName) {
  let reading;
  let readingType = null;

  if (typeof typeOrBookId === 'string' && (typeOrBookId === 'psalm' || typeOrBookId === 'proverb' || typeOrBookId === 'general')) {
    readingType = typeOrBookId;
    reading = APP.dayData[typeOrBookId];
  } else if (typeof typeOrBookId === 'object' && typeOrBookId !== null) {
    reading = typeOrBookId;
    if (APP.dayData.psalm?.bookId === reading.bookId && APP.dayData.psalm?.chapter === reading.chapter) readingType = 'psalm';
    else if (APP.dayData.proverb?.bookId === reading.bookId && APP.dayData.proverb?.chapter === reading.chapter) readingType = 'proverb';
    else if (APP.dayData.general?.bookId === reading.bookId && APP.dayData.general?.chapter === reading.chapter) readingType = 'general';
  } else {
    const bookId = typeOrBookId;
    const ch = parseInt(chapterNum, 10);
    const book = window.BibleData ? window.BibleData.getBook(bookId) : null;
    const bName = customBookName || book?.name || bookId;
    const isCompleted = window.Storage.isChapterCompleted(bookId, ch);

    if (APP.dayData.psalm?.bookId === bookId && APP.dayData.psalm?.chapter === ch) readingType = 'psalm';
    else if (APP.dayData.proverb?.bookId === bookId && APP.dayData.proverb?.chapter === ch) readingType = 'proverb';
    else if (APP.dayData.general?.bookId === bookId && APP.dayData.general?.chapter === ch) readingType = 'general';

    reading = {
      bookId,
      chapter: ch,
      bookName: bName,
      read: isCompleted,
    };
  }

  APP.currentReadingModal = {
    type: readingType,
    bookId: reading.bookId,
    chapter: reading.chapter,
    bookName: reading.bookName,
    read: Boolean(reading.read),
  };

  const modal = document.getElementById('reading-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody  = document.getElementById('modal-body');
  const modalMarkBtn = document.getElementById('modal-mark-btn');

  if (!modal) return;

  // Título
  if (modalTitle) {
    modalTitle.textContent = `${reading.bookName} — Capítulo ${reading.chapter}`;
  }

  // Atualiza botão de marcar
  if (modalMarkBtn) {
    if (readingType) {
      modalMarkBtn.setAttribute('data-type', readingType);
    } else {
      modalMarkBtn.removeAttribute('data-type');
    }
    modalMarkBtn.textContent = reading.read ? '↩ Desmarcar leitura' : '✓ Marcar como lido';
    modalMarkBtn.classList.toggle('btn-unmark', reading.read);
  }

  // Mostra loading
  if (modalBody) {
    modalBody.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Carregando texto...</p></div>';
  }

  // Abre modal
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Carrega texto
  try {
    const text = await fetchBibleChapter(reading.bookId, reading.chapter);
    if (modalBody) {
      modalBody.innerHTML = renderChapterHtml(reading, text);
    }
  } catch (err) {
    if (modalBody) {
      modalBody.innerHTML = `
        <div class="error-message">
          <span class="error-icon">⚠️</span>
          <p>Não foi possível carregar o texto do capítulo.</p>
          <p class="error-sub">Verifique sua conexão e tente novamente.</p>
          <p class="error-details">${reading.bookName} ${reading.chapter}</p>
        </div>`;
    }
  }
}

/**
 * Fecha o modal de leitura.
 */
function closeReadingModal() {
  const modal = document.getElementById('reading-modal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

/**
 * Busca o texto de um capítulo via API.
 * Utiliza cache local para evitar requisições repetidas.
 * API: bible-api.com — versão WEB (World English Bible), domínio público.
 *
 * @param {string} bookId
 * @param {number} chapter
 * @returns {Promise<Array<{verse: number, text: string}>>}
 */
async function fetchBibleChapter(bookId, chapter) {
  const cacheKey = `${bookId}:${chapter}`;
  if (APP.bibleTextCache[cacheKey]) return APP.bibleTextCache[cacheKey];

  const bookApiName = window.BibleData.getApiBookName(bookId);
  const url = `https://bible-api.com/${bookApiName}+${chapter}?translation=web`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();

  if (!data.verses || data.verses.length === 0) {
    throw new Error('Nenhum versículo encontrado');
  }

  const verses = data.verses.map(v => ({ verse: v.verse, text: v.text.trim() }));
  APP.bibleTextCache[cacheKey] = verses;
  return verses;
}

/**
 * Gera HTML formatado para exibição do capítulo.
 * @param {object} reading
 * @param {Array} verses
 * @returns {string}
 */
function renderChapterHtml(reading, verses) {
  const versesHtml = verses.map(v => `
    <p class="verse">
      <span class="verse-num">${v.verse}</span>
      <span class="verse-text">${v.text}</span>
    </p>
  `).join('');

  return `
    <div class="chapter-header">
      <h2 class="chapter-title">${reading.bookName}</h2>
      <h3 class="chapter-subtitle">Capítulo ${reading.chapter}</h3>
      <p class="chapter-translation">World English Bible (WEB) — Domínio Público</p>
    </div>
    <div class="verses-container">${versesHtml}</div>
  `;
}

/* ═══════════════════════════════════════════════════════════════════
   CALENDÁRIO
   ═══════════════════════════════════════════════════════════════════ */

let calendarDate = new Date();

function renderCalendar() {
  const allDays = window.Storage.getAllDays();
  const year  = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const calTitle = document.getElementById('cal-title');
  if (calTitle) calTitle.textContent = `${monthNames[month]} ${year}`;

  const grid = document.getElementById('cal-grid');
  if (!grid) return;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = '';

  // Cabeçalho
  ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].forEach(d => {
    html += `<div class="cal-header-day">${d}</div>`;
  });

  // Dias vazios antes
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="cal-day empty"></div>';
  }

  // Dias do mês
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const day = allDays[key];
    const isToday = key === APP.dateKey;
    let statusClass = '';

    if (day) {
      const completed = [day.psalm, day.proverb, day.general].filter(r => r?.read).length;
      if (completed === 3)      statusClass = 'cal-complete';
      else if (completed > 0)   statusClass = 'cal-partial';
      else                      statusClass = 'cal-started';
    }

    html += `<div class="cal-day ${statusClass} ${isToday ? 'cal-today' : ''}" title="${key}">
      <span>${d}</span>
      ${statusClass === 'cal-complete' ? '<span class="cal-check">✓</span>' : ''}
    </div>`;
  }

  grid.innerHTML = html;
}

/* ═══════════════════════════════════════════════════════════════════
   COMPARTILHAR
   ═══════════════════════════════════════════════════════════════════ */

function shareReading() {
  const { psalm, proverb, general } = APP.dayData;
  const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const text = `📖 BIBLE DAILY — ${dateStr}\n\n` +
    `📕 Salmos ${psalm.chapter}\n` +
    `📗 Provérbios ${proverb.chapter}\n` +
    `📘 ${general.bookName} ${general.chapter}\n\n` +
    `"Três leituras por dia. Uma jornada com Deus."\n\nhttps://bibliarandon.app`;

  if (navigator.share) {
    navigator.share({ title: 'Bible Daily — Leitura do Dia', text });
  } else {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Leitura copiada para a área de transferência! 📋');
    }).catch(() => {
      showToast('Não foi possível copiar. Tente manualmente.');
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════
   REINICIAR O DIA
   ═══════════════════════════════════════════════════════════════════ */

function confirmResetDay() {
  const overlay = document.getElementById('confirm-overlay');
  if (overlay) overlay.classList.add('open');
}

function cancelReset() {
  const overlay = document.getElementById('confirm-overlay');
  if (overlay) overlay.classList.remove('open');
}

function executeResetDay() {
  window.Storage.resetDay(APP.dateKey);
  loadOrCreateDay();
  renderAll();
  cancelReset();
  showToast('Novo sorteio realizado para hoje! 🎲');
}

/* ═══════════════════════════════════════════════════════════════════
   UTILITÁRIOS
   ═══════════════════════════════════════════════════════════════════ */

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), duration);
}

function triggerConfetti() {
  const container = document.getElementById('confetti-container');
  if (!container) return;
  container.innerHTML = '';

  const colors = ['#FFD700','#FFC107','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `
      left: ${Math.random() * 100}%;
      animation-delay: ${Math.random() * 1}s;
      animation-duration: ${2 + Math.random() * 2}s;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    container.appendChild(el);
  }

  setTimeout(() => { container.innerHTML = ''; }, 4000);
}

/* ═══════════════════════════════════════════════════════════════════
   DASHBOARD: EVOLUÇÃO DA LEITURA BÍBLICA
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Renderiza o painel Dashboard com a evolução e quadradinhos de todos os capítulos.
 */
function renderDashboard() {
  if (!window.BibleData || !window.BibleData.BIBLE_BOOKS || !window.Storage) return;

  const books = window.BibleData.BIBLE_BOOKS;
  const completedPool = window.Storage.getCompletedPool();

  // 1. Estatísticas gerais dos 1.189 capítulos
  let totalRead = 0;
  let atRead = 0;
  let ntRead = 0;
  let poeticRead = 0;

  books.forEach(b => {
    for (let c = 1; c <= b.chapters; c++) {
      if (completedPool[`${b.id}:${c}`]) {
        totalRead++;
        if (b.testament === 'AT') atRead++;
        if (b.testament === 'NT') ntRead++;
        if (b.id === 'PSA' || b.id === 'PRO') poeticRead++;
      }
    }
  });

  const totalPct = Math.round((totalRead / 1189) * 100);
  const atPct = Math.round((atRead / 929) * 100);
  const ntPct = Math.round((ntRead / 260) * 100);
  const poeticPct = Math.round((poeticRead / 181) * 100);

  // Atualiza os 4 cards de resumo do Dashboard
  const totalValEl = document.getElementById('dash-total-val');
  const totalPctEl = document.getElementById('dash-total-pct');
  const totalBarEl = document.getElementById('dash-total-bar');
  if (totalValEl) totalValEl.textContent = `${totalRead.toLocaleString('pt-BR')} / 1.189`;
  if (totalPctEl) totalPctEl.textContent = `${totalPct}%`;
  if (totalBarEl) totalBarEl.style.width = `${totalPct}%`;

  const atValEl = document.getElementById('dash-at-val');
  const atPctEl = document.getElementById('dash-at-pct');
  const atBarEl = document.getElementById('dash-at-bar');
  if (atValEl) atValEl.textContent = `${atRead} / 929`;
  if (atPctEl) atPctEl.textContent = `${atPct}%`;
  if (atBarEl) atBarEl.style.width = `${atPct}%`;

  const ntValEl = document.getElementById('dash-nt-val');
  const ntPctEl = document.getElementById('dash-nt-pct');
  const ntBarEl = document.getElementById('dash-nt-bar');
  if (ntValEl) ntValEl.textContent = `${ntRead} / 260`;
  if (ntPctEl) ntPctEl.textContent = `${ntPct}%`;
  if (ntBarEl) ntBarEl.style.width = `${ntPct}%`;

  const poeticValEl = document.getElementById('dash-poetic-val');
  const poeticPctEl = document.getElementById('dash-poetic-pct');
  const poeticBarEl = document.getElementById('dash-poetic-bar');
  if (poeticValEl) poeticValEl.textContent = `${poeticRead} / 181`;
  if (poeticPctEl) poeticPctEl.textContent = `${poeticPct}%`;
  if (poeticBarEl) poeticBarEl.style.width = `${poeticPct}%`;

  // 2. Filtragem de livros
  const container = document.getElementById('dashboard-books-container');
  if (!container) return;

  const query = (DASH_STATE.search || '').toLowerCase().trim();
  const filter = DASH_STATE.filter || 'all';
  const statusFilter = DASH_STATE.status || 'all';

  const filteredBooks = books.filter(b => {
    // Filtro por testamento / poéticos
    if (filter === 'AT' && b.testament !== 'AT') return false;
    if (filter === 'NT' && b.testament !== 'NT') return false;
    if (filter === 'POETIC' && b.id !== 'PSA' && b.id !== 'PRO') return false;

    // Filtro por texto de busca
    if (query) {
      const matchName = b.name.toLowerCase().includes(query);
      const matchAbbr = b.abbr.toLowerCase().includes(query);
      if (!matchName && !matchAbbr) return false;
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      let bookReadCount = 0;
      for (let c = 1; c <= b.chapters; c++) {
        if (completedPool[`${b.id}:${c}`]) bookReadCount++;
      }
      if (statusFilter === 'completed' && bookReadCount === 0) return false;
      if (statusFilter === 'pending' && bookReadCount === b.chapters) return false;
    }

    return true;
  });

  if (filteredBooks.length === 0) {
    container.innerHTML = `
      <div class="dash-empty-state">
        <p>🔍 Nenhum livro encontrado com os filtros aplicados.</p>
        <button class="btn btn-outline btn-sm" id="dash-clear-filters-btn" style="margin-top:12px;">Limpar filtros</button>
      </div>`;
    document.getElementById('dash-clear-filters-btn')?.addEventListener('click', () => {
      DASH_STATE.filter = 'all';
      DASH_STATE.search = '';
      DASH_STATE.status = 'all';
      const searchInput = document.getElementById('dash-search-input');
      if (searchInput) searchInput.value = '';
      const clearBtn = document.getElementById('dash-search-clear');
      if (clearBtn) clearBtn.style.display = 'none';
      const statusSelect = document.getElementById('dash-status-filter');
      if (statusSelect) statusSelect.value = 'all';
      document.querySelectorAll('.dash-chip').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-filter') === 'all');
      });
      renderDashboard();
    });
    return;
  }

  // 3. Renderiza os cards de livros com seus quadradinhos
  let html = '';
  filteredBooks.forEach(book => {
    let completedCount = 0;
    let squaresHtml = '';

    for (let c = 1; c <= book.chapters; c++) {
      const isCompleted = Boolean(completedPool[`${book.id}:${c}`]);
      if (isCompleted) completedCount++;

      let isHidden = false;
      if (statusFilter === 'completed' && !isCompleted) isHidden = true;
      if (statusFilter === 'pending' && isCompleted) isHidden = true;

      const squareClass = `chapter-square${isCompleted ? ' completed' : ''}${isHidden ? ' status-hidden' : ''}`;
      const statusLabel = isCompleted ? 'Concluído (Cor forte)' : 'Pendente';

      squaresHtml += `
        <button
          type="button"
          class="${squareClass}"
          data-book-id="${book.id}"
          data-chapter="${c}"
          data-book-name="${book.name}"
          title="${book.name} ${c} • ${statusLabel} — Clique para ler ou marcar"
          aria-label="${book.name} capítulo ${c}, ${statusLabel}"
        >${c}</button>
      `;
    }

    const pct = Math.round((completedCount / book.chapters) * 100);
    const isAllDone = completedCount === book.chapters;
    const testClass = book.testament === 'AT' ? 'at' : 'nt';
    const testLabel = book.testament === 'AT' ? 'Antigo Testamento' : 'Novo Testamento';

    html += `
      <article class="book-card ${isAllDone ? 'book-all-done' : ''}" data-book-id="${book.id}">
        <div class="book-card-header">
          <div class="book-title-group">
            <h3 class="book-name">${book.name}</h3>
            <span class="book-testament-badge ${testClass}">${testLabel} (${book.abbr})</span>
          </div>
          <div class="book-progress-pill ${isAllDone ? 'done' : ''}">
            ${completedCount} / ${book.chapters} lidos (${pct}%)
          </div>
        </div>
        <div class="book-bar-track" aria-hidden="true">
          <div class="book-bar-fill" style="width: ${pct}%"></div>
        </div>
        <div class="chapters-squares-grid">
          ${squaresHtml}
        </div>
      </article>
    `;
  });

  container.innerHTML = html;
}

/**
 * Abre o modal de ação rápida para o capítulo selecionado no Dashboard.
 */
function handleChapterSquareClick(bookId, chapter, bookName) {
  const isCompleted = window.Storage.isChapterCompleted(bookId, chapter);
  DASH_STATE.selectedChapter = { bookId, chapter, bookName, isCompleted };

  const modal = document.getElementById('chapter-action-modal');
  const titleEl = document.getElementById('chapter-action-title');
  const iconEl = document.getElementById('chapter-action-icon');
  const badgeEl = document.getElementById('chapter-action-status-badge');
  const infoEl = document.getElementById('chapter-action-info-text');
  const toggleBtn = document.getElementById('chapter-action-toggle-btn');

  if (!modal) return;

  if (titleEl) titleEl.textContent = `${bookName} — Capítulo ${chapter}`;
  if (iconEl) iconEl.textContent = isCompleted ? '✅' : '📖';

  if (badgeEl) {
    badgeEl.className = `chapter-status-pill ${isCompleted ? 'completed' : 'pending'}`;
    badgeEl.textContent = isCompleted ? '✓ Concluído (Lido)' : '⏳ Leitura Pendente';
  }

  if (infoEl) {
    infoEl.textContent = isCompleted
      ? 'Este capítulo já foi lido e está excluído dos próximos sorteios. Deseja reler ou desmarcá-lo?'
      : 'Este capítulo está pendente e disponível nos sorteios. Deseja ler agora ou marcar como concluído?';
  }

  if (toggleBtn) {
    toggleBtn.textContent = isCompleted ? '↩ Desmarcar leitura' : '✓ Marcar como lido';
    toggleBtn.className = `btn ${isCompleted ? 'btn-outline' : 'btn-success'}`;
  }

  modal.classList.add('open');
}

/**
 * Fecha o modal de ação rápida do Dashboard.
 */
function closeChapterActionModal() {
  const modal = document.getElementById('chapter-action-modal');
  if (modal) modal.classList.remove('open');
  DASH_STATE.selectedChapter = null;
}

/**
 * Alterna a conclusão do capítulo a partir do modal rápido do Dashboard.
 */
function executeChapterToggleFromModal() {
  if (!DASH_STATE.selectedChapter) return;
  const { bookId, chapter, bookName, isCompleted } = DASH_STATE.selectedChapter;
  const newStatus = !isCompleted;

  window.Storage.setChapterCompleted(bookId, chapter, newStatus);

  // Sincroniza com as leituras do dia atual caso coincida
  let matchedDaily = false;
  ['psalm', 'proverb', 'general'].forEach(type => {
    if (APP.dayData[type] && APP.dayData[type].bookId === bookId && APP.dayData[type].chapter === chapter) {
      APP.dayData[type].read = newStatus;
      APP.dayData[type].readAt = newStatus ? new Date().toISOString() : null;
      matchedDaily = true;
    }
  });

  if (matchedDaily) {
    saveCurrentDay();
  }

  closeChapterActionModal();
  renderAll();

  if (newStatus) {
    showToast(`✓ ${bookName} ${chapter} marcado como concluído!`);
  } else {
    showToast(`↩ ${bookName} ${chapter} desmarcado.`);
  }

  // Se completou as 3 de hoje, confete
  const prog = window.Storage.getDayProgress(APP.dateKey);
  if (prog.completed === 3 && newStatus && matchedDaily) {
    triggerConfetti();
  }
}

/**
 * Abre o modal de leitura completa a partir do modal rápido do Dashboard.
 */
function executeChapterReadFromModal() {
  if (!DASH_STATE.selectedChapter) return;
  const { bookId, chapter, bookName } = DASH_STATE.selectedChapter;
  closeChapterActionModal();
  openReadingModal(bookId, chapter, bookName);
}

/* ═══════════════════════════════════════════════════════════════════
   NAVEGAÇÃO POR ABAS
   ═══════════════════════════════════════════════════════════════════ */

function switchTab(tabName) {
  // Desativa todas as abas
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));

  // Ativa a aba solicitada
  const btn = document.querySelector(`[data-tab="${tabName}"]`);
  const panel = document.getElementById(`tab-${tabName}`);
  if (btn) btn.classList.add('active');
  if (panel) panel.classList.add('active');

  if (tabName === 'dashboard') renderDashboard();
  if (tabName === 'calendar')  renderCalendar();
  if (tabName === 'history')   renderHistoryPreview();
}

/* ═══════════════════════════════════════════════════════════════════
   EVENTOS GLOBAIS
   ═══════════════════════════════════════════════════════════════════ */

function bindGlobalEvents() {
  // Tema
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

  // Compartilhar (texto)
  document.getElementById('share-btn')?.addEventListener('click', shareReading);

  // Botões de Sorteio Diário (Principal e Header)
  document.getElementById('btn-daily-draw-main')?.addEventListener('click', handleDailyDrawClick);
  document.getElementById('header-draw-btn')?.addEventListener('click', handleDailyDrawClick);

  // Botões de Gerar Imagem / Print para Status e Instagram (Principal e Header)
  document.getElementById('btn-story-main')?.addEventListener('click', () => {
    window.StoryGenerator.openStoryModal(APP.dayData);
  });
  document.getElementById('story-btn')?.addEventListener('click', () => {
    window.StoryGenerator.openStoryModal(APP.dayData);
  });

  // Modal de Confirmação de Sorteio Diário
  document.getElementById('draw-unread-only-btn')?.addEventListener('click', () => executeDailyDraw('unread-only'));
  document.getElementById('draw-all-btn')?.addEventListener('click', () => executeDailyDraw('all'));
  document.getElementById('draw-cancel-btn')?.addEventListener('click', closeDrawConfirmModal);
  document.getElementById('draw-confirm-modal')?.addEventListener('click', e => {
    if (e.target.id === 'draw-confirm-modal') closeDrawConfirmModal();
  });

  // Botão Pv do dia (reverte para provérbio do dia do mês)
  document.getElementById('btn-pv-day')?.addEventListener('click', useTodayProverb);

  // Entropia: toggle e reset de pool
  document.getElementById('entropy-toggle')?.addEventListener('change', handleEntropyToggle);
  document.getElementById('btn-reset-pool')?.addEventListener('click', handleResetPool);

  // Reiniciar dia (aba estatísticas)
  document.getElementById('reset-day-btn')?.addEventListener('click', confirmResetDay);
  document.getElementById('confirm-cancel')?.addEventListener('click', cancelReset);
  document.getElementById('confirm-ok')?.addEventListener('click', executeResetDay);

  // Fechar modal de leitura
  document.getElementById('modal-close')?.addEventListener('click', closeReadingModal);
  document.getElementById('reading-modal')?.addEventListener('click', e => {
    if (e.target.id === 'reading-modal') closeReadingModal();
  });

  // Botão marcar dentro do modal de leitura (suporta diário e qualquer capítulo do Dashboard)
  document.getElementById('modal-mark-btn')?.addEventListener('click', function() {
    if (APP.currentReadingModal && !APP.currentReadingModal.type) {
      const cur = APP.currentReadingModal;
      const newStatus = !cur.read;
      window.Storage.setChapterCompleted(cur.bookId, cur.chapter, newStatus);
      cur.read = newStatus;

      // Sincroniza com as leituras do dia atual caso coincida
      let matchedDaily = false;
      ['psalm', 'proverb', 'general'].forEach(t => {
        if (APP.dayData[t] && APP.dayData[t].bookId === cur.bookId && APP.dayData[t].chapter === cur.chapter) {
          APP.dayData[t].read = newStatus;
          APP.dayData[t].readAt = newStatus ? new Date().toISOString() : null;
          matchedDaily = true;
        }
      });

      if (matchedDaily) {
        saveCurrentDay();
      }

      renderAll();
      this.textContent = cur.read ? '↩ Desmarcar leitura' : '✓ Marcar como lido';
      this.classList.toggle('btn-unmark', cur.read);
      showToast(newStatus ? `✓ ${cur.bookName} ${cur.chapter} marcado como concluído!` : `↩ ${cur.bookName} ${cur.chapter} desmarcado.`);
      return;
    }

    const type = this.getAttribute('data-type') || (APP.currentReadingModal && APP.currentReadingModal.type);
    if (type) {
      toggleRead(type);
      if (APP.currentReadingModal) {
        APP.currentReadingModal.read = APP.dayData[type].read;
      }
      this.textContent = APP.dayData[type].read ? '↩ Desmarcar leitura' : '✓ Marcar como lido';
      this.classList.toggle('btn-unmark', APP.dayData[type].read);
    }
  });

  // Botões de sortear (delegação nos cards diários)
  document.addEventListener('click', async (e) => {
    const drawBtn = e.target.closest('.btn-draw');
    if (drawBtn) {
      const type = drawBtn.getAttribute('data-type');
      if (type) await redraw(type);
    }

    const readBtn = e.target.closest('.btn-read');
    if (readBtn) {
      const type = readBtn.getAttribute('data-type');
      if (type) await openReadingModal(type);
    }

    const markBtn = e.target.closest('.btn-mark');
    if (markBtn) {
      const type = markBtn.getAttribute('data-type');
      if (type) toggleRead(type);
    }
  });

  // Abas
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) switchTab(tab);
    });
  });

  // ── Dashboard: Filtros por chip ──
  document.querySelectorAll('.dash-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.dash-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      DASH_STATE.filter = chip.getAttribute('data-filter') || 'all';
      renderDashboard();
    });
  });

  // ── Dashboard: Busca de livro ──
  const dashSearchInput = document.getElementById('dash-search-input');
  const dashSearchClear = document.getElementById('dash-search-clear');

  dashSearchInput?.addEventListener('input', e => {
    DASH_STATE.search = e.target.value.toLowerCase().trim();
    if (dashSearchClear) {
      dashSearchClear.style.display = DASH_STATE.search ? 'block' : 'none';
    }
    renderDashboard();
  });

  dashSearchClear?.addEventListener('click', () => {
    if (dashSearchInput) dashSearchInput.value = '';
    DASH_STATE.search = '';
    dashSearchClear.style.display = 'none';
    renderDashboard();
  });

  // ── Dashboard: Filtro de status ──
  document.getElementById('dash-status-filter')?.addEventListener('change', e => {
    DASH_STATE.status = e.target.value;
    renderDashboard();
  });

  // ── Dashboard: Delegação de clique nos quadradinhos de capítulos ──
  document.getElementById('dashboard-books-container')?.addEventListener('click', e => {
    const square = e.target.closest('.chapter-square');
    if (square) {
      const bookId = square.getAttribute('data-book-id');
      const chapter = parseInt(square.getAttribute('data-chapter'), 10);
      const bookName = square.getAttribute('data-book-name');
      handleChapterSquareClick(bookId, chapter, bookName);
    }
  });

  // ── Dashboard: Modal de Ação Rápida de Capítulo ──
  document.getElementById('chapter-action-read-btn')?.addEventListener('click', executeChapterReadFromModal);
  document.getElementById('chapter-action-toggle-btn')?.addEventListener('click', executeChapterToggleFromModal);
  document.getElementById('chapter-action-close-btn')?.addEventListener('click', closeChapterActionModal);
  document.getElementById('chapter-action-modal')?.addEventListener('click', e => {
    if (e.target.id === 'chapter-action-modal') closeChapterActionModal();
  });

  // Calendário — navegação de mês
  document.getElementById('cal-prev')?.addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('cal-next')?.addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
  });

  // ESC fecha modais
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeReadingModal();
      closeChapterActionModal();
      cancelReset();
      closeDrawConfirmModal();
      if (window.StoryGenerator && window.StoryGenerator.closeStoryModal) {
        window.StoryGenerator.closeStoryModal();
      }
    }
  });
}
