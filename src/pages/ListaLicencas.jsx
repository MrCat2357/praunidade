import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  listarLicencas,
  listarLicencasOcultas,
  ocultarLicenca,
  restaurarLicenca,
  formatarData,
} from "../services/firebase/licencas";
import { carregarPerfil } from "../services/firebase/auth";
import AvisoVisitante from "../components/AvisoVisitante";
import "../components/AvisoVisitante.css";
import "./ListaLicencas.css";

function ModalConfirmacao({ nomeFunc, onConfirmar, onCancelar }) {
  return (
    <div className="lista-modal-overlay">
      <div className="lista-modal">
        <h2 className="lista-modal-titulo">Ocultar licença</h2>
        <p className="lista-modal-texto">
          Tem certeza que deseja ocultar a licença de{" "}
          <strong>{nomeFunc}</strong>? O registro não será apagado — você pode
          recuperá-lo depois se necessário.
        </p>
        <div className="lista-modal-acoes">
          <button className="lista-modal-btn-confirmar" onClick={onConfirmar}>
            Sim, ocultar
          </button>
          <button className="lista-modal-btn-cancelar" onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ListaLicencas({ usuario }) {
  const navigate = useNavigate();
  const { uid: uidParam } = useParams();
  const donoUid = uidParam || usuario?.uid;
  const modoVisitante = Boolean(uidParam);

  const [nomeDono, setNomeDono] = useState("");
  const [licencas, setLicencas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [ocultandoId, setOcultandoId] = useState(null); // id sendo processado
  const [restaurandoId, setRestaurandoId] = useState(null); // id sendo processado
  const [modalLicenca, setModalLicenca] = useState(null); // licença aguardando confirmação
  const [erro, setErro] = useState("");

  // false = mostrando licenças ativas; true = mostrando licenças ocultas.
  // Em modo visitante essa alternância não é oferecida (ver JSX abaixo),
  // então este estado permanece sempre false para visitantes.
  const [mostrandoOcultas, setMostrandoOcultas] = useState(false);

  const carregarLicencas = useCallback(async () => {
    if (!donoUid) return;
    setCarregando(true);
    try {
      const tarefas = [
        mostrandoOcultas
          ? listarLicencasOcultas(donoUid)
          : listarLicencas(donoUid),
      ];
      if (modoVisitante) tarefas.push(carregarPerfil(donoUid));

      const [lista, perfilDono] = await Promise.all(tarefas);
      setLicencas(lista);
      if (modoVisitante) setNomeDono(perfilDono?.nome || "");
    } catch (err) {
      console.error("Erro ao carregar licenças:", err);
      setErro("Não foi possível carregar as licenças agora.");
    } finally {
      setCarregando(false);
    }
  }, [donoUid, mostrandoOcultas, modoVisitante]);

  useEffect(() => {
    carregarLicencas();
  }, [carregarLicencas]);

  async function handleOcultar(licenca) {
    setModalLicenca(null);
    setOcultandoId(licenca.id);
    try {
      await ocultarLicenca(licenca.id);
      setLicencas((atual) => atual.filter((l) => l.id !== licenca.id));
    } catch {
      setErro("Não foi possível ocultar a licença. Tente novamente.");
    } finally {
      setOcultandoId(null);
    }
  }

  async function handleRestaurar(licenca) {
    setRestaurandoId(licenca.id);
    try {
      await restaurarLicenca(licenca.id);
      setLicencas((atual) => atual.filter((l) => l.id !== licenca.id));
    } catch (err) {
      console.error("Erro ao restaurar licença:", err);
      setErro("Não foi possível restaurar a licença. Tente novamente.");
    } finally {
      setRestaurandoId(null);
    }
  }

  function alternarModoExibicao() {
    setErro("");
    setMostrandoOcultas((atual) => !atual);
  }

  return (
    <div className="lista-bg">
      <div className="lista-container">
        <button
          className="lista-link-voltar"
          onClick={() => navigate(modoVisitante ? "/conexoes" : "/")}
        >
          ← Voltar
        </button>

        {modoVisitante && <AvisoVisitante nomeDono={nomeDono} />}

        <div className="lista-header">
          <h1 className="lista-titulo">
            {modoVisitante
              ? `Licenças de ${nomeDono || "..."}`
              : mostrandoOcultas
              ? "Licenças ocultas"
              : "Licenças"}
          </h1>
          {!modoVisitante && !mostrandoOcultas && (
            <button
              className="lista-btn-nova"
              onClick={() => navigate("/nova-licenca")}
            >
              + Nova licença
            </button>
          )}
        </div>
        <p className="lista-sub">
          {modoVisitante
            ? "Acompanhamento INSS — regra dos 60 dias (somente leitura)."
            : mostrandoOcultas
            ? "Licenças que você ocultou. Você pode restaurá-las a qualquer momento."
            : "Acompanhamento INSS — regra dos 60 dias."}
        </p>

        {/* Alternância para licenças ocultas: só faz sentido na MINHA
            tela — em modo visitante, "licenças ocultas" de outra
            pessoa não deveriam nem ser visíveis, então nem oferecemos
            a opção nem chamamos listarLicencasOcultas nesse modo. */}
        {!modoVisitante && (
          <button
            type="button"
            className="lista-btn-alternar-ocultas"
            onClick={alternarModoExibicao}
          >
            {mostrandoOcultas
              ? "← Voltar para licenças ativas"
              : "Ver licenças ocultas"}
          </button>
        )}

        {erro && (
          <p style={{ color: "#501313", background: "#fcebeb", padding: "10px 14px", borderRadius: 8, marginBottom: 16, marginTop: 16 }}>
            {erro}
          </p>
        )}

        {carregando ? (
          <p className="lista-loading">Carregando...</p>
        ) : licencas.length === 0 ? (
          mostrandoOcultas ? (
            <div className="lista-vazio">
              <div className="lista-vazio-icone">🙈</div>
              <p className="lista-vazio-texto">
                Nenhuma licença oculta no momento.
              </p>
            </div>
          ) : (
            <div className="lista-vazio">
              <div className="lista-vazio-icone">📋</div>
              <p className="lista-vazio-texto">
                {modoVisitante
                  ? "Essa pessoa ainda não tem licenças cadastradas."
                  : "Nenhuma licença cadastrada ainda."}
              </p>
              {!modoVisitante && (
                <button
                  className="lista-vazio-btn"
                  onClick={() => navigate("/nova-licenca")}
                >
                  Cadastrar primeira licença
                </button>
              )}
            </div>
          )
        ) : (
          <div className="lista-cards">
            {licencas.map((licenca) => (
              <div className="lista-card" key={licenca.id}>
                <div className="lista-card-header">
                  <p className="lista-card-nome">{licenca.nomeFunc}</p>
                  <span className="lista-card-cid">{licenca.cid}</span>
                </div>

                <p className="lista-card-periodo">
                  De <span>{formatarData(licenca.dataInicio)}</span> até{" "}
                  <span>{formatarData(licenca.dataFim)}</span>
                </p>

                {licenca.arquivoURL && (
                  <a
                    className="lista-card-arquivo"
                    href={licenca.arquivoURL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📎 Ver arquivo
                  </a>
                )}

                {/* Ações de escrita (Editar / Ocultar / Restaurar):
                    totalmente ausentes em modo visitante. Como
                    mostrandoOcultas nunca é true nesse modo, o único
                    ramo que pode renderizar para um visitante é o de
                    "licenças ativas" — e mesmo assim escondemos os
                    botões e, com isso, a área de ações inteira. */}
                {!modoVisitante && (
                  <div className="lista-card-acoes">
                    {mostrandoOcultas ? (
                      <button
                        className="lista-btn-restaurar"
                        disabled={restaurandoId === licenca.id}
                        onClick={() => handleRestaurar(licenca)}
                      >
                        {restaurandoId === licenca.id
                          ? "Restaurando..."
                          : "Restaurar"}
                      </button>
                    ) : (
                      <>
                        <button
                          className="lista-btn-editar"
                          onClick={() => navigate(`/licenca/${licenca.id}/editar`)}
                        >
                          Editar
                        </button>
                        <button
                          className="lista-btn-ocultar"
                          disabled={ocultandoId === licenca.id}
                          onClick={() => setModalLicenca(licenca)}
                        >
                          {ocultandoId === licenca.id ? "Ocultando..." : "Ocultar"}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {!modoVisitante && modalLicenca && (
        <ModalConfirmacao
          nomeFunc={modalLicenca.nomeFunc}
          onConfirmar={() => handleOcultar(modalLicenca)}
          onCancelar={() => setModalLicenca(null)}
        />
      )}
    </div>
  );
}