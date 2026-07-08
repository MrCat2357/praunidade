import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  listarFuncionarios,
  listarLicencas,
  editarFuncionario,
  formatarData,
} from "../services/firebase/licencas";
import { carregarPerfil } from "../services/firebase/auth";
import AvisoVisitante from "../components/AvisoVisitante";
import "../components/AvisoVisitante.css";
import "./Funcionarios.css";

export default function Funcionarios({ usuario }) {
  const navigate = useNavigate();
  const { uid: uidParam } = useParams();
  const donoUid = uidParam || usuario?.uid;
  const modoVisitante = Boolean(uidParam);

  const [nomeDono, setNomeDono] = useState("");
  const [funcionarios, setFuncionarios] = useState([]);
  const [licencasPorFuncionario, setLicencasPorFuncionario] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [matriculaEdicao, setMatriculaEdicao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!donoUid) return;
    setCarregando(true);
    try {
      const tarefas = [listarFuncionarios(donoUid), listarLicencas(donoUid)];
      if (modoVisitante) tarefas.push(carregarPerfil(donoUid));

      const [funcs, licencas, perfilDono] = await Promise.all(tarefas);
      setFuncionarios(funcs);

      const agrupado = {};
      licencas.forEach((l) => {
        if (!agrupado[l.funcionarioId]) agrupado[l.funcionarioId] = [];
        agrupado[l.funcionarioId].push(l);
      });
      setLicencasPorFuncionario(agrupado);

      if (modoVisitante) setNomeDono(perfilDono?.nome || "");
    } catch (err) {
      console.error("Erro ao carregar funcionários:", err);
      setErro("Não foi possível carregar os funcionários agora.");
    } finally {
      setCarregando(false);
    }
  }, [donoUid, modoVisitante]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function iniciarEdicao(f) {
    setEditandoId(f.id);
    setNomeEdicao(f.nome);
    setMatriculaEdicao(f.matricula || "");
  }

  async function salvarEdicao(id) {
    if (!nomeEdicao.trim()) return setErro("O nome não pode ficar vazio.");
    if (matriculaEdicao && matriculaEdicao.length !== 8) {
      return setErro("A matrícula deve ter 8 dígitos.");
    }
    setSalvando(true);
    setErro("");
    try {
      await editarFuncionario(id, { nome: nomeEdicao, matricula: matriculaEdicao });
      setFuncionarios((atual) =>
        atual.map((f) =>
          f.id === id ? { ...f, nome: nomeEdicao.trim(), matricula: matriculaEdicao } : f
        )
      );
      setEditandoId(null);
    } catch {
      setErro("Não foi possível salvar as alterações.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="func-bg">
      <div className="func-container">
        <button
          className="func-link-voltar"
          onClick={() => navigate(modoVisitante ? "/conexoes" : "/")}
        >
          ← Voltar
        </button>

        {modoVisitante && <AvisoVisitante nomeDono={nomeDono} />}

        <h1 className="func-titulo">
          {modoVisitante ? `Funcionários de ${nomeDono || "..."}` : "Funcionários"}
        </h1>
        <p className="func-sub">
          {modoVisitante
            ? "Histórico de licenças por funcionário (somente leitura)."
            : "Histórico de licenças por funcionário."}
        </p>

        {erro && <p className="func-erro">{erro}</p>}

        {carregando ? (
          <p className="func-loading">Carregando...</p>
        ) : funcionarios.length === 0 ? (
          <div className="func-vazio">
            <div className="func-vazio-icone">👥</div>
            <p className="func-vazio-texto">
              {modoVisitante
                ? "Essa pessoa ainda não tem funcionários cadastrados."
                : "Nenhum funcionário cadastrado ainda."}
            </p>
          </div>
        ) : (
          <div className="func-cards">
            {funcionarios.map((f) => {
              const licencas = licencasPorFuncionario[f.id] || [];
              const emEdicao = !modoVisitante && editandoId === f.id;
              return (
                <div className="func-card" key={f.id}>
                  {emEdicao ? (
                    <div className="func-edicao">
                      <input
                        className="func-input-edicao"
                        type="text"
                        value={nomeEdicao}
                        onChange={(e) => setNomeEdicao(e.target.value)}
                        placeholder="Nome"
                      />
                      <input
                        className="func-input-edicao"
                        type="text"
                        inputMode="numeric"
                        maxLength={8}
                        value={matriculaEdicao}
                        onChange={(e) =>
                          setMatriculaEdicao(e.target.value.replace(/\D/g, "").slice(0, 8))
                        }
                        placeholder="Matrícula"
                      />
                      <div className="func-edicao-acoes">
                        <button
                          className="func-btn-salvar-edicao"
                          disabled={salvando}
                          onClick={() => salvarEdicao(f.id)}
                        >
                          {salvando ? "Salvando..." : "Salvar"}
                        </button>
                        <button
                          className="func-btn-cancelar-edicao"
                          onClick={() => setEditandoId(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="func-card-header">
                        <div>
                          <p className="func-card-nome">{f.nome}</p>
                          <p className="func-card-matricula">
                            {f.matricula ? `Matrícula: ${f.matricula}` : "Sem matrícula"}
                          </p>
                        </div>
                        {!modoVisitante && (
                          <button className="func-btn-editar" onClick={() => iniciarEdicao(f)}>
                            Editar
                          </button>
                        )}
                      </div>

                      {licencas.length === 0 ? (
                        <p className="func-sem-licencas">Nenhuma licença registrada.</p>
                      ) : (
                        <ol className="func-lista-licencas">
                          {licencas.map((l) => (
                            <li key={l.id} className="func-item-licenca">
                              <span>
                                {formatarData(l.dataInicio)} - {formatarData(l.dataFim)}
                              </span>
                              <span className="func-item-cid">{l.cid}</span>
                              {l.arquivoURL && (
                                <a href={l.arquivoURL} target="_blank" rel="noopener noreferrer">
                                  Link
                                </a>
                              )}
                            </li>
                          ))}
                        </ol>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}