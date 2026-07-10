// functions/index.js
//
// Etapa 6 — Entrega B: alerta por e-mail quando um funcionário+CID
// cruza o limite do INSS (diasNaJanela > 15).
//
// ABORDAGEM ESCOLHIDA: (a) Cloud Function AGENDADA (1x por dia), em vez
// de um trigger onWrite/onUpdate em "licencas".
//
// Por quê: um trigger por escrita dispararia a cada cadastro/edição de
// QUALQUER licença, exigindo recalcular o grupo inteiro a cada evento,
// lidar com escritas concorrentes (duas licenças do mesmo grupo
// gravadas quase ao mesmo tempo podem gerar corridas e cálculos
// inconsistentes) e ainda assim só refletiria a situação real no
// próximo evento de escrita — não pelo simples passar dos dias (ex:
// uma licença que só ultrapassa 60 dias de outra por causa da data de
// HOJE, sem nenhuma escrita nova). Uma função agendada, rodando 1x por
// dia, resolve os dois problemas de uma vez: é determinística (um
// cálculo por grupo por dia), mais simples de depurar (um log por
// execução) e também captura o caso em que a passagem do tempo, sozinha,
// faz um grupo entrar na janela de risco. O custo é passar a rodar
// mesmo sem alterações, mas para poucas dezenas/centenas de grupos isso
// é irrelevante financeiramente (ver README-DEPLOY.md).
//
// DEDUPLICAÇÃO: usamos uma coleção de controle "alertasINSS", com um
// documento por grupo funcionarioId+cid, guardando o último status
// calculado (ultimoStatus) e quando o alerta foi enviado
// (alertaEnviadoEm). Só disparamos e-mail quando o status do dia é
// "inss" E o ultimoStatus salvo NÃO era "inss" — ou seja, na transição.
// Se depois o funcionário sair do "inss" (ex: foi encaminhado, ou uma
// licença foi excluída) e voltar a cruzar o limite depois, um novo
// e-mail é enviado, porque o ultimoStatus terá sido resetado nesse
// meio-tempo.

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { verificaRegraINSS } = require("./utils/regraINSS");

admin.initializeApp();
const db = admin.firestore();

// A API key do Resend NUNCA fica hardcoded: é um "secret" gerenciado
// pelo Secret Manager do Google Cloud, configurado via
// `firebase functions:secrets:set RESEND_API_KEY` (veja o passo a
// passo de deploy). Em tempo de execução, RESEND_API_KEY.value() lê o
// valor injetado pelo runtime.
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

// E-mail remetente: precisa ser de um domínio verificado na sua conta
// Resend (ou, para testes, o domínio de sandbox onboarding@resend.dev,
// que só envia para o próprio e-mail cadastrado na conta Resend).
// Troque pelo remetente definitivo depois de verificar seu domínio.
const EMAIL_REMETENTE = "Acompanhamento INSS <alertas@SEU-DOMINIO.com>";

// Mesmas faixas de status usadas em src/hooks/useMonitorINSS.js
function calcularStatus(diasNaJanela) {
  if (diasNaJanela > 15) return "inss";
  if (diasNaJanela >= 11) return "atencao";
  if (diasNaJanela >= 6) return "alerta";
  return "seguro";
}

function paraDate(valor) {
  if (!valor) return null;
  return valor.toDate ? valor.toDate() : new Date(valor);
}

async function enviarEmailAlerta(destinatario, dados) {
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY.value()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_REMETENTE,
      to: destinatario,
      subject: `⚠ Limite do INSS atingido — ${dados.nomeFunc}`,
      html: `
        <div style="font-family: Arial, sans-serif; color:#123320; line-height:1.5;">
          <h2 style="color:#a13d3d; margin-bottom: 4px;">⚠ Limite do INSS atingido</h2>
          <p>O funcionário <strong>${dados.nomeFunc}</strong>
             (CID <strong>${dados.cid}</strong>) acumulou
             <strong>${dados.dias} dias</strong> de afastamento dentro de
             uma janela de 60 dias corridos, ultrapassando o limite de
             15 dias previsto pela regra do INSS.</p>
          <p>Recomendamos avaliar o encaminhamento deste caso à
             Previdência Social o quanto antes.</p>
          <p style="color:#888; font-size:12px; margin-top:24px;">
             Este é um e-mail automático do sistema de Acompanhamento
             INSS. Ele é enviado apenas uma vez por ocorrência — se o
             funcionário for encaminhado e depois tiver uma recaída que
             cruze o limite novamente, um novo alerta será enviado.
          </p>
        </div>
      `,
    }),
  });

  if (!resposta.ok) {
    const texto = await resposta.text();
    throw new Error(`Falha ao enviar e-mail (status ${resposta.status}): ${texto}`);
  }
}

exports.verificarAlertasINSS = onSchedule(
  {
    // Roda todo dia às 06:00 no horário de Fortaleza. Ajuste o horário
    // como preferir; o formato aceita tanto texto ("every 24 hours")
    // quanto expressão cron ("0 6 * * *").
    schedule: "0 6 * * *",
    timeZone: "America/Fortaleza",
    secrets: [RESEND_API_KEY],
    // região opcional; deixe vazio para usar a padrão do projeto, ou
    // troque para a região onde seu Firestore está hospedado.
    // region: "southamerica-east1",
  },
  async () => {
    logger.info("Iniciando verificação diária de alertas do INSS...");

    // admin.firestore() ignora completamente as regras de segurança
    // (firestore.rules), então esta consulta traz as licenças de
    // TODOS os usuários — é o comportamento esperado para uma rotina
    // de backend, algo que NUNCA seria permitido a partir do app.
    const licencasSnap = await db
      .collection("licencas")
      .where("oculto", "==", false)
      .get();

    // Agrupa por donoUid + funcionarioId + cid — mesma lógica de
    // agrupamento de src/hooks/useMonitorINSS.js, só que abrangendo
    // todos os usuários de uma vez.
    const grupos = new Map();
    licencasSnap.forEach((docSnap) => {
      const l = docSnap.data();
      const chave = `${l.donoUid}::${l.funcionarioId}::${l.cid}`;
      if (!grupos.has(chave)) {
        grupos.set(chave, {
          donoUid: l.donoUid,
          funcionarioId: l.funcionarioId,
          nomeFunc: l.nomeFunc,
          cid: l.cid,
          licencas: [],
          jaEncaminhado: false,
        });
      }
      const grupo = grupos.get(chave);
      grupo.licencas.push({
        dataInicio: paraDate(l.dataInicio),
        dataFim: paraDate(l.dataFim),
      });
      if (l.encaminhadoINSS === true) grupo.jaEncaminhado = true;
    });

    // Cache simples de e-mail por donoUid, para não buscar o mesmo
    // usuário duas vezes se ele tiver vários funcionários/CIDs.
    const cacheEmails = new Map();

    let alertasEnviados = 0;
    let erros = 0;

    for (const grupo of grupos.values()) {
      const { maiorSomaEm60Dias } = verificaRegraINSS(grupo.licencas);
      const status = grupo.jaEncaminhado
        ? "encaminhado"
        : calcularStatus(maiorSomaEm60Dias);

      const chaveAlerta = `${grupo.funcionarioId}_${grupo.cid}`;
      const alertaRef = db.collection("alertasINSS").doc(chaveAlerta);
      const alertaSnap = await alertaRef.get();
      const statusAnterior = alertaSnap.exists
        ? alertaSnap.data().ultimoStatus
        : null;

      const cruzouAgora = status === "inss" && statusAnterior !== "inss";

      if (cruzouAgora) {
        try {
          let email = cacheEmails.get(grupo.donoUid);
          if (email === undefined) {
            const usuarioSnap = await db
              .collection("usuarios")
              .doc(grupo.donoUid)
              .get();
            email = usuarioSnap.exists ? usuarioSnap.data().email || null : null;
            cacheEmails.set(grupo.donoUid, email);
          }

          if (email) {
            await enviarEmailAlerta(email, {
              nomeFunc: grupo.nomeFunc,
              cid: grupo.cid,
              dias: maiorSomaEm60Dias,
            });
            alertasEnviados += 1;
            logger.info(
              `E-mail enviado para ${email} — ${grupo.nomeFunc} / CID ${grupo.cid} (${maiorSomaEm60Dias} dias)`
            );
          } else {
            logger.warn(
              `Usuário ${grupo.donoUid} não tem campo "email" em usuarios/${grupo.donoUid} — alerta NÃO enviado para ${grupo.nomeFunc} / CID ${grupo.cid}.`
            );
          }
        } catch (err) {
          erros += 1;
          logger.error(
            `Erro ao enviar e-mail para ${grupo.nomeFunc} / CID ${grupo.cid}:`,
            err
          );
        }
      }

      // Atualiza o documento de controle sempre (não só quando envia
      // e-mail), para o "ultimoStatus" continuar refletindo a
      // realidade e permitir alertar de novo numa futura recaída.
      await alertaRef.set(
        {
          donoUid: grupo.donoUid,
          funcionarioId: grupo.funcionarioId,
          cid: grupo.cid,
          nomeFunc: grupo.nomeFunc,
          ultimoStatus: status,
          diasNaJanela: maiorSomaEm60Dias,
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
          ...(cruzouAgora
            ? { alertaEnviadoEm: admin.firestore.FieldValue.serverTimestamp() }
            : {}),
        },
        { merge: true }
      );
    }

    logger.info(
      `Verificação diária concluída. Grupos analisados: ${grupos.size}. E-mails enviados: ${alertasEnviados}. Erros: ${erros}.`
    );
  }
);