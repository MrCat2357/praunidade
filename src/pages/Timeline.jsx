// src/pages/Timeline.jsx
//
// Tela de linha do tempo horizontal com a janela de 60 dias corridos
// (regra do INSS), mostrando uma linha por combinação
// funcionário + CID, com o nome colorido conforme o status e uma
// barra representando a janela de 60 dias.
//
// Atualização (Prompt 5.2):
// - Dentro da barra, cada licença individual do grupo agora aparece
//   como um bloco colorido posicionado proporcionalmente à data.
// - Clicar num bloco abre o modal de detalhes da licença.
// - Clicar no badge "⚠ INSS" abre o modal de confirmação para marcar
//   o funcionário como encaminhado ao INSS.
//
// Atualização (Prompt 5.3):
// - A barra agora mostra uma janela de 120 dias no total: 60 dias no
//   passado e 60 dias no futuro, centrada em hoje.
// - Um marcador vertical "Hoje" foi adicionado para orientar
//   visualmente o que já passou e o que ainda está por vir.
//
// Atualização (Prompt 5.4):
// - Quando o status do grupo é "encaminhado" (pill cinza), o próprio
//   pill agora é clicável e abre um modal de confirmação para
//   "Restaurar alerta do INSS", que desfaz a marcação de
//   encaminhadoINSS em todas as licenças do grupo e faz o status
//   voltar a ser calculado normalmente pelos dias reais de
//   afastamento.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMonitorINSS } from "../hooks/useMonitorINSS";
import {
  marcarEncaminhadoINSS,
  desfazerEncaminhamentoINSS,
} from "../services/firebase/licencas";
import "./Timeline.css";

const JANELA_DIAS = 60;
const SPAN_DIAS = JANELA_DIAS * 2; // 60 dias antes + 60 dias depois de hoje
const UM_DIA_MS = 24 * 60 * 60 * 1000;

const ROTULOS_STATUS = {
  seguro: "Seguro",
  alerta: "Alerta",
  atencao: "Atenção",
  inss: "Limite do INSS",
  encaminhado: "Já encaminhado",
};

function formatarDataCurta(data) {
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function inicioDoDia(data) {
  const copia = new Date(data);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

function calcularDiasLicenca(inicio, fim) {
  return Math.round((fim - inicio) / UM_DIA_MS) + 1;
}

export default function Timeline({ usuario }) {
  const { funcionarios, carregando, erro, recarregar } = useMonitorINSS(
    usuario?.uid
  );
  const navigate = useNavigate();

  // Modal de detalhes de uma licença específica
  const [licencaSelecionada, setLicencaSelecionada] = useState(null);

  // Modal de confirmação de "marcar como encaminhado ao INSS"
  const [grupoInssSelecionado, setGrupoInssSelecionado] = useState(null);
  const [confirmandoEncaminhamento, setConfirmandoEncaminhamento] =
    useState(false);
  const [enviandoEncaminhamento, setEnviandoEncaminhamento] = useState(false);

  // Modal de confirmação de "restaurar alerta do INSS" (desfazer o
  // encaminhamento e voltar a calcular o status pelos dias reais)
  const [grupoRestaurarSelecionado, setGrupoRestaurarSelecionado] =
    useState(null);
  const [confirmandoRestauracao, setConfirmandoRestauracao] = useState(false);
  const [restaurando, setRestaurando] = useState(false);

  const hoje = inicioDoDia(new Date());

  // Janela visível da barra: de 60 dias atrás até 60 dias à frente.
  const inicioJanela = new Date(hoje);
  inicioJanela.setDate(inicioJanela.getDate() - JANELA_DIAS);
  const fimJanela = new Date(hoje);
  fimJanela.setDate(fimJanela.getDate() + JANELA_DIAS);

  // Posição percentual do marcador "Hoje" dentro da barra.
  const hojeOffsetDias = (hoje - inicioJanela) / UM_DIA_MS;
  const hojePercent = (hojeOffsetDias / SPAN_DIAS) * 100;

  function abrirModalLicenca(item, licenca) {
    setLicencaSelecionada({
      ...licenca,
      nomeFunc: item.nomeFunc,
      cid: item.cid,
    });
  }

  function fecharModalLicenca() {
    setLicencaSelecionada(null);
  }

  function abrirModalInss(item) {
    setGrupoInssSelecionado(item);
    setConfirmandoEncaminhamento(false);
  }

  function fecharModalInss() {
    setGrupoInssSelecionado(null);
    setConfirmandoEncaminhamento(false);
  }

  async function confirmarEncaminhamento() {
    if (!grupoInssSelecionado) return;
    setEnviandoEncaminhamento(true);
    try {
      await marcarEncaminhadoINSS(
        grupoInssSelecionado.funcionarioId,
        grupoInssSelecionado.cid,
        usuario?.uid
      );
      await recarregar();
      fecharModalInss();
    } catch (err) {
      console.error("Erro ao marcar encaminhamento ao INSS:", err);
      alert(
        "Não foi possível salvar agora. Por favor, tente novamente em instantes."
      );
    } finally {
      setEnviandoEncaminhamento(false);
    }
  }

  function abrirModalRestaurar(item) {
    setGrupoRestaurarSelecionado(item);
    setConfirmandoRestauracao(false);
  }

  function fecharModalRestaurar() {
    setGrupoRestaurarSelecionado(null);
    setConfirmandoRestauracao(false);
  }

  async function confirmarRestauracao() {
    if (!grupoRestaurarSelecionado) return;
    setRestaurando(true);
    try {
      await desfazerEncaminhamentoINSS(
        grupoRestaurarSelecionado.funcionarioId,
        grupoRestaurarSelecionado.cid,
        usuario?.uid
      );
      await recarregar();
      fecharModalRestaurar();
    } catch (err) {
      console.error("Erro ao restaurar alerta do INSS:", err);
      alert(
        "Não foi possível salvar agora. Por favor, tente novamente em instantes."
      );
    } finally {
      setRestaurando(false);
    }
  }

  if (carregando) {
    return (
      <div className="timeline-bg">
        <div className="timeline-card">
          <button
            type="button"
            className="timeline-link-voltar"
            onClick={() => navigate("/")}
          >
            ← Voltar
          </button>
          <p className="timeline-carregando">Carregando linha do tempo...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="timeline-bg">
        <div className="timeline-card">
          <button
            type="button"
            className="timeline-link-voltar"
            onClick={() => navigate("/")}
          >
            ← Voltar
          </button>
          <p className="timeline-erro">{erro}</p>
        </div>
      </div>
    );
  }

  const lista = [...funcionarios].sort((a, b) =>
    a.nomeFunc.localeCompare(b.nomeFunc, "pt-BR")
  );

  return (
    <div className="timeline-bg">
      <div className="timeline-card">
        <button
          type="button"
          className="timeline-link-voltar"
          onClick={() => navigate("/")}
        >
          ← Voltar
        </button>
        <h1 className="timeline-titulo">Linha do tempo — 60 dias</h1>
        <p className="timeline-periodo">
          De <strong>{formatarDataCurta(inicioJanela)}</strong> até{" "}
          <strong>{formatarDataCurta(fimJanela)}</strong>
        </p>

        {lista.length === 0 ? (
          <div className="timeline-vazio">
            <p className="timeline-vazio-titulo">
              Nenhuma licença para acompanhar no momento
            </p>
            <p className="timeline-vazio-sub">
              Assim que uma licença médica for registrada, ela aparecerá
              aqui.
            </p>
          </div>
        ) : (
          <div className="timeline-lista">
            {lista.map((item) => {
              const chave = `${item.funcionarioId}::${item.cid}`;

              // Blocos individuais: só desenha os que tocam a janela
              // visível [inicioJanela, fimJanela]. Recorta o bloco nas
              // bordas da janela quando a licença começa antes do
              // início ou termina depois do fim da janela.
              const blocos = (item.licencasDetalhe || [])
                .map((licenca) => {
                  const { dataInicio, dataFim } = licenca;
                  if (!dataInicio || !dataFim) return null;
                  if (dataFim < inicioJanela || dataInicio > fimJanela)
                    return null;

                  const inicioVisivel =
                    dataInicio < inicioJanela ? inicioJanela : dataInicio;
                  const fimVisivel = dataFim > fimJanela ? fimJanela : dataFim;

                  const offsetDias =
                    (inicioVisivel - inicioJanela) / UM_DIA_MS;
                  const duracaoDias =
                    (fimVisivel - inicioVisivel) / UM_DIA_MS + 1;

                  const leftPercent = (offsetDias / SPAN_DIAS) * 100;
                  const widthPercent = Math.max(
                    (duracaoDias / SPAN_DIAS) * 100,
                    1.5
                  );

                  return { ...licenca, leftPercent, widthPercent };
                })
                .filter(Boolean);

              return (
                <div className="timeline-linha" key={chave}>
                  <div className="timeline-linha-cabecalho">
                    <div className="timeline-linha-nome-grupo">
                      <span
                        className={`timeline-nome status-${item.status}`}
                      >
                        {item.nomeFunc}
                      </span>
                      <span className="timeline-cid">CID {item.cid}</span>
                      {item.status === "inss" && (
                        <button
                          type="button"
                          className="timeline-badge-inss"
                          onClick={() => abrirModalInss(item)}
                        >
                          ⚠ INSS
                        </button>
                      )}
                    </div>
                    <div className="timeline-linha-info">
                      {item.status === "encaminhado" ? (
                        <button
                          type="button"
                          className={`timeline-pill timeline-pill-btn status-${item.status}`}
                          onClick={() => abrirModalRestaurar(item)}
                          title="Restaurar alerta do INSS"
                        >
                          {ROTULOS_STATUS[item.status]}
                        </button>
                      ) : (
                        <span
                          className={`timeline-pill status-${item.status}`}
                        >
                          {ROTULOS_STATUS[item.status]}
                        </span>
                      )}
                      <span className="timeline-dias">
                        {item.diasNaJanela}{" "}
                        {item.diasNaJanela === 1 ? "dia" : "dias"} em 60
                      </span>
                    </div>
                  </div>

                  <div className="timeline-barra-trilha">
                    {blocos.map((bloco) => (
                      <button
                        type="button"
                        key={bloco.id}
                        className={`timeline-bloco-licenca status-${item.status}`}
                        style={{
                          left: `${bloco.leftPercent}%`,
                          width: `${bloco.widthPercent}%`,
                        }}
                        onClick={() => abrirModalLicenca(item, bloco)}
                        title="Ver detalhes desta licença"
                      />
                    ))}

                    <div
                      className="timeline-marcador-hoje"
                      style={{ left: `${hojePercent}%` }}
                    >
                      <span className="timeline-marcador-hoje-rotulo">
                        Hoje
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de detalhes da licença individual */}
      {licencaSelecionada && (
        <div className="timeline-modal-fundo" onClick={fecharModalLicenca}>
          <div
            className="timeline-modal-conteudo"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="timeline-modal-titulo">
              {licencaSelecionada.nomeFunc}
            </h2>
            <p className="timeline-modal-linha">
              <strong>CID:</strong> {licencaSelecionada.cid}
            </p>
            <p className="timeline-modal-linha">
              <strong>Início da licença:</strong>{" "}
              {formatarDataCurta(licencaSelecionada.dataInicio)}
            </p>
            <p className="timeline-modal-linha">
              <strong>Fim da licença:</strong>{" "}
              {formatarDataCurta(licencaSelecionada.dataFim)}
            </p>
            <p className="timeline-modal-linha">
              <strong>Total de dias:</strong>{" "}
              {calcularDiasLicenca(
                licencaSelecionada.dataInicio,
                licencaSelecionada.dataFim
              )}{" "}
              dias
            </p>

            {licencaSelecionada.arquivoURL ? (
              <a
                href={licencaSelecionada.arquivoURL}
                target="_blank"
                rel="noopener noreferrer"
                className="timeline-modal-link-arquivo"
              >
                📄 Abrir arquivo da licença
              </a>
            ) : (
              <p className="timeline-modal-sem-arquivo">
                Nenhum arquivo anexado a esta licença.
              </p>
            )}

            <div className="timeline-modal-acoes">
              <button
                type="button"
                className="timeline-modal-btn-secundario"
                onClick={fecharModalLicenca}
              >
                Fechar
              </button>
              <button
                type="button"
                className="timeline-modal-btn-primario"
                onClick={() =>
                  navigate(`/licenca/${licencaSelecionada.id}/editar`)
                }
              >
                Editar licença
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação: marcar como encaminhado ao INSS */}
      {grupoInssSelecionado && (
        <div className="timeline-modal-fundo" onClick={fecharModalInss}>
          <div
            className="timeline-modal-conteudo"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="timeline-modal-titulo">
              {grupoInssSelecionado.nomeFunc}
            </h2>
            <p className="timeline-modal-linha">
              <strong>CID:</strong> {grupoInssSelecionado.cid}
            </p>
            <p className="timeline-modal-texto">
              O total de dias de afastamento deste funcionário passou de 15
              dias dentro de um período de 60 dias. Segundo a regra do INSS,
              a partir desse ponto o afastamento deve ser encaminhado à
              Previdência Social.
            </p>

            {!confirmandoEncaminhamento ? (
              <div className="timeline-modal-acoes">
                <button
                  type="button"
                  className="timeline-modal-btn-secundario"
                  onClick={fecharModalInss}
                >
                  Fechar
                </button>
                <button
                  type="button"
                  className="timeline-modal-btn-primario"
                  onClick={() => setConfirmandoEncaminhamento(true)}
                >
                  Marcar como encaminhado ao INSS
                </button>
              </div>
            ) : (
              <>
                <p className="timeline-modal-texto timeline-modal-texto-confirma">
                  Tem certeza de que este funcionário já foi encaminhado ao
                  INSS? Depois de confirmar, o aviso vermelho vai sumir desta
                  tela.
                </p>
                <div className="timeline-modal-acoes">
                  <button
                    type="button"
                    className="timeline-modal-btn-secundario"
                    onClick={() => setConfirmandoEncaminhamento(false)}
                    disabled={enviandoEncaminhamento}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="timeline-modal-btn-primario"
                    onClick={confirmarEncaminhamento}
                    disabled={enviandoEncaminhamento}
                  >
                    {enviandoEncaminhamento
                      ? "Salvando..."
                      : "Sim, já foi encaminhado"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmação: restaurar alerta do INSS (desfazer o
          encaminhamento e voltar a calcular o status pelos dias reais) */}
      {grupoRestaurarSelecionado && (
        <div className="timeline-modal-fundo" onClick={fecharModalRestaurar}>
          <div
            className="timeline-modal-conteudo"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="timeline-modal-titulo">
              {grupoRestaurarSelecionado.nomeFunc}
            </h2>
            <p className="timeline-modal-linha">
              <strong>CID:</strong> {grupoRestaurarSelecionado.cid}
            </p>
            <p className="timeline-modal-texto">
              Restaurar alerta do INSS? Esta ação remove a marcação de "já
              encaminhado" e faz o status deste funcionário voltar a ser
              calculado normalmente pelos dias reais de afastamento na
              janela de 60 dias — podendo ficar verde, amarelo, laranja ou
              vermelho, conforme o caso.
            </p>

            {!confirmandoRestauracao ? (
              <div className="timeline-modal-acoes">
                <button
                  type="button"
                  className="timeline-modal-btn-secundario"
                  onClick={fecharModalRestaurar}
                >
                  Fechar
                </button>
                <button
                  type="button"
                  className="timeline-modal-btn-primario"
                  onClick={() => setConfirmandoRestauracao(true)}
                >
                  Restaurar alerta do INSS
                </button>
              </div>
            ) : (
              <>
                <p className="timeline-modal-texto timeline-modal-texto-confirma">
                  Tem certeza? O status real, calculado pelos dias de
                  afastamento na janela de 60 dias, vai voltar a aparecer
                  para este funcionário e este CID.
                </p>
                <div className="timeline-modal-acoes">
                  <button
                    type="button"
                    className="timeline-modal-btn-secundario"
                    onClick={() => setConfirmandoRestauracao(false)}
                    disabled={restaurando}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="timeline-modal-btn-primario"
                    onClick={confirmarRestauracao}
                    disabled={restaurando}
                  >
                    {restaurando ? "Restaurando..." : "Sim, restaurar alerta"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}