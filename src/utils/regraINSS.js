// regraINSS.js
//
// Regra do INSS: para um mesmo funcionário + mesmo CID, se a soma dos dias
// de afastamento dentro de QUALQUER janela móvel de 60 dias corridos
// ultrapassar 15 dias, o funcionário precisa ser encaminhado ao INSS.
//
// Esta função é JavaScript puro: não depende de React, Firebase ou
// qualquer outra biblioteca. Recebe e retorna apenas objetos/valores
// simples, o que facilita testá-la isoladamente antes de integrá-la
// ao restante do app (isso será feito no Prompt 4.2).

const UM_DIA_EM_MS = 24 * 60 * 60 * 1000;
const JANELA_EM_DIAS = 60;

/**
 * Conta quantos dias corridos únicos, dentro de uma lista de licenças,
 * caem dentro do intervalo [inicioJanela, fimJanela] (ambos inclusivos).
 * Dias sobrepostos entre licenças diferentes são contados uma única vez,
 * porque usamos um Set de "dias" (representados como timestamp do dia
 * às 00:00) em vez de somar duração de cada licença isoladamente.
 *
 * @param {{dataInicio: Date, dataFim: Date}[]} licencas
 * @param {Date} inicioJanela
 * @param {Date} fimJanela
 * @returns {number} total de dias únicos afastado dentro da janela
 */
function calcularDiasSobrepostosEmJanela(licencas, inicioJanela, fimJanela) {
  const diasAfastado = new Set();

  for (const licenca of licencas) {
    // Intersecta o período da licença com o período da janela.
    const inicioEfetivo = licenca.dataInicio > inicioJanela ? licenca.dataInicio : inicioJanela;
    const fimEfetivo = licenca.dataFim < fimJanela ? licenca.dataFim : fimJanela;

    if (inicioEfetivo > fimEfetivo) continue; // licença não cai nesta janela

    // Percorre dia a dia o trecho que ficou dentro da janela, adicionando
    // cada dia (normalizado para meia-noite) ao Set. Isso garante que dias
    // sobrepostos por outra licença não sejam contados duas vezes.
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
 * Zera horas/minutos/segundos/milissegundos de uma data, para que
 * comparações e somas de dias não sejam afetadas por fusos horários
 * ou horários diferentes dentro do mesmo dia.
 */
function normalizarParaMeiaNoite(data) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

/**
 * Verifica se, em alguma janela móvel de 60 dias corridos, a soma dos
 * dias de afastamento (sem contar sobreposição em dobro) ultrapassa 15.
 *
 * A cada licença da lista, testamos uma janela de 60 dias que COMEÇA no
 * dia de início daquela licença (é a candidata mais natural: se a maior
 * concentração de dias vai ocorrer em alguma janela, ela necessariamente
 * cobre o início de pelo menos uma das licenças).
 *
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

// ─────────────────────────────────────────────────────────────────────────
// TESTES MANUAIS (console.assert / console.log)
// Rode este arquivo com: node regraINSS.js
// ─────────────────────────────────────────────────────────────────────────

function d(diaMesAno) {
  // Helper de teste: recebe "DD/MM/AAAA" e devolve um Date
  const [dia, mes, ano] = diaMesAno.split("/").map(Number);
  return new Date(ano, mes - 1, dia);
}

function rodarTestes() {
  console.log("── Teste 1: única licença curta (não ultrapassa) ──");
  const t1 = verificaRegraINSS([
    { dataInicio: d("01/03/2026"), dataFim: d("05/03/2026") }, // 5 dias
  ]);
  console.log(t1);
  console.assert(t1.maiorSomaEm60Dias === 5, "Teste 1: esperava 5 dias");
  console.assert(t1.ultrapassou15 === false, "Teste 1: não deveria ultrapassar");

  console.log("\n── Teste 2: única licença longa (ultrapassa sozinha) ──");
  const t2 = verificaRegraINSS([
    { dataInicio: d("01/03/2026"), dataFim: d("20/03/2026") }, // 20 dias
  ]);
  console.log(t2);
  console.assert(t2.maiorSomaEm60Dias === 20, "Teste 2: esperava 20 dias");
  console.assert(t2.ultrapassou15 === true, "Teste 2: deveria ultrapassar");

  console.log("\n── Teste 3: duas licenças separadas que juntas ultrapassam 15 dentro de 60 dias ──");
  const t3 = verificaRegraINSS([
    { dataInicio: d("01/03/2026"), dataFim: d("10/03/2026") }, // 10 dias
    { dataInicio: d("01/04/2026"), dataFim: d("06/04/2026") }, // 6 dias, ~31 dias depois da primeira
  ]);
  console.log(t3);
  // 10 + 6 = 16 dias, e a diferença entre as duas licenças é bem menor que 60 dias
  console.assert(t3.maiorSomaEm60Dias === 16, "Teste 3: esperava 16 dias somados");
  console.assert(t3.ultrapassou15 === true, "Teste 3: deveria ultrapassar (16 > 15)");

  console.log("\n── Teste 4: duas licenças que se sobrepõem parcialmente (não contar em dobro) ──");
  const t4 = verificaRegraINSS([
    { dataInicio: d("01/03/2026"), dataFim: d("10/03/2026") }, // dias 1-10 de março
    { dataInicio: d("08/03/2026"), dataFim: d("15/03/2026") }, // dias 8-15 de março (sobrepõe 8,9,10)
  ]);
  console.log(t4);
  // União dos dias: 01 a 15 de março = 15 dias únicos (não 10 + 8 = 18)
  console.assert(t4.maiorSomaEm60Dias === 15, "Teste 4: esperava 15 dias únicos (sem dobrar sobreposição)");
  console.assert(t4.ultrapassou15 === false, "Teste 4: 15 não ultrapassa (regra é >15)");

  console.log("\n── Teste 5: duas licenças distantes (mais de 60 dias de diferença, não devem somar juntas) ──");
  const t5 = verificaRegraINSS([
    { dataInicio: d("01/01/2026"), dataFim: d("10/01/2026") }, // 10 dias
    { dataInicio: d("01/05/2026"), dataFim: d("10/05/2026") }, // 10 dias, ~120 dias depois
  ]);
  console.log(t5);
  // As janelas de 60 dias começando em cada uma delas não alcançam a outra licença,
  // então o maior valor encontrado deve ser 10 (cada licença isolada), não 20.
  console.assert(t5.maiorSomaEm60Dias === 10, "Teste 5: esperava 10 dias (licenças não devem somar)");
  console.assert(t5.ultrapassou15 === false, "Teste 5: não deveria ultrapassar");

  console.log("\nTodos os testes executados. Veja acima se algum console.assert falhou (apareceria como 'Assertion failed').");
}

rodarTestes();

export { verificaRegraINSS, calcularDiasSobrepostosEmJanela };