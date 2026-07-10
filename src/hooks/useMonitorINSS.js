// src/hooks/useMonitorINSS.js
//
// Hook React que busca todas as licenças de um usuário, agrupa por
// funcionário + CID, e aplica a regra dos 60 dias (verificaRegraINSS)
// em cada grupo para determinar o status de cada combinação
// funcionário+CID.
//
// Atualização (Prompt 5.2):
// - Cada item retornado agora também inclui "licencasDetalhe": a lista
//   completa das licenças originais daquele grupo, já convertidas para
//   Date puro (dataInicio/dataFim) e com id + arquivoURL. Isso é usado
//   pela Timeline para desenhar os blocos individuais dentro da barra
//   e para preencher o modal de detalhes de cada licença.
import { useState, useEffect, useCallback } from "react";
import { listarLicencas } from "../services/firebase/licencas";
import { verificaRegraINSS } from "../utils/regraINSS";

// Faixas de status conforme dias somados na maior janela de 60 dias
function calcularStatus(diasNaJanela) {
  if (diasNaJanela > 15) return "inss";
  if (diasNaJanela >= 11) return "atencao";
  if (diasNaJanela >= 6) return "alerta";
  return "seguro";
}

// Converte um Timestamp do Firestore (ou já um Date) para Date puro
function paraDate(valor) {
  if (!valor) return null;
  return valor.toDate ? valor.toDate() : new Date(valor);
}

export function useMonitorINSS(donoUid) {
  const [funcionarios, setFuncionarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    if (!donoUid) {
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const licencas = await listarLicencas(donoUid);

      // Agrupa por funcionarioId + cid. A chave combina os dois para que
      // o mesmo funcionário com CIDs diferentes NÃO seja somado junto.
      const grupos = new Map();
      for (const licenca of licencas) {
        const chave = `${licenca.funcionarioId}::${licenca.cid}`;
        if (!grupos.has(chave)) {
          grupos.set(chave, {
            funcionarioId: licenca.funcionarioId,
            nomeFunc: licenca.nomeFunc,
            cid: licenca.cid,
            licencas: [],
          });
        }
        grupos.get(chave).licencas.push(licenca);
      }

      const resultado = [];
      for (const grupo of grupos.values()) {
        // Converte as licenças do grupo para o formato que
        // verificaRegraINSS espera: { dataInicio: Date, dataFim: Date }
        const licencasConvertidas = grupo.licencas.map((l) => ({
          dataInicio: paraDate(l.dataInicio),
          dataFim: paraDate(l.dataFim),
        }));

        const { maiorSomaEm60Dias } = verificaRegraINSS(licencasConvertidas);

        // Se QUALQUER licença do grupo já foi marcada como encaminhada ao
        // INSS, o grupo inteiro passa a ter status "encaminhado" — mesmo
        // que os dias somados ainda ultrapassem 15. Só sai desse estado
        // manualmente (não há lógica automática para reverter).
        const jaEncaminhado = grupo.licencas.some(
          (l) => l.encaminhadoINSS === true
        );
        const status = jaEncaminhado
          ? "encaminhado"
          : calcularStatus(maiorSomaEm60Dias);

        // Lista detalhada das licenças originais do grupo, já com Date
        // puro em dataInicio/dataFim, para a Timeline desenhar os
        // blocos individuais e alimentar o modal de detalhes.
        const licencasDetalhe = grupo.licencas.map((l) => ({
          id: l.id,
          dataInicio: paraDate(l.dataInicio),
          dataFim: paraDate(l.dataFim),
          arquivoURL: l.arquivoURL || "",
        }));

        resultado.push({
          funcionarioId: grupo.funcionarioId,
          nomeFunc: grupo.nomeFunc,
          cid: grupo.cid,
          diasNaJanela: maiorSomaEm60Dias,
          status,
          encaminhadoINSS: jaEncaminhado,
          licencasDetalhe,
        });
      }

      // Ordena por nome do funcionário, depois por CID, para exibição
      // consistente na tela.
      resultado.sort((a, b) => {
        const porNome = a.nomeFunc.localeCompare(b.nomeFunc, "pt-BR");
        if (porNome !== 0) return porNome;
        return a.cid.localeCompare(b.cid, "pt-BR");
      });

      setFuncionarios(resultado);
    } catch (err) {
      console.error("Erro ao calcular monitor INSS:", err);
      setErro("Não foi possível calcular a situação das licenças agora.");
    } finally {
      setCarregando(false);
    }
  }, [donoUid]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Expõe também uma função de recarregar, útil para chamar depois de
  // marcar um funcionário como encaminhado ao INSS.
  return { funcionarios, carregando, erro, recarregar: carregar };
}