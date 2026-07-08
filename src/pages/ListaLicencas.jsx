import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { listarLicencas, ocultarLicenca, formatarData } from "../services/firebase/licencas";
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
  const [licencas, setLicencas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [ocultandoId, setOcultandoId] = useState(null); // id sendo processado
  const [modalLicenca, setModalLicenca] = useState(null); // licença aguardando confirmação
  const [erro, setErro] = useState("");

  const carregarLicencas = useCallback(async () => {
    if (!usuario?.uid) return;
    setCarregando(true);
    try {
      const lista = await listarLicencas(usuario.uid);
      setLicencas(lista);
    } catch (err) {
      console.error("Erro ao carregar licenças:", err);
      setErro("Não foi possível carregar as licenças agora.");
    } finally {
      setCarregando(false);
    }
  }, [usuario]);

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

  return (
    <div className="lista-bg">
      <div className="lista-container">
        <button className="lista-link-voltar" onClick={() => navigate("/")}>
          ← Voltar
        </button>

        <div className="lista-header">
          <h1 className="lista-titulo">Licenças</h1>
          <button
            className="lista-btn-nova"
            onClick={() => navigate("/nova-licenca")}
          >
            + Nova licença
          </button>
        </div>
        <p className="lista-sub">Acompanhamento INSS — regra dos 60 dias.</p>

        {erro && (
          <p style={{ color: "#501313", background: "#fcebeb", padding: "10px 14px", borderRadius: 8, marginBottom: 16 }}>
            {erro}
          </p>
        )}

        {carregando ? (
          <p className="lista-loading">Carregando...</p>
        ) : licencas.length === 0 ? (
          <div className="lista-vazio">
            <div className="lista-vazio-icone">📋</div>
            <p className="lista-vazio-texto">Nenhuma licença cadastrada ainda.</p>
            <button
              className="lista-vazio-btn"
              onClick={() => navigate("/nova-licenca")}
            >
              Cadastrar primeira licença
            </button>
          </div>
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

                <div className="lista-card-acoes">
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalLicenca && (
        <ModalConfirmacao
          nomeFunc={modalLicenca.nomeFunc}
          onConfirmar={() => handleOcultar(modalLicenca)}
          onCancelar={() => setModalLicenca(null)}
        />
      )}
    </div>
  );
}