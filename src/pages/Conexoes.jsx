import { useEffect, useState, useCallback } from "react";
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

// Gera as iniciais do nome para usar como avatar quando não há foto.
function iniciaisDoNome(nome) {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function Avatar({ nome, foto }) {
  if (foto) {
    return (
      <div className="conexoes-avatar">
        <img src={foto} alt={nome || "Usuário"} />
      </div>
    );
  }
  return <div className="conexoes-avatar">{iniciaisDoNome(nome)}</div>;
}

export default function Conexoes({ usuario }) {
  const navigate = useNavigate();

  const [termoBusca, setTermoBusca] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [jaBuscou, setJaBuscou] = useState(false);

  const [pendentes, setPendentes] = useState([]);
  const [carregandoPendentes, setCarregandoPendentes] = useState(true);

  const [conexoes, setConexoes] = useState([]);
  const [carregandoConexoes, setCarregandoConexoes] = useState(true);

  // uids para quem já enviei solicitação nesta sessão (evita "Conectar" duplicado
  // antes da lista de pendentes recarregar do lado de quem recebeu)
  const [enviadosAgora, setEnviadosAgora] = useState([]);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const meuUid = usuario?.uid;

  const carregarPendentes = useCallback(async () => {
    if (!meuUid) return;
    setCarregandoPendentes(true);
    try {
      const lista = await listarSolicitacoesPendentes(meuUid);
      setPendentes(lista);
    } catch (e) {
      setErro("Não foi possível carregar as solicitações pendentes agora.");
    } finally {
      setCarregandoPendentes(false);
    }
  }, [meuUid]);

  const carregarConexoes = useCallback(async () => {
    if (!meuUid) return;
    setCarregandoConexoes(true);
    try {
      const lista = await listarConexoes(meuUid);
      setConexoes(lista);
    } catch (e) {
      setErro("Não foi possível carregar suas conexões agora.");
    } finally {
      setCarregandoConexoes(false);
    }
  }, [meuUid]);

  useEffect(() => {
    carregarPendentes();
    carregarConexoes();
  }, [carregarPendentes, carregarConexoes]);

  function limparAvisos() {
    setErro("");
    setMensagem("");
  }

  async function handleBuscar(e) {
    e.preventDefault();
    limparAvisos();
    if (!termoBusca.trim()) return;

    setBuscando(true);
    setJaBuscou(true);
    try {
      const lista = await buscarUsuariosPorNome(termoBusca, meuUid);
      setResultados(lista);
    } catch (e) {
      setErro("Não foi possível buscar agora. Tente novamente em alguns instantes.");
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  }

  function statusDoUsuario(uidAlvo) {
    if (conexoes.some((c) => c.uid === uidAlvo)) return "conectado";
    if (enviadosAgora.includes(uidAlvo)) return "pendente";
    if (pendentes.some((p) => p.deUid === uidAlvo)) return "pendente";
    return "nenhum";
  }

  async function handleConectar(uidAlvo) {
    limparAvisos();
    try {
      await enviarSolicitacao(meuUid, uidAlvo);
      setEnviadosAgora((prev) => [...prev, uidAlvo]);
      setMensagem("Solicitação enviada! A pessoa vai precisar aceitar para vocês se conectarem.");
    } catch (e) {
      setErro(e?.message || "Não foi possível enviar a solicitação agora.");
    }
  }

  async function handleAceitar(solicitacao) {
    limparAvisos();
    try {
      await aceitarSolicitacao(solicitacao.id, solicitacao.deUid, solicitacao.paraUid);
      setMensagem("Conexão aceita com sucesso!");
      await Promise.all([carregarPendentes(), carregarConexoes()]);
    } catch (e) {
      setErro("Não foi possível aceitar agora. Tente novamente.");
    }
  }

  async function handleRecusar(solicitacaoId) {
    limparAvisos();
    try {
      await recusarSolicitacao(solicitacaoId);
      setMensagem("Solicitação recusada.");
      await carregarPendentes();
    } catch (e) {
      setErro("Não foi possível recusar agora. Tente novamente.");
    }
  }

  return (
    <div className="conexoes-bg">
      <div className="conexoes-container">
        <button className="conexoes-link-voltar" onClick={() => navigate("/")}>
          ← Voltar
        </button>

        <h1 className="conexoes-titulo">Conexões</h1>
        <p className="conexoes-sub">
          Você só vê os dados de outra pessoa depois que ela aceitar sua solicitação de conexão.
        </p>

        {erro && <p className="conexoes-erro">{erro}</p>}
        {mensagem && <p className="conexoes-mensagem">{mensagem}</p>}

        {/* Seção 1: Buscar usuário */}
        <section className="conexoes-secao">
          <h2 className="conexoes-secao-titulo">Buscar pessoa</h2>
          <form className="conexoes-busca-form" onSubmit={handleBuscar}>
            <input
              type="text"
              className="conexoes-input"
              placeholder="Digite o nome da pessoa"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
            />
            <button type="submit" className="conexoes-btn-buscar" disabled={buscando}>
              {buscando ? "Buscando..." : "Buscar"}
            </button>
          </form>

          {jaBuscou && !buscando && resultados.length === 0 && (
            <p className="conexoes-vazio">Nenhuma pessoa encontrada com esse nome.</p>
          )}

          {resultados.length > 0 && (
            <div className="conexoes-lista">
              {resultados.map((r) => {
                const status = statusDoUsuario(r.uid);
                return (
                  <div className="conexoes-item" key={r.uid}>
                    <Avatar nome={r.nome} foto={r.foto} />
                    <div className="conexoes-info">
                      <p className="conexoes-nome">{r.nome || "Sem nome"}</p>
                      <p className="conexoes-email">{r.email}</p>
                    </div>
                    <button
                      className="conexoes-btn-conectar"
                      disabled={status !== "nenhum"}
                      onClick={() => handleConectar(r.uid)}
                    >
                      {status === "conectado"
                        ? "Conectado"
                        : status === "pendente"
                        ? "Pendente"
                        : "Conectar"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Seção 2: Solicitações pendentes recebidas */}
        <section className="conexoes-secao">
          <h2 className="conexoes-secao-titulo">Solicitações recebidas</h2>

          {carregandoPendentes && <p className="conexoes-loading">Carregando...</p>}

          {!carregandoPendentes && pendentes.length === 0 && (
            <p className="conexoes-vazio">Nenhuma solicitação pendente.</p>
          )}

          {!carregandoPendentes && pendentes.length > 0 && (
            <div className="conexoes-lista">
              {pendentes.map((p) => (
                <div className="conexoes-item" key={p.id}>
                  <Avatar nome={p.remetente?.nome} foto={p.remetente?.foto} />
                  <div className="conexoes-info">
                    <p className="conexoes-nome">{p.remetente?.nome || "Sem nome"}</p>
                    <p className="conexoes-email">{p.remetente?.email}</p>
                  </div>
                  <div className="conexoes-acoes-duplas">
                    <button className="conexoes-btn-aceitar" onClick={() => handleAceitar(p)}>
                      Aceitar
                    </button>
                    <button className="conexoes-btn-recusar" onClick={() => handleRecusar(p.id)}>
                      Recusar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Seção 3: Conexões já aprovadas */}
        <section className="conexoes-secao">
          <h2 className="conexoes-secao-titulo">Minhas conexões</h2>

          {carregandoConexoes && <p className="conexoes-loading">Carregando...</p>}

          {!carregandoConexoes && conexoes.length === 0 && (
            <p className="conexoes-vazio">Você ainda não tem conexões.</p>
          )}

          {!carregandoConexoes && conexoes.length > 0 && (
            <div className="conexoes-lista">
              {conexoes.map((c) => (
                <div className="conexoes-item" key={c.uid}>
                  <Avatar nome={c.nome} foto={c.foto} />
                  <div className="conexoes-info">
                    <p className="conexoes-nome">{c.nome || "Sem nome"}</p>
                    <p className="conexoes-email">{c.email}</p>
                  </div>
                  <span className="conexoes-badge-destaque">Conectado</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}