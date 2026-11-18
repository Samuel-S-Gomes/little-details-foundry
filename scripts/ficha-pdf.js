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

/** Como quebrarLinhas, mas cada linha lembra o parágrafo de origem (para devolver o resto como texto corrido). */
function quebrarComParagrafo(texto, fonte, tamanho, largura) {
  const out = [];
  texto.split('\n').forEach((par, i) => {
    for (const l of quebrarLinhas(par, fonte, tamanho, largura)) out.push({ l, par: i });
  });
  return out;
}

/** Reconstrói texto corrido a partir de linhas quebradas (o anexo tem outra largura). */
function juntarLinhas(linhas) {
  const pars = [];
  let atual = null;
  for (const { l, par } of linhas) {
    if (atual && atual.par === par) atual.t += ` ${l}`;
    else { atual = { par, t: l }; pars.push(atual); }
  }
  return pars.map((p) => p.t).join('\n').trim();
}

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
      anexos.push({ titulo: dados.rotulos?.[nome] ?? nome, texto: juntarLinhas(quebrarComParagrafo(valor, fonte, tamanho, largura).slice(cabem)) });
    } else {
      // já quebrado por nós, para o pdf-lib não refazer a quebra diferente
      campo.setText(linhas.join('\n'));
    }
    campo.setFontSize(tamanho);
  }

  for (const fluxo of dados.fluxos ?? []) {
    const valor = limparTexto(fluxo.texto ?? '', fonte).replace(/\n{3,}/g, '\n\n').trim();
    if (!valor) continue;
    const caixas = fluxo.campos.map((nome) => {
      const campo = form.getTextField(nome);
      const r = campo.acroField.getWidgets()[0].getRectangle();
      return { campo, largura: r.width - 2 * MARGEM, altura: r.height - 2 * MARGEM, padrao: tamanhoPadrao(campo) };
    });
    // mesma fonte em todas as caixas do fluxo; a maior que faz tudo caber
    const distribuir = (tamanho) => {
      let resto = valor; const partes = [];
      for (const cx of caixas) {
        const linhas = quebrarComParagrafo(resto, fonte, tamanho, cx.largura);
        const cabem = Math.floor((cx.altura - 2) / (alturaLinha(fonte, tamanho) * 1.04));
        partes.push(linhas.slice(0, cabem));
        resto = juntarLinhas(linhas.slice(cabem));
        if (!resto) break;
      }
      return { partes, resto };
    };
    let tamanho = Math.max(...caixas.map((c) => c.padrao || 8)), plano;
    for (; tamanho >= FONTE_MIN_BLOCO; tamanho -= 0.25) {
      plano = distribuir(tamanho);
      if (!plano.resto) break;
    }
    if (plano.resto) {
      tamanho = FONTE_MIN_BLOCO;
      plano = distribuir(tamanho);
      const ultima = plano.partes[plano.partes.length - 1];
      // abre espaço para o aviso na última caixa
      const tirada = ultima.splice(ultima.length - 1, 1);
      plano.resto = juntarLinhas([...tirada, ...quebrarComParagrafo(plano.resto, fonte, tamanho, 1e6).map((x) => ({ ...x, par: x.par + 1e4 }))]);
      ultima.push({ l: '(continua no anexo)', par: -1 });
      anexos.push({ titulo: fluxo.titulo, texto: plano.resto, ordem: fluxo.ordem ?? 0 });
    }
    plano.partes.forEach((linhas, i) => {
      caixas[i].campo.setText(linhas.map((x) => x.l).join('\n'));
      caixas[i].campo.setFontSize(tamanho);
    });
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
  const L = 612, A = 792, M = 30, GAP = 16, TOPO = A - M - 18;
  const colL = (L - 2 * M - GAP) / 2;
  const T = 6.5, LH = fonte.heightAtSize(T) * 1.12, TS = 8, PAR = 2.5;
  let pagina, col, y;
  const xCol = () => M + col * (colL + GAP);
  const novaPagina = () => {
    pagina = pdf.addPage([L, A]);
    pagina.drawText(limparTexto(`${titulo} — anexo`, negrito), { x: M, y: A - M, size: 10, font: negrito });
    pagina.drawLine({ start: { x: M, y: A - M - 5 }, end: { x: L - M, y: A - M - 5 }, thickness: 0.5, color: rgb(0.4, 0.4, 0.4) });
    pagina.drawLine({ start: { x: M + colL + GAP / 2, y: TOPO + 4 }, end: { x: M + colL + GAP / 2, y: M }, thickness: 0.3, color: rgb(0.75, 0.75, 0.75) });
    col = 0; y = TOPO;
  };
  const avancar = (h) => {
    if (y - h >= M) return;
    if (col === 0) { col = 1; y = TOPO; } else novaPagina();
  };
  novaPagina();
  for (const { titulo: secao, texto } of anexos.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))) {
    avancar(TS + 4 * LH);
    pagina.drawText(limparTexto(secao, negrito).toUpperCase(), { x: xCol(), y, size: TS, font: negrito, color: rgb(0.45, 0.1, 0.1) });
    y -= TS + 3;
    for (const par of limparTexto(texto, fonte).split('\n')) {
      if (!par.trim()) { y -= PAR; continue; }
      // "NOME: texto" → nome em negrito
      const m = par.match(/^([^:]{2,70}):\s/);
      const cab = m && m[1] === m[1].toUpperCase() ? `${m[1]}:` : '';
      const linhas = quebrarLinhas(cab ? `${cab} ${par.slice(m[0].length)}` : par, fonte, T, colL);
      linhas.forEach((linha, i) => {
        avancar(LH);
        if (i === 0 && cab && linha.startsWith(cab)) {
          pagina.drawText(cab, { x: xCol(), y, size: T, font: negrito });
          pagina.drawText(linha.slice(cab.length), { x: xCol() + negrito.widthOfTextAtSize(cab, T), y, size: T, font: fonte });
        } else pagina.drawText(linha, { x: xCol(), y, size: T, font: fonte });
        y -= LH;
      });
      y -= PAR;
    }
    y -= 5;
  }
}
