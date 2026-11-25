/**
 * BIBLE DAILY — bible-data.js
 * Dados estruturais da Bíblia: todos os 66 livros com número de capítulos.
 * Tradução: João Ferreira de Almeida (JFA) — Domínio público.
 * Fonte dos textos: API pública bible-api.com (BBE/WEB/ASV licença aberta)
 * ou texto local para as referências canônicas.
 *
 * NOTA IMPORTANTE SOBRE OS TEXTOS:
 * Os textos bíblicos completos são carregados dinamicamente via fetch
 * da API pública bible-api.com que disponibiliza a versão World English Bible (WEB)
 * e outras versões de domínio público. A Almeida Revisada (ACF/ARC) não está
 * disponível em APIs públicas gratuitas sem restrições. Por isso, utilizamos a
 * versão WEB (World English Bible), que é de domínio público completo.
 * A estrutura e funcionalidade do sistema é totalmente compatível com JFA
 * e pode ser substituída facilmente quando um JSON JFA licenciado for obtido.
 */

'use strict';

/** Lista completa de todos os 66 livros bíblicos com seus capítulos */
const BIBLE_BOOKS = [
  // ── ANTIGO TESTAMENTO ──────────────────────────────────────────────
  { id: 'GEN', name: 'Gênesis',        abbr: 'Gn',  chapters: 50, testament: 'AT' },
  { id: 'EXO', name: 'Êxodo',          abbr: 'Ex',  chapters: 40, testament: 'AT' },
  { id: 'LEV', name: 'Levítico',       abbr: 'Lv',  chapters: 27, testament: 'AT' },
  { id: 'NUM', name: 'Números',         abbr: 'Nm',  chapters: 36, testament: 'AT' },
  { id: 'DEU', name: 'Deuteronômio',   abbr: 'Dt',  chapters: 34, testament: 'AT' },
  { id: 'JOS', name: 'Josué',          abbr: 'Js',  chapters: 24, testament: 'AT' },
  { id: 'JDG', name: 'Juízes',         abbr: 'Jz',  chapters: 21, testament: 'AT' },
  { id: 'RUT', name: 'Rute',           abbr: 'Rt',  chapters: 4,  testament: 'AT' },
  { id: '1SA', name: '1 Samuel',       abbr: '1Sm', chapters: 31, testament: 'AT' },
  { id: '2SA', name: '2 Samuel',       abbr: '2Sm', chapters: 24, testament: 'AT' },
  { id: '1KI', name: '1 Reis',         abbr: '1Rs', chapters: 22, testament: 'AT' },
  { id: '2KI', name: '2 Reis',         abbr: '2Rs', chapters: 25, testament: 'AT' },
  { id: '1CH', name: '1 Crônicas',     abbr: '1Cr', chapters: 29, testament: 'AT' },
  { id: '2CH', name: '2 Crônicas',     abbr: '2Cr', chapters: 36, testament: 'AT' },
  { id: 'EZR', name: 'Esdras',         abbr: 'Ed',  chapters: 10, testament: 'AT' },
  { id: 'NEH', name: 'Neemias',        abbr: 'Ne',  chapters: 13, testament: 'AT' },
  { id: 'EST', name: 'Ester',          abbr: 'Et',  chapters: 10, testament: 'AT' },
  { id: 'JOB', name: 'Jó',             abbr: 'Jó',  chapters: 42, testament: 'AT' },
  { id: 'PSA', name: 'Salmos',         abbr: 'Sl',  chapters: 150,testament: 'AT', isPsalms: true },
  { id: 'PRO', name: 'Provérbios',     abbr: 'Pv',  chapters: 31, testament: 'AT', isProverbs: true },
  { id: 'ECC', name: 'Eclesiastes',    abbr: 'Ec',  chapters: 12, testament: 'AT' },
  { id: 'SNG', name: 'Cânticos',       abbr: 'Ct',  chapters: 8,  testament: 'AT' },
  { id: 'ISA', name: 'Isaías',         abbr: 'Is',  chapters: 66, testament: 'AT' },
  { id: 'JER', name: 'Jeremias',       abbr: 'Jr',  chapters: 52, testament: 'AT' },
  { id: 'LAM', name: 'Lamentações',    abbr: 'Lm',  chapters: 5,  testament: 'AT' },
  { id: 'EZK', name: 'Ezequiel',       abbr: 'Ez',  chapters: 48, testament: 'AT' },
  { id: 'DAN', name: 'Daniel',         abbr: 'Dn',  chapters: 12, testament: 'AT' },
  { id: 'HOS', name: 'Oséias',         abbr: 'Os',  chapters: 14, testament: 'AT' },
  { id: 'JOL', name: 'Joel',           abbr: 'Jl',  chapters: 3,  testament: 'AT' },
  { id: 'AMO', name: 'Amós',           abbr: 'Am',  chapters: 9,  testament: 'AT' },
  { id: 'OBA', name: 'Obadias',        abbr: 'Ob',  chapters: 1,  testament: 'AT' },
  { id: 'JON', name: 'Jonas',          abbr: 'Jn',  chapters: 4,  testament: 'AT' },
  { id: 'MIC', name: 'Miquéias',       abbr: 'Mq',  chapters: 7,  testament: 'AT' },
  { id: 'NAM', name: 'Naum',           abbr: 'Na',  chapters: 3,  testament: 'AT' },
  { id: 'HAB', name: 'Habacuque',      abbr: 'Hc',  chapters: 3,  testament: 'AT' },
  { id: 'ZEP', name: 'Sofonias',       abbr: 'Sf',  chapters: 3,  testament: 'AT' },
  { id: 'HAG', name: 'Ageu',           abbr: 'Ag',  chapters: 2,  testament: 'AT' },
  { id: 'ZEC', name: 'Zacarias',       abbr: 'Zc',  chapters: 14, testament: 'AT' },
  { id: 'MAL', name: 'Malaquias',      abbr: 'Ml',  chapters: 4,  testament: 'AT' },
  // ── NOVO TESTAMENTO ────────────────────────────────────────────────
  { id: 'MAT', name: 'Mateus',         abbr: 'Mt',  chapters: 28, testament: 'NT' },
  { id: 'MRK', name: 'Marcos',         abbr: 'Mc',  chapters: 16, testament: 'NT' },
  { id: 'LUK', name: 'Lucas',          abbr: 'Lc',  chapters: 24, testament: 'NT' },
  { id: 'JHN', name: 'João',           abbr: 'Jo',  chapters: 21, testament: 'NT' },
  { id: 'ACT', name: 'Atos',           abbr: 'At',  chapters: 28, testament: 'NT' },
  { id: 'ROM', name: 'Romanos',        abbr: 'Rm',  chapters: 16, testament: 'NT' },
  { id: '1CO', name: '1 Coríntios',    abbr: '1Co', chapters: 16, testament: 'NT' },
  { id: '2CO', name: '2 Coríntios',    abbr: '2Co', chapters: 13, testament: 'NT' },
  { id: 'GAL', name: 'Gálatas',        abbr: 'Gl',  chapters: 6,  testament: 'NT' },
  { id: 'EPH', name: 'Efésios',        abbr: 'Ef',  chapters: 6,  testament: 'NT' },
  { id: 'PHP', name: 'Filipenses',     abbr: 'Fp',  chapters: 4,  testament: 'NT' },
  { id: 'COL', name: 'Colossenses',    abbr: 'Cl',  chapters: 4,  testament: 'NT' },
  { id: '1TH', name: '1 Tessalonicenses', abbr: '1Ts', chapters: 5, testament: 'NT' },
  { id: '2TH', name: '2 Tessalonicenses', abbr: '2Ts', chapters: 3, testament: 'NT' },
  { id: '1TI', name: '1 Timóteo',      abbr: '1Tm', chapters: 6,  testament: 'NT' },
  { id: '2TI', name: '2 Timóteo',      abbr: '2Tm', chapters: 4,  testament: 'NT' },
  { id: 'TIT', name: 'Tito',           abbr: 'Tt',  chapters: 3,  testament: 'NT' },
  { id: 'PHM', name: 'Filemom',        abbr: 'Fm',  chapters: 1,  testament: 'NT' },
  { id: 'HEB', name: 'Hebreus',        abbr: 'Hb',  chapters: 13, testament: 'NT' },
  { id: 'JAS', name: 'Tiago',          abbr: 'Tg',  chapters: 5,  testament: 'NT' },
  { id: '1PE', name: '1 Pedro',        abbr: '1Pe', chapters: 5,  testament: 'NT' },
  { id: '2PE', name: '2 Pedro',        abbr: '2Pe', chapters: 3,  testament: 'NT' },
  { id: '1JN', name: '1 João',         abbr: '1Jo', chapters: 5,  testament: 'NT' },
  { id: '2JN', name: '2 João',         abbr: '2Jo', chapters: 1,  testament: 'NT' },
  { id: '3JN', name: '3 João',         abbr: '3Jo', chapters: 1,  testament: 'NT' },
  { id: 'JUD', name: 'Judas',          abbr: 'Jd',  chapters: 1,  testament: 'NT' },
  { id: 'REV', name: 'Apocalipse',     abbr: 'Ap',  chapters: 22, testament: 'NT' },
];

/** Mapa de ID do livro → objeto do livro para acesso rápido O(1) */
const BOOK_MAP = Object.fromEntries(BIBLE_BOOKS.map(b => [b.id, b]));

/**
 * Gera a lista completa de todos os capítulos válidos para o sorteio geral.
 * Exclui integralmente Salmos (PSA) e Provérbios (PRO).
 * Cada entrada é um objeto { bookId, bookName, chapter }.
 * A geração é feita uma única vez e memoizada.
 */
let _generalChaptersCache = null;
function getGeneralChapters() {
  if (_generalChaptersCache) return _generalChaptersCache;
  _generalChaptersCache = [];
  for (const book of BIBLE_BOOKS) {
    if (book.isPsalms || book.isProverbs) continue; // exclusão obrigatória
    for (let ch = 1; ch <= book.chapters; ch++) {
      _generalChaptersCache.push({ bookId: book.id, bookName: book.name, chapter: ch });
    }
  }
  return _generalChaptersCache;
}

/**
 * Retorna o objeto de livro pelo seu ID.
 * @param {string} bookId
 * @returns {object|null}
 */
function getBook(bookId) {
  return BOOK_MAP[bookId] || null;
}

/**
 * Retorna o livro de Salmos.
 * @returns {object}
 */
function getPsalmsBook() {
  return BOOK_MAP['PSA'];
}

/**
 * Retorna o livro de Provérbios.
 * @returns {object}
 */
function getProverbsBook() {
  return BOOK_MAP['PRO'];
}

/**
 * Mapeamento de IDs de livros para os códigos usados pela API bible-api.com
 * A API usa nomes por extenso em inglês ou abreviações USFM.
 */
const API_BOOK_NAMES = {
  GEN: 'genesis', EXO: 'exodus', LEV: 'leviticus', NUM: 'numbers', DEU: 'deuteronomy',
  JOS: 'joshua', JDG: 'judges', RUT: 'ruth', '1SA': '1+samuel', '2SA': '2+samuel',
  '1KI': '1+kings', '2KI': '2+kings', '1CH': '1+chronicles', '2CH': '2+chronicles',
  EZR: 'ezra', NEH: 'nehemiah', EST: 'esther', JOB: 'job', PSA: 'psalms',
  PRO: 'proverbs', ECC: 'ecclesiastes', SNG: 'song+of+solomon', ISA: 'isaiah',
  JER: 'jeremiah', LAM: 'lamentations', EZK: 'ezekiel', DAN: 'daniel', HOS: 'hosea',
  JOL: 'joel', AMO: 'amos', OBA: 'obadiah', JON: 'jonah', MIC: 'micah',
  NAM: 'nahum', HAB: 'habakkuk', ZEP: 'zephaniah', HAG: 'haggai', ZEC: 'zechariah',
  MAL: 'malachi', MAT: 'matthew', MRK: 'mark', LUK: 'luke', JHN: 'john',
  ACT: 'acts', ROM: 'romans', '1CO': '1+corinthians', '2CO': '2+corinthians',
  GAL: 'galatians', EPH: 'ephesians', PHP: 'philippians', COL: 'colossians',
  '1TH': '1+thessalonians', '2TH': '2+thessalonians', '1TI': '1+timothy',
  '2TI': '2+timothy', TIT: 'titus', PHM: 'philemon', HEB: 'hebrews', JAS: 'james',
  '1PE': '1+peter', '2PE': '2+peter', '1JN': '1+john', '2JN': '2+john',
  '3JN': '3+john', JUD: 'jude', REV: 'revelation',
};

/**
 * Retorna o nome do livro para uso na API.
 * @param {string} bookId
 * @returns {string}
 */
function getApiBookName(bookId) {
  return API_BOOK_NAMES[bookId] || bookId.toLowerCase();
}

/** Mensagens motivacionais com referências bíblicas */
const MOTIVATIONAL_VERSES = [
  { text: 'A tua palavra é lâmpada que ilumina os meus passos e luz que clareia o meu caminho.', ref: 'Salmos 119:105' },
  { text: 'Bem-aventurado o homem que não anda no conselho dos ímpios... e na sua lei medita de dia e de noite.', ref: 'Salmos 1:1-2' },
  { text: 'No princípio era o Verbo, e o Verbo estava com Deus, e o Verbo era Deus.', ref: 'João 1:1' },
  { text: 'Toda a Escritura é divinamente inspirada, e proveitosa para ensinar, para repreender, para corrigir.', ref: '2 Timóteo 3:16' },
  { text: 'Sede fortes e corajosos. Não temais nem vos assusteis... porque o SENHOR, teu Deus, andará contigo.', ref: 'Deuteronômio 31:6' },
  { text: 'O SENHOR é o meu pastor; nada me faltará.', ref: 'Salmos 23:1' },
  { text: 'Busca primeiro o reino de Deus e a sua justiça, e todas estas coisas vos serão acrescentadas.', ref: 'Mateus 6:33' },
  { text: 'Posso tudo naquele que me fortalece.', ref: 'Filipenses 4:13' },
  { text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito.', ref: 'João 3:16' },
  { text: 'Confia no SENHOR de todo o teu coração e não te estribes no teu próprio entendimento.', ref: 'Provérbios 3:5' },
  { text: 'O início da sabedoria é o temor do SENHOR; bom senso têm todos os que praticam os seus preceitos.', ref: 'Salmos 111:10' },
  { text: 'Não vos conformeis com este século, mas transformai-vos pela renovação do vosso entendimento.', ref: 'Romanos 12:2' },
  { text: 'Porque eu bem sei os planos que tenho a vosso respeito, diz o SENHOR.', ref: 'Jeremias 29:11' },
  { text: 'Feliz o homem que acha a sabedoria e o homem que adquire o conhecimento.', ref: 'Provérbios 3:13' },
  { text: 'A palavra de Deus é viva, eficaz e mais cortante do que qualquer espada de dois gumes.', ref: 'Hebreus 4:12' },
];

// Exporta para uso nos outros módulos (via window global em ambiente de browser)
window.BibleData = {
  BIBLE_BOOKS,
  BOOK_MAP,
  getGeneralChapters,
  getBook,
  getPsalmsBook,
  getProverbsBook,
  getApiBookName,
  MOTIVATIONAL_VERSES,
};
