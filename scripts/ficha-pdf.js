// =============================================================================
//  Exportar ficha — preenchimento do PDF (sem dependência do Foundry)
//  Recebe o PDFLib (pdf-lib 1.17), os bytes da ficha vazia e um objeto
//  { texto: {campo: valor}, marcar: [campo], retrato: {bytes, tipo}, titulo }.
//  Cada campo de texto ganha a maior fonte que cabe; o que não cabe nem na
//  fonte mínima vai para páginas de anexo no fim do PDF.
//  Também roda no Node (tools/testar-ficha-pdf.mjs) para testar fora do VTT.
// =============================================================================

const FONTE_MIN_LINHA = 3.5;   // campos de uma linha
const FONTE_MIN_BLOCO = 5;   // campos de várias linhas
const MARGEM = 2;            // padding interno que o pdf-lib usa

/** Troca o que a Helvetica (WinAnsi) não sabe desenhar. */
export function limparTexto(texto, fonte) {
  const trocas = { '−': '-', '‑': '-', ' ': ' ', '​': '', ' ': ' ', ' ': ' ', '\t': '  ', '\r': '' };
  let out = '';
  for (const ch of String(texto ?? '')) {
    const c = trocas[ch] ?? ch;
    if (c === '\n' || c === '') { out += c; continue; }
    try { fonte.encodeText(c); out += c; } catch { out += '?'; }
  }
  return out;
}

/** Quebra o texto em linhas que cabem na largura (palavra a palavra). */
export function quebrarLinhas(texto, fonte, tamanho, largura) {
  const linhas = [];
  for (const paragrafo of texto.split('\n')) {
    if (!paragrafo.trim()) { linhas.push(''); continue; }
    let atual = '';
    for (const palavra of paragrafo.split(/ +/)) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra;
      if (fonte.widthOfTextAtSize(tentativa, tamanho) <= largura) { atual = tentativa; continue; }
      if (atual) linhas.push(atual);
      // palavra maior que a linha: corta à força
      let resto = palavra;
      while (fonte.widthOfTextAtSize(resto, tamanho) > largura && resto.length > 1) {
        let n = resto.length - 1;
        while (n > 1 && fonte.widthOfTextAtSize(resto.slice(0, n), tamanho) > largura) n--;
        linhas.push(resto.slice(0, n));
        resto = resto.slice(n);
      }
      atual = resto;
    }
    linhas.push(atual);
  }
  return linhas;
}

// o pdf-lib espaça as linhas um pouco além da altura da fonte; margem de folga
const alturaLinha = (fonte, tamanho) => fonte.heightAtSize(tamanho) * 1.18;

function tamanhoPadrao(campo) {
  const da = campo.acroField.getDefaultAppearance?.() ?? '';
  const m = da.match(/([\d.]+)\s+Tf/);
  return m ? Number(m[1]) : 0;
}

export async function preencherFicha(PDFLib, bytesFicha, dados) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const pdf = await PDFDocument.load(bytesFicha);
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const form = pdf.getForm();
  const anexos = [];

  for (const [nome, valorBruto] of Object.entries(dados.texto ?? {})) {
    if (valorBruto === undefined || valorBruto === null || valorBruto === '') continue;
    let campo;
    try { campo = form.getTextField(nome); } catch { console.warn(`ficha-pdf | campo ausente: ${nome}`); continue; }
    const valor = limparTexto(valorBruto, fonte).replace(/\n{3,}/g, '\n\n').trim();
    const rect = campo.acroField.getWidgets()[0].getRectangle();
    const largura = rect.width - 2 * MARGEM;
    const altura = rect.height - 2 * MARGEM;
    const padrao = tamanhoPadrao(campo);

    if (!campo.isMultiline()) {
      const unica = valor.replace(/\s*\n\s*/g, ' · ');
      const maximo = padrao > 0 ? padrao : Math.min(12, altura * 0.8);
      const caber = largura / Math.max(fonte.widthOfTextAtSize(unica, 1), 0.01);
      const tamanho = Math.max(FONTE_MIN_LINHA, Math.min(maximo, caber, altura * 0.9));
      campo.setText(unica);
      campo.setFontSize(Math.floor(tamanho * 4) / 4);
      continue;
    }

    const maximo = padrao > 0 ? padrao : 9;
    let tamanho = maximo, linhas;
    for (; tamanho >= FONTE_MIN_BLOCO; tamanho -= 0.25) {
      linhas = quebrarLinhas(valor, fonte, tamanho, largura);
      if (linhas.length * alturaLinha(fonte, tamanho) <= altura) break;
    }
    if (tamanho < FONTE_MIN_BLOCO) {
      tamanho = FONTE_MIN_BLOCO;
      linhas = quebrarLinhas(valor, fonte, tamanho, largura);
      const cabem = Math.max(1, Math.floor(altura / alturaLinha(fonte, tamanho)) - 1);
      campo.setText(`${linhas.slice(0, cabem).join('\n')}\n(continua no anexo)`);
      anexos.push({ titulo: `${dados.rotulos?.[nome] ?? nome} (continuação)`, texto: linhas.slice(cabem).join('\n') });
    } else {
      // já quebrado por nós, para o pdf-lib não refazer a quebra diferente
      campo.setText(linhas.join('\n'));
    }
    campo.setFontSize(tamanho);
  }

  for (const nome of dados.marcar ?? []) {
    try { form.getCheckBox(nome).check(); } catch { console.warn(`ficha-pdf | caixa ausente: ${nome}`); }
  }

  if (dados.retrato?.bytes) {
    try {
      const img = dados.retrato.tipo === 'jpg'
        ? await pdf.embedJpg(dados.retrato.bytes) : await pdf.embedPng(dados.retrato.bytes);
      form.getButton(dados.retrato.campo ?? 'Aparência do Personagem').setImage(img);
    } catch (err) { console.warn('ficha-pdf | retrato não entrou', err); }
  }

  for (const { pagina, x, y, texto, tamanho = 9, centro = true } of dados.desenhos ?? []) {
    const t = limparTexto(texto, fonte), pg = pdf.getPage(pagina);
    const w = fonte.widthOfTextAtSize(t, tamanho);
    pg.drawText(t, { x: centro ? x - w / 2 : x, y: pg.getHeight() - y - tamanho / 3, size: tamanho, font: fonte });
  }

  for (const extra of dados.anexos ?? []) anexos.push(extra);
  if (anexos.length) desenharAnexos(pdf, fonte, negrito, rgb, anexos, dados.titulo ?? 'Anexo');

  form.updateFieldAppearances(fonte);
  return pdf.save();
}

function desenharAnexos(pdf, fonte, negrito, rgb, anexos, titulo) {
  const L = 612, A = 792, M = 40, larg = L - 2 * M;
  const T = 8.5, LH = fonte.heightAtSize(T) * 1.15;
  let pagina, y;
  const novaPagina = () => {
    pagina = pdf.addPage([L, A]);
    pagina.drawText(limparTexto(`${titulo} — anexo`, negrito), { x: M, y: A - M, size: 13, font: negrito });
    pagina.drawLine({ start: { x: M, y: A - M - 6 }, end: { x: L - M, y: A - M - 6 }, thickness: 0.6, color: rgb(0.4, 0.4, 0.4) });
    y = A - M - 24;
  };
  novaPagina();
  for (const { titulo: secao, texto } of anexos) {
    if (y < M + 40) novaPagina();
    pagina.drawText(limparTexto(secao, negrito), { x: M, y, size: 10.5, font: negrito });
    y -= 15;
    for (const linha of quebrarLinhas(limparTexto(texto, fonte), fonte, T, larg)) {
      if (y < M) novaPagina();
      if (linha) pagina.drawText(linha, { x: M, y, size: T, font: fonte });
      y -= LH;
    }
    y -= 8;
  }
}
