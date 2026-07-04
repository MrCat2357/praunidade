import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  buscarUsuariosPorNome,
  enviarSolicitacao,
  listarSolicitacoesPendentes,
  aceitarSolicitacao,
  recusarSolicitacao,
  listarConexoes,
} from "../services/firebase/conexoes";
import "./Conexoes.css";

function Avatar({ nome, foto }) {
  if (foto) {
    return (
      <div className="conexoes-avatar">
        <img src={foto} alt={nome || "Usuário"} />
      </div>
    );
  }
  const iniciais = (nome || "?")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");
  return <div className="conexoes-avatar">{iniciais || "?"}</div>;
}

export default function Conexoes({ usuario }) {
  const navigate = useNavigate();
  const meuUid = usuario?.uid;

  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [termoBusca, setTermoBusca] = useState("");
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [solicitacoesEnviadasUids, setSolicitacoesEnviadasUids] = useState([]);

  const [pendentes, setPendentes] = useState([]);
  const [conexoes, setConexoes] = useState([]);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregarDados = useCallback(async () => {
    if (!meuUid) return;
    setCarregandoInicial(true);
    try {
      const [listaPendentes, listaConexoes] = await Promise.all([
        listarSolicitacoesPendentes(meuUid),
        listarConexoes(meuUid),
      ]);
      setPendentes(listaPendentes);
      setConexoes(listaConexoes);
    } catch {
      setErro("Não foi possível carregar suas conexões agora.");
    } finally {
      setCarregandoInicial(false);
    }
  }, [meuUid]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  function limparMensagens() {
    setErro("");
    setMensagem("");
  }

  async function handleBuscar(e) {
    e.preventDefault();
    limparMensagens();
    if (!termoBusca.trim()) return;
    setBuscando(true);
    try {
      const resultados = await buscarUsuariosPorNome(termoBusca, meuUid);
      setResultadosBusca(resultados);
    } catch {
      setErro("Não foi possível buscar usuários agora. Tente novamente.");
    } finally {
      setBuscando(false);
    }
  }

  async function handleConectar(uidAlvo) {
    limparMensagens();
    try {
      await enviarSolicitacao(meuUid, uidAlvo);
      setSolicitacoesEnviadasUids((atual) => [...atual, uidAlvo]);
      setMensagem("Solicitação enviada.");
    } catch (err) {
      setErro(err.message || "Não foi possível enviar a solicitação.");
    }
  }

  async function handleAceitar(solicitacao) {
    limparMensagens();
    try {
      await aceitarSolicitacao(solicitacao.id, solicitacao.deUid, meuUid);
      setMensagem("Conexão aceita.");
      await carregarDados();
    } catch {
      setErro("Não foi possível aceitar a solicitação. Tente novamente.");
    }
  }

  async function handleRecusar(solicitacao) {
    limparMensagens();
    try {
      await recusarSolicitacao(solicitacao.id);
      setPendentes((atual) => atual.filter((s) => s.id !== solicitacao.id));
    } catch {
      setErro("Não foi possível recusar a solicitação. Tente novamente.");
    }
  }

  function jaConectadoOuPendente(uid) {
    if (solicitacoesEnviadasUids.includes(uid)) return true;
    if (conexoes.some((c) => c.uid === uid)) return true;
    return false;
  }

  return (
    <div className="conexoes-bg">
      <div className="conexoes-container">
        <button className="conexoes-link-voltar" onClick={() => navigate("/")}>
          ← Voltar
        </button>
        <h1 className="conexoes-titulo">Conexões</h1>
        <p className="conexoes-sub">
          Conecte-se com outras pessoas para acompanhar licenças em conjunto.
        </p>

        {/* BUSCA */}
        <div className="conexoes-secao">
          <h2 className="conexoes-secao-titulo">Buscar pessoas</h2>
          <form className="conexoes-busca-form" onSubmit={handleBuscar}>
            <input
              className="conexoes-input"
              type="text"
              placeholder="Digite um nome"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
            />
            <button className="conexoes-btn-buscar" type="submit" disabled={buscando}>
              {buscando ? "Buscando..." : "Buscar"}
            </button>
          </form>

          {resultadosBusca.length > 0 && (
            <div className="conexoes-lista">
              {resultadosBusca.map((usuario) => (
                <div className="conexoes-item" key={usuario.uid}>
                  <Avatar nome={usuario.nome} foto={usuario.foto} />
                  <div className="conexoes-info">
                    <p className="conexoes-nome">{usuario.nome || "Sem nome"}</p>
                    <p className="conexoes-email">{usuario.email}</p>
                  </div>
                  <button
                    className="conexoes-btn-conectar"
                    onClick={() => handleConectar(usuario.uid)}
                    disabled={jaConectadoOuPendente(usuario.uid)}
                  >
                    {jaConectadoOuPendente(usuario.uid) ? "Enviado" : "Conectar"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {!buscando && termoBusca.trim() && resultadosBusca.length === 0 && (
            <p className="conexoes-vazio">Nenhuma pessoa encontrada com esse nome.</p>
          )}
        </div>

        {erro && <p className="conexoes-erro">{erro}</p>}
        {mensagem && <p className="conexoes-mensagem">{mensagem}</p>}

        {carregandoInicial ? (
          <p className="conexoes-loading">Carregando...</p>
        ) : (
          <>
            {/* SOLICITAÇÕES PENDENTES */}
            <div className="conexoes-secao">
              <h2 className="conexoes-secao-titulo">Solicitações pendentes</h2>
              {pendentes.length === 0 ? (
                <p className="conexoes-vazio">Você não tem solicitações no momento.</p>
              ) : (
                <div className="conexoes-lista">
                  {pendentes.map((solicitacao) => (
                    <div className="conexoes-item" key={solicitacao.id}>
                      <Avatar
                        nome={solicitacao.remetente?.nome}
                        foto={solicitacao.remetente?.foto}
                      />
                      <div className="conexoes-info">
                        <p className="conexoes-nome">
                          {solicitacao.remetente?.nome || "Usuário"}
                        </p>
                        <p className="conexoes-email">
                          {solicitacao.remetente?.email || ""}
                        </p>
                      </div>
                      <div className="conexoes-acoes-duplas">
                        <button
                          className="conexoes-btn-aceitar"
                          onClick={() => handleAceitar(solicitacao)}
                        >
                          Aceitar
                        </button>
                        <button
                          className="conexoes-btn-recusar"
                          onClick={() => handleRecusar(solicitacao)}
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CONEXÕES APROVADAS */}
            <div className="conexoes-secao">
              <h2 className="conexoes-secao-titulo">Suas conexões</h2>
              {conexoes.length === 0 ? (
                <p className="conexoes-vazio">Você ainda não tem conexões.</p>
              ) : (
                <div className="conexoes-lista">
                  {conexoes.map((conexao) => (
                    <div className="conexoes-item" key={conexao.uid}>
                      <Avatar nome={conexao.nome} foto={conexao.foto} />
                      <div className="conexoes-info">
                        <p className="conexoes-nome">{conexao.nome || "Sem nome"}</p>
                        <p className="conexoes-email">{conexao.email}</p>
                      </div>
                      <span className="conexoes-badge-destaque">Conectado</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}