// functions/utils/regraINSS.js
//
// Cópia da lógica pura de src/utils/regraINSS.js, adaptada para
// CommonJS (formato usado por padrão em Cloud Functions Node.js).
//
// IMPORTANTE: esta é uma cópia intencional, não um import do
// src/ do frontend — Cloud Functions roda num pacote Node isolado
// (pasta functions/), com seu próprio package.json e sem acesso direto
// aos arquivos do projeto Vite/React. Se algum dia a regra do INSS
// mudar, lembre-se de atualizar as DUAS cópias (src/utils/regraINSS.js
// e functions/utils/regraINSS.js), ou considere extrair isso para um
// pacote npm privado/workspace compartilhado entre frontend e
// functions caso o projeto cresça.

const UM_DIA_EM_MS = 24 * 60 * 60 * 1000;
const JANELA_EM_DIAS = 60;

function normalizarParaMeiaNoite(data) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function calcularDiasSobrepostosEmJanela(licencas, inicioJanela, fimJanela) {
  const diasAfastado = new Set();

  for (const licenca of licencas) {
    const inicioEfetivo =
      licenca.dataInicio > inicioJanela ? licenca.dataInicio : inicioJanela;
    const fimEfetivo = licenca.dataFim < fimJanela ? licenca.dataFim : fimJanela;

    if (inicioEfetivo > fimEfetivo) continue;

    let cursor = normalizarParaMeiaNoite(inicioEfetivo);
    const fimNormalizado = normalizarParaMeiaNoite(fimEfetivo);

    while (cursor <= fimNormalizado) {
      diasAfastado.add(cursor.getTime());
      cursor = new Date(cursor.getTime() + UM_DIA_EM_MS);
    }
  }

  return diasAfastado.size;
}

/**
 * @param {{dataInicio: Date, dataFim: Date}[]} licencas licenças de UM
 *   funcionário para UM único CID
 * @returns {{ maiorSomaEm60Dias: number, ultrapassou15: boolean }}
 */
function verificaRegraINSS(licencas) {
  if (!licencas || licencas.length === 0) {
    return { maiorSomaEm60Dias: 0, ultrapassou15: false };
  }

  let maiorSoma = 0;

  for (const licencaBase of licencas) {
    const inicioJanela = normalizarParaMeiaNoite(licencaBase.dataInicio);
    const fimJanela = new Date(
      inicioJanela.getTime() + (JANELA_EM_DIAS - 1) * UM_DIA_EM_MS
    );

    const soma = calcularDiasSobrepostosEmJanela(licencas, inicioJanela, fimJanela);
    if (soma > maiorSoma) maiorSoma = soma;
  }

  return {
    maiorSomaEm60Dias: maiorSoma,
    ultrapassou15: maiorSoma > 15,
  };
}

module.exports = { verificaRegraINSS, calcularDiasSobrepostosEmJanela };