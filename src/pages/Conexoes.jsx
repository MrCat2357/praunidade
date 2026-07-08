import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  buscarUsuariosPorNome,
  enviarSolicitacao,
  listarSolicitacoesPendentes,
  aceitarSolicitacao,
  recusarSolicitacao,
  listarConexoes,
} from "../services/firebase/conexoes";
import { carregarPerfil } from "../services/firebase/auth";
import AvisoVisitante from "../components/AvisoVisitante";
import "../components/AvisoVisitante.css";
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
  const { uid: uidParam } = useParams();
  const meuUid = usuario?.uid;
  const donoUid = uidParam || meuUid;
  const modoVisitante = Boolean(uidParam);

  const [nomeDono, setNomeDono] = useState("");

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
    if (!donoUid) return;
    setCarregandoInicial(true);
    try {
      if (modoVisitante) {
        // Modo visitante: NÃO buscamos solicitações pendentes de outra
        // pessoa — além de não fazer sentido mostrar isso a um
        // terceiro, a regra do Firestore de "solicitacoes" só libera
        // leitura para o remetente/destinatário, então essa chamada
        // seria negada mesmo que tentássemos.
        const [listaConexoes, perfilDono] = await Promise.all([
          listarConexoes(donoUid),
          carregarPerfil(donoUid),
        ]);
        setConexoes(listaConexoes);
        setPendentes([]);
        setNomeDono(perfilDono?.nome || "");
      } else {
        const [listaPendentes, listaConexoes] = await Promise.all([
          listarSolicitacoesPendentes(meuUid),
          listarConexoes(meuUid),
        ]);
        setPendentes(listaPendentes);
        setConexoes(listaConexoes);
      }
    } catch {
      setErro("Não foi possível carregar as conexões agora.");
    } finally {
      setCarregandoInicial(false);
    }
  }, [donoUid, modoVisitante, meuUid]);

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

  // Clique num card de "Suas conexões": navega para a versão
  // visitante da conta daquela pessoa. Funciona igual seja a partir da
  // MINHA tela de Conexões ou de dentro de uma visita já em curso
  // (navegação em cadeia), já que sempre aponta para /conexao/{uid}.
  function handleAbrirConexao(uidAlvo) {
    if (uidAlvo === meuUid) {
      navigate("/conexoes");
      return;
    }
    navigate(`/conexao/${uidAlvo}`);
  }

  return (
    <div className="conexoes-bg">
      <div className="conexoes-container">
        <button
          className="conexoes-link-voltar"
          onClick={() => navigate(modoVisitante ? "/conexoes" : "/")}
        >
          ← Voltar
        </button>

        {modoVisitante && <AvisoVisitante nomeDono={nomeDono} />}

        <h1 className="conexoes-titulo">
          {modoVisitante ? `Conexões de ${nomeDono || "..."}` : "Conexões"}
        </h1>
        {!modoVisitante && (
          <p className="conexoes-sub">
            Conecte-se com outras pessoas para acompanhar licenças em conjunto.
          </p>
        )}

        {/* BUSCA — só faz sentido na MINHA tela de conexões */}
        {!modoVisitante && (
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
                {resultadosBusca.map((usuarioResultado) => (
                  <div className="conexoes-item" key={usuarioResultado.uid}>
                    <Avatar nome={usuarioResultado.nome} foto={usuarioResultado.foto} />
                    <div className="conexoes-info">
                      <p className="conexoes-nome">{usuarioResultado.nome || "Sem nome"}</p>
                      <p className="conexoes-email">{usuarioResultado.email}</p>
                    </div>
                    <button
                      className="conexoes-btn-conectar"
                      onClick={() => handleConectar(usuarioResultado.uid)}
                      disabled={jaConectadoOuPendente(usuarioResultado.uid)}
                    >
                      {jaConectadoOuPendente(usuarioResultado.uid) ? "Enviado" : "Conectar"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!buscando && termoBusca.trim() && resultadosBusca.length === 0 && (
              <p className="conexoes-vazio">Nenhuma pessoa encontrada com esse nome.</p>
            )}
          </div>
        )}

        {erro && <p className="conexoes-erro">{erro}</p>}
        {mensagem && <p className="conexoes-mensagem">{mensagem}</p>}

        {carregandoInicial ? (
          <p className="conexoes-loading">Carregando...</p>
        ) : (
          <>
            {/* SOLICITAÇÕES PENDENTES — só na MINHA tela */}
            {!modoVisitante && (
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
            )}

            {/* CONEXÕES APROVADAS — clicável em qualquer modo */}
            <div className="conexoes-secao">
              <h2 className="conexoes-secao-titulo">
                {modoVisitante ? "Conexões dela(e)" : "Suas conexões"}
              </h2>
              {conexoes.length === 0 ? (
                <p className="conexoes-vazio">
                  {modoVisitante
                    ? "Essa pessoa ainda não tem conexões."
                    : "Você ainda não tem conexões."}
                </p>
              ) : (
                <div className="conexoes-lista">
                  {conexoes.map((conexao) => (
                    <div
                      className="conexoes-item conexoes-item-clicavel"
                      key={conexao.uid}
                      onClick={() => handleAbrirConexao(conexao.uid)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") handleAbrirConexao(conexao.uid);
                      }}
                    >
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