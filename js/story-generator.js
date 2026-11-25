/**
 * BIBLE DAILY — story-generator.js
 * Gerador de imagem para stories/status em redes sociais.
 *
 * Usa exclusivamente a Canvas API nativa do browser — sem dependências externas.
 * Gera uma imagem no formato retrato (1080×1920 px, proporção 9:16 — padrão stories).
 *
 * A imagem exibe:
 *   - Logotipo e título BIBLE DAILY
 *   - Data do dia
 *   - Os três cartões de leitura (Salmos, Provérbios do Dia, Bíblia Geral)
 *   - Slogan e rodapé com versículo motivacional
 */

'use strict';

/* ── Dimensões do canvas (proporção 9:16 para stories) ───────────── */
const CANVAS_W = 1080;
const CANVAS_H = 1920;

/* ── Paleta de cores do gerador ──────────────────────────────────── */
const COLORS = {
  bgTop:        '#070b18',
  bgBottom:     '#0d1a2e',
  gold:         '#d4a853',
  goldLight:    '#f0c97a',
  goldDark:     '#a67c3a',
  green:        '#50c878',
  greenAlpha:   'rgba(80, 200, 120, 0.18)',
  greenBorder:  'rgba(80, 200, 120, 0.55)',
  white:        '#ffffff',
  whiteAlpha:   'rgba(240, 237, 230, 0.90)',
  mutedText:    'rgba(240, 237, 230, 0.60)',
  card:         'rgba(15, 24, 40, 0.90)',
  cardBorder:   'rgba(255, 255, 255, 0.12)',
  psalm:        '#f0c97a',
  proverb:      '#7fe8a3',
  general:      '#6ba7ec',
  generalAlpha: 'rgba(107, 167, 236, 0.18)',
  generalBorder:'rgba(107, 167, 236, 0.50)',
};

/* ── Fontes (devem estar carregadas no documento) ────────────────── */
const FONT = {
  title:    'bold 72px Cinzel, Georgia, serif',
  titleSm:  'bold 48px Cinzel, Georgia, serif',
  heading:  '600 44px Cinzel, Georgia, serif',
  headingSm:'600 36px Cinzel, Georgia, serif',
  label:    '700 28px Inter, Arial, sans-serif',
  body:     '400 30px Inter, Arial, sans-serif',
  bodySm:   '400 26px Inter, Arial, sans-serif',
  small:    '400 24px Inter, Arial, sans-serif',
  tiny:     '400 22px Inter, Arial, sans-serif',
  badge:    '700 22px Inter, Arial, sans-serif',
  slogan:   '300 30px Inter, Arial, sans-serif',
};

/* ═══════════════════════════════════════════════════════════════════
   UTILITÁRIOS DE DESENHO
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Desenha um retângulo arredondado e SEMPRE inicia um novo path isolado.
 * Suporta corner radius como número único ou array [tl, tr, br, bl].
 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  const radius = typeof r === 'number'
    ? { tl: r, tr: r, br: r, bl: r }
    : Array.isArray(r)
      ? { tl: r[0] || 0, tr: r[1] || 0, br: r[2] || 0, bl: r[3] || 0 }
      : { tl: 0, tr: 0, br: 0, bl: 0 };

  const maxR = Math.min(w / 2, h / 2);
  const tl = Math.max(0, Math.min(radius.tl, maxR));
  const tr = Math.max(0, Math.min(radius.tr, maxR));
  const br = Math.max(0, Math.min(radius.br, maxR));
  const bl = Math.max(0, Math.min(radius.bl, maxR));

  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

/**
 * Quebra texto longo em múltiplas linhas respeitando uma largura máxima.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @returns {string[]}
 */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Desenha texto com sombra dourada suave.
 */
function drawGoldText(ctx, text, x, y, font, align = 'center') {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.shadowColor = 'rgba(212,168,83,0.4)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = COLORS.gold;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Desenha um separador com gradiente dourado.
 */
function drawDivider(ctx, y, cx) {
  const grad = ctx.createLinearGradient(cx - 300, y, cx + 300, y);
  grad.addColorStop(0,   'transparent');
  grad.addColorStop(0.3, COLORS.gold);
  grad.addColorStop(0.7, COLORS.gold);
  grad.addColorStop(1,   'transparent');
  ctx.save();
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(cx - 300, y);
  ctx.lineTo(cx + 300, y);
  ctx.stroke();
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENTES VISUAIS
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Desenha o fundo do canvas com gradiente e partículas.
 */
function drawBackground(ctx) {
  // Gradiente principal
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0,   '#070b18');
  grad.addColorStop(0.5, '#0d1523');
  grad.addColorStop(1,   '#07090f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Glow superior (azul-arroxeado sutil)
  const glowTop = ctx.createRadialGradient(540, 0, 0, 540, 0, 800);
  glowTop.addColorStop(0,   'rgba(74,90,180,0.18)');
  glowTop.addColorStop(1,   'transparent');
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Glow dourado inferior
  const glowBot = ctx.createRadialGradient(540, CANVAS_H, 0, 540, CANVAS_H, 700);
  glowBot.addColorStop(0,   'rgba(212,168,83,0.08)');
  glowBot.addColorStop(1,   'transparent');
  ctx.fillStyle = glowBot;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Estrelas (pontos pequenos)
  ctx.save();
  const starSeeds = [
    [120,80,1.5],[300,45,1],[500,100,2],[700,60,1.5],[900,30,1],
    [200,200,1],[800,150,1.5],[100,350,1],[950,280,1],[350,310,2],
    [640,180,1],[450,50,1.5],[820,400,1],[60,420,2],[750,500,1],
  ];
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (const [sx, sy, sr] of starSeeds) {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Borda de luz dourada no topo
  const topBorder = ctx.createLinearGradient(0, 0, CANVAS_W, 0);
  topBorder.addColorStop(0,   'transparent');
  topBorder.addColorStop(0.2, COLORS.gold);
  topBorder.addColorStop(0.8, COLORS.gold);
  topBorder.addColorStop(1,   'transparent');
  ctx.save();
  ctx.strokeStyle = topBorder;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(CANVAS_W, 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * Desenha o cabeçalho: emoji, título, slogan, data.
 */
function drawHeader(ctx, dateStr) {
  const cx = CANVAS_W / 2;
  let y = 100;

  // Emoji ícone de livro
  ctx.save();
  ctx.font = '80px serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(212,168,83,0.6)';
  ctx.shadowBlur = 30;
  ctx.fillText('📖', cx, y + 70);
  ctx.restore();
  y += 110;

  // Título BÍBLIA DIÁRIA com gradiente
  ctx.save();
  ctx.font = FONT.title;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '0.12em';

  const gradTitle = ctx.createLinearGradient(cx - 300, y, cx + 300, y + 80);
  gradTitle.addColorStop(0,   COLORS.goldLight);
  gradTitle.addColorStop(0.5, COLORS.gold);
  gradTitle.addColorStop(1,   COLORS.goldDark);

  ctx.shadowColor = 'rgba(212,168,83,0.5)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = gradTitle;
  ctx.fillText('BÍBLIA DIÁRIA', cx, y + 72);
  ctx.restore();
  y += 100;

  // Slogan
  ctx.save();
  ctx.font = FONT.slogan;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(240,237,230,0.55)';
  ctx.fillText('Três leituras por dia. Uma jornada com Deus.', cx, y + 30);
  ctx.restore();
  y += 60;

  // Data
  ctx.save();
  ctx.font = FONT.small;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.mutedText;
  ctx.fillText(dateStr, cx, y + 24);
  ctx.restore();
  y += 50;

  drawDivider(ctx, y, cx);

  return y + 40; // retorna próxima posição Y
}

/**
 * Desenha um cartão de leitura com alto contraste e design moderno.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} y - posição Y de início do card
 * @param {object} opts - { icon, typeLabel, typeName, bookName, chapter, read, accentColor, accentAlpha, accentBorder, badgeText? }
 * @returns {number} próxima posição Y
 */
function drawCard(ctx, y, opts) {
  const PAD_X = 64; // margem lateral
  const cardX = PAD_X;
  const cardW = CANVAS_W - PAD_X * 2;
  const cardH = 230;

  // 1. Fundo do card (Gradiente escuro elegante para alto contraste com os textos)
  ctx.save();
  roundRect(ctx, cardX, y, cardW, cardH, 24);
  const cardBgGrad = ctx.createLinearGradient(cardX, y, cardX, y + cardH);
  if (opts.read) {
    cardBgGrad.addColorStop(0, 'rgba(20, 32, 54, 0.94)');
    cardBgGrad.addColorStop(1, 'rgba(12, 20, 36, 0.96)');
  } else {
    cardBgGrad.addColorStop(0, 'rgba(16, 25, 42, 0.92)');
    cardBgGrad.addColorStop(1, 'rgba(9, 15, 26, 0.95)');
  }
  ctx.fillStyle = cardBgGrad;
  ctx.fill();

  // 2. Borda do card
  roundRect(ctx, cardX, y, cardW, cardH, 24);
  ctx.strokeStyle = opts.read ? opts.accentBorder : 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = opts.read ? 2.5 : 1.5;
  ctx.stroke();

  // 3. Linha de destaque (accent) no topo do card
  roundRect(ctx, cardX, y, cardW, 4, [24, 24, 0, 0]);
  ctx.fillStyle = opts.accentColor;
  ctx.globalAlpha = 0.95;
  ctx.fill();
  ctx.restore();

  // 4. Ícone
  const iconX = cardX + 44;
  const iconY = y + cardH / 2;
  ctx.save();
  ctx.font = '52px serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = opts.accentColor;
  ctx.shadowBlur = 14;
  ctx.fillText(opts.icon, iconX, iconY);
  ctx.restore();

  // 5. Label de tipo (ex: LEITURA 1 · SALMOS)
  const textX = cardX + 120;
  ctx.save();
  ctx.font = FONT.badge;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = opts.read ? opts.accentColor : 'rgba(240, 237, 230, 0.65)';
  ctx.fillText(`${opts.typeLabel}  ·  ${opts.typeName.toUpperCase()}`, textX, y + 36);
  ctx.restore();

  // 6. Nome do livro (branco brilhante com sombra para máxima legibilidade)
  ctx.save();
  ctx.font = FONT.headingSm;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = COLORS.white;
  ctx.fillText(opts.bookName || '—', textX, y + 80);
  ctx.restore();

  // 7. Capítulo (cor de destaque do card)
  ctx.save();
  ctx.font = FONT.body;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = opts.accentColor;
  ctx.fillText(`Capítulo ${opts.chapter}`, textX, y + 138);
  ctx.restore();

  // 8. Badge de status (ex: "✓ Concluído", "📅 Pv do dia", "📖 Para hoje")
  if (opts.badgeText) {
    const badgeW = 160;
    const badgeH = 40;
    const badgeX = cardX + cardW - badgeW - 28;
    const badgeY = y + cardH - badgeH - 24;

    ctx.save();
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 20);
    ctx.fillStyle = opts.read ? 'rgba(80, 200, 120, 0.18)' : 'rgba(255, 255, 255, 0.08)';
    ctx.fill();

    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 20);
    ctx.strokeStyle = opts.read ? 'rgba(80, 200, 120, 0.60)' : 'rgba(255, 255, 255, 0.20)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = FONT.badge;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = opts.read ? COLORS.green : opts.accentColor;
    ctx.fillText(opts.badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);
    ctx.restore();
  }

  // 9. Ícone de check se lido
  if (opts.read) {
    const chkX = cardX + cardW - 54;
    const chkY = y + 40;
    ctx.save();
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = COLORS.green;
    ctx.shadowColor = COLORS.green;
    ctx.shadowBlur = 14;
    ctx.fillText('✓', chkX, chkY);
    ctx.restore();
  }

  return y + cardH + 24; // gap entre cards
}

/**
 * Desenha a barra de progresso do dia.
 */
function drawProgress(ctx, completed, total, y) {
  const cx = CANVAS_W / 2;
  const barW = CANVAS_W - 128;
  const barX = 64;
  const barH = 12;
  const barY = y + 50;

  // Label
  ctx.save();
  ctx.font = FONT.badge;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.mutedText;
  ctx.fillText(`PROGRESSO DO DIA  ·  ${completed} DE ${total} LEITURAS`, cx, y + 26);
  ctx.restore();

  // Track (trilho da barra)
  ctx.save();
  roundRect(ctx, barX, barY, barW, barH, 6);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fill();
  ctx.restore();

  // Fill (preenchimento proporcional com gradiente dourado)
  const fillW = Math.max(0, Math.min(barW, (completed / total) * barW));
  if (fillW > 0) {
    ctx.save();
    const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    grad.addColorStop(0, COLORS.goldDark);
    grad.addColorStop(1, COLORS.goldLight);

    roundRect(ctx, barX, barY, fillW, barH, 6);
    ctx.fillStyle = grad;
    ctx.shadowColor = COLORS.gold;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();
  }

  return barY + barH + 30;
}

/**
 * Desenha o rodapé com versículo e marca d'água.
 */
function drawFooter(ctx, verseText, verseRef) {
  const cx = CANVAS_W / 2;
  const footerY = CANVAS_H - 220;

  drawDivider(ctx, footerY, cx);

  // Versículo
  ctx.save();
  ctx.font = '300 italic 28px Merriweather, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(240,237,230,0.45)';

  // Quebra o versículo em linhas
  const lines = wrapText(ctx, `"${verseText}"`, CANVAS_W - 160);
  let vy = footerY + 50;
  for (const line of lines.slice(0, 3)) { // máx 3 linhas
    ctx.fillText(line, cx, vy);
    vy += 38;
  }

  // Referência
  ctx.font = FONT.badge;
  ctx.fillStyle = COLORS.gold;
  ctx.fillText(`— ${verseRef}`, cx, vy + 10);
  ctx.restore();

  // Marca d'água
  ctx.save();
  ctx.font = FONT.tiny;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(240,237,230,0.2)';
  ctx.fillText('BIBLE DAILY  ·  biblerandom.app', cx, CANVAS_H - 48);
  ctx.restore();

  // Linha inferior dourada
  const botBorder = ctx.createLinearGradient(0, CANVAS_H - 4, CANVAS_W, CANVAS_H - 4);
  botBorder.addColorStop(0,   'transparent');
  botBorder.addColorStop(0.2, COLORS.gold);
  botBorder.addColorStop(0.8, COLORS.gold);
  botBorder.addColorStop(1,   'transparent');
  ctx.save();
  ctx.strokeStyle = botBorder;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_H - 4);
  ctx.lineTo(CANVAS_W, CANVAS_H - 4);
  ctx.stroke();
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════════
   FUNÇÃO PRINCIPAL
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Gera a imagem no canvas com os dados do dia.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} dayData - { psalm, proverb, general }
 */
function generateStoryImage(canvas, dayData) {
  canvas.width  = CANVAS_W;
  canvas.height = CANVAS_H;

  const ctx = canvas.getContext('2d');

  // 1. Fundo
  drawBackground(ctx);

  // 2. Cabeçalho
  const now     = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
  let y = drawHeader(ctx, dateStr.charAt(0).toUpperCase() + dateStr.slice(1));

  // 3. Cartão Salmos
  y = drawCard(ctx, y, {
    icon:         '🙏',
    typeLabel:    'LEITURA 1',
    typeName:     'Salmos',
    bookName:     dayData.psalm?.bookName || 'Salmos',
    chapter:      dayData.psalm?.chapter || 1,
    read:         Boolean(dayData.psalm?.read),
    accentColor:  COLORS.psalm,
    accentAlpha:  'rgba(240, 201, 122, 0.14)',
    accentBorder: 'rgba(240, 201, 122, 0.45)',
    badgeText:    dayData.psalm?.read ? '✓ Concluído' : '📖 Para hoje',
  });

  // 4. Cartão Provérbios (do dia)
  y = drawCard(ctx, y, {
    icon:         '💡',
    typeLabel:    'LEITURA 2',
    typeName:     'Provérbios',
    bookName:     dayData.proverb?.bookName || 'Provérbios',
    chapter:      dayData.proverb?.chapter || 1,
    read:         Boolean(dayData.proverb?.read),
    accentColor:  COLORS.proverb,
    accentAlpha:  'rgba(127, 232, 163, 0.14)',
    accentBorder: 'rgba(127, 232, 163, 0.45)',
    badgeText:    dayData.proverb?.read ? '✓ Concluído' : (dayData.proverb?.isDaily ? '📅 Pv do dia' : '📖 Para hoje'),
  });

  // 5. Cartão Bíblia Geral
  y = drawCard(ctx, y, {
    icon:         '✨',
    typeLabel:    'LEITURA 3',
    typeName:     'Bíblia Geral',
    bookName:     dayData.general?.bookName || 'Bíblia Geral',
    chapter:      dayData.general?.chapter || 1,
    read:         Boolean(dayData.general?.read),
    accentColor:  COLORS.general,
    accentAlpha:  COLORS.generalAlpha,
    accentBorder: COLORS.generalBorder,
    badgeText:    dayData.general?.read ? '✓ Concluído' : '📖 Para hoje',
  });

  y += 16;

  // 6. Barra de progresso
  const completed = [dayData.psalm, dayData.proverb, dayData.general].filter(r => r?.read).length;
  y = drawProgress(ctx, completed, 3, y);

  // 7. Rodapé com versículo motivacional
  const verses = window.BibleData.MOTIVATIONAL_VERSES;
  const verse  = verses[Math.floor(Math.random() * verses.length)];
  drawFooter(ctx, verse.text, verse.ref);
}

/* ═══════════════════════════════════════════════════════════════════
   INTERFACE: ABRIR/FECHAR MODAL E AÇÕES
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Abre o modal de stories e renderiza a imagem prévia.
 * Otimizado para WhatsApp Status e Instagram Stories (1080×1920).
 * @param {object} dayData
 */
async function openStoryModal(dayData) {
  const modal  = document.getElementById('story-modal');
  const canvas = document.getElementById('story-canvas');
  if (!modal || !canvas) return;

  // Aguarda carregamento de fontes se a API estiver disponível
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      // Ignora falhas de fonte
    }
  }

  requestAnimationFrame(() => {
    generateStoryImage(canvas, dayData);
  });

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  const now = new Date();
  const dateTag = now.toISOString().slice(0, 10);
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const completed = [dayData.psalm, dayData.proverb, dayData.general].filter(r => r?.read).length;

  const shareText = `📖 BÍBLIA DIÁRIA — ${dateStr}\n\n` +
    `🙏 Salmos ${dayData.psalm.chapter} ${dayData.psalm.read ? '✅' : '⏳'}\n` +
    `💡 Provérbios ${dayData.proverb.chapter} ${dayData.proverb.read ? '✅' : '⏳'}\n` +
    `✨ ${dayData.general.bookName} ${dayData.general.chapter} ${dayData.general.read ? '✅' : '⏳'}\n\n` +
    `Progresso hoje: ${completed}/3 leituras concluídas\n` +
    `"Três leituras por dia. Uma jornada com Deus." 🕊️`;

  // Botão de download
  const downloadBtn = document.getElementById('story-download-btn');
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const link = document.createElement('a');
      link.download = `biblia-diaria-${dateTag}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showStoryToast('⬇️ Imagem baixada! Pronta para o WhatsApp e Instagram.');
    };
  }

  // Botão de copiar imagem (para colar diretamente no WhatsApp Web ou Instagram)
  const copyBtn = document.getElementById('story-copy-btn');
  if (copyBtn) {
    copyBtn.onclick = async () => {
      try {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            showStoryToast('Erro ao copiar imagem.');
            return;
          }
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            showStoryToast('📋 Imagem copiada! Cole (Ctrl+V) no WhatsApp ou Instagram.');
          } else {
            // Fallback para download se o navegador não permitir cópia direta de blob
            const link = document.createElement('a');
            link.download = `biblia-diaria-${dateTag}.png`;
            link.href = URL.createObjectURL(blob);
            link.click();
            showStoryToast('Navegador não suporta copiar imagem diretamente. Imagem baixada!');
          }
        }, 'image/png');
      } catch (err) {
        showStoryToast('Clique em "Baixar Imagem" para salvar em seu dispositivo.');
      }
    };
  }

  // Botão de compartilhar via Web Share API (WhatsApp / Instagram / Redes no celular)
  const shareBtn = document.getElementById('story-share-btn');
  if (shareBtn) {
    shareBtn.onclick = async () => {
      try {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            showStoryToast('Erro ao preparar imagem.');
            return;
          }
          const file = new File([blob], `biblia-diaria-${dateTag}.png`, { type: 'image/png' });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'Bíblia Diária — Leitura do Dia',
              text: shareText,
              files: [file],
            });
          } else if (navigator.share) {
            await navigator.share({
              title: 'Bíblia Diária — Leitura do Dia',
              text: shareText,
            });
          } else {
            // Fallback: copia imagem ou baixa
            const link = document.createElement('a');
            link.download = `biblia-diaria-${dateTag}.png`;
            link.href = URL.createObjectURL(blob);
            link.click();
            showStoryToast('Imagem salva! Compartilhe no seu Status ou Stories. 📸');
          }
        }, 'image/png');
      } catch (err) {
        if (err.name !== 'AbortError') {
          showStoryToast('Clique em "Baixar Imagem" para salvar.');
        }
      }
    };
  }

  // Botão de enviar resumo via WhatsApp (link direto)
  const waBtn = document.getElementById('story-whatsapp-text-btn');
  if (waBtn) {
    waBtn.onclick = () => {
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
      window.open(waUrl, '_blank');
    };
  }

  // Fechar
  const closeBtn = document.getElementById('story-modal-close');
  if (closeBtn) closeBtn.onclick = closeStoryModal;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeStoryModal();
  }, { once: true });
}

function closeStoryModal() {
  const modal = document.getElementById('story-modal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

function showStoryToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3500);
}

// Fecha com ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeStoryModal();
});

// Exporta via namespace global
window.StoryGenerator = {
  openStoryModal,
  generateStoryImage,
};
