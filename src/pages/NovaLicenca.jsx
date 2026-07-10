import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  buscarOuCriarFuncionario,
  listarFuncionarios,
  listarCidsUnicos,
  cadastrarLicenca,
  buscarLicenca,
  editarLicenca,
  uploadArquivoLicenca,
  timestampParaInputDate,
} from "../services/firebase/licencas";
import "./NovaLicenca.css";

export default function NovaLicenca({ usuario }) {
  const navigate = useNavigate();
  const { id: licencaId } = useParams();
  const modoEdicao = Boolean(licencaId);

  const [nomeFunc, setNomeFunc] = useState("");
  const [sugestoes, setSugestoes] = useState([]);
  const [todosFuncionarios, setTodosFuncionarios] = useState([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  const [matricula, setMatricula] = useState("");
  const [sugestoesMatricula, setSugestoesMatricula] = useState([]);
  const [mostrarSugestoesMatricula, setMostrarSugestoesMatricula] = useState(false);

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [cid, setCid] = useState("");
  const [sugestoesCid, setSugestoesCid] = useState([]);
  const [todosCids, setTodosCids] = useState([]);
  const [mostrarSugestoesCid, setMostrarSugestoesCid] = useState(false);

  const [arquivo, setArquivo] = useState(null);
  const [arquivoURL, setArquivoURL] = useState("");
  const [fazendoUpload, setFazendoUpload] = useState(false);

  const [carregando, setCarregando] = useState(modoEdicao);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const inputArquivoRef = useRef(null);
  const autocompleteRef = useRef(null);
  const matriculaAutocompleteRef = useRef(null);
  const cidAutocompleteRef = useRef(null);

  useEffect(() => {
    if (!usuario?.uid) return;
    listarFuncionarios(usuario.uid)
      .then(setTodosFuncionarios)
      .catch((err) => console.error("Erro ao listar funcionários:", err));
    listarCidsUnicos(usuario.uid)
      .then(setTodosCids)
      .catch((err) => console.error("Erro ao listar CIDs:", err));
  }, [usuario]);

  useEffect(() => {
    if (!modoEdicao || !licencaId) return;
    buscarLicenca(licencaId)
      .then((licenca) => {
        if (!licenca) { navigate("/licencas"); return; }
        setNomeFunc(licenca.nomeFunc || "");
        setDataInicio(timestampParaInputDate(licenca.dataInicio));
        setDataFim(timestampParaInputDate(licenca.dataFim));
        setCid(licenca.cid || "");
        setArquivoURL(licenca.arquivoURL || "");
      })
      .catch(() => setErro("Não foi possível carregar os dados da licença."))
      .finally(() => setCarregando(false));
  }, [modoEdicao, licencaId, navigate]);

  useEffect(() => {
    function handler(e) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) {
        setMostrarSugestoes(false);
      }
      if (matriculaAutocompleteRef.current && !matriculaAutocompleteRef.current.contains(e.target)) {
        setMostrarSugestoesMatricula(false);
      }
      if (cidAutocompleteRef.current && !cidAutocompleteRef.current.contains(e.target)) {
        setMostrarSugestoesCid(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleNomeFuncChange(e) {
    const valor = e.target.value;
    setNomeFunc(valor);
    if (valor.trim().length > 0) {
      const filtrados = todosFuncionarios.filter((f) =>
        f.nome.toLowerCase().includes(valor.toLowerCase())
      );
      setSugestoes(filtrados);
      setMostrarSugestoes(true);

      const exato = todosFuncionarios.find(
        (f) => f.nome.toLowerCase() === valor.trim().toLowerCase()
      );
      if (exato && exato.matricula) setMatricula(exato.matricula);
    } else {
      setMostrarSugestoes(false);
    }
  }

  function selecionarFuncionario(f) {
    setNomeFunc(f.nome);
    if (f.matricula) setMatricula(f.matricula);
    setMostrarSugestoes(false);
  }

  function handleMatriculaChange(e) {
    const valor = e.target.value.replace(/\D/g, "").slice(0, 8);
    setMatricula(valor);
    if (valor.length > 0) {
      const filtrados = todosFuncionarios.filter((f) =>
        (f.matricula || "").includes(valor)
      );
      setSugestoesMatricula(filtrados);
      setMostrarSugestoesMatricula(true);

      const exato = todosFuncionarios.find((f) => f.matricula === valor);
      if (exato) setNomeFunc(exato.nome);
    } else {
      setMostrarSugestoesMatricula(false);
    }
  }

  function selecionarMatricula(f) {
    setMatricula(f.matricula);
    setNomeFunc(f.nome);
    setMostrarSugestoesMatricula(false);
  }

  function handleCidChange(e) {
    const valor = e.target.value;
    setCid(valor);
    if (valor.trim().length > 0) {
      const filtrados = todosCids.filter((c) =>
        c.toLowerCase().includes(valor.toLowerCase())
      );
      setSugestoesCid(filtrados);
      setMostrarSugestoesCid(true);
    } else {
      setMostrarSugestoesCid(false);
    }
  }

  function selecionarCid(c) {
    setCid(c);
    setMostrarSugestoesCid(false);
  }

  function handleArquivoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const tiposPermitidos = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!tiposPermitidos.includes(file.type)) {
      setErro("Apenas arquivos PDF, JPG ou PNG são aceitos.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErro("O arquivo deve ter no máximo 10MB.");
      return;
    }
    setErro("");
    setArquivo(file);
  }

  async function handleSalvar(e) {
    e.preventDefault();
    setErro("");

    if (!nomeFunc.trim()) return setErro("Digite o nome do funcionário.");
    if (!dataInicio) return setErro("Informe a data de início da licença.");
    if (!dataFim) return setErro("Informe a data de fim da licença.");
    if (dataFim < dataInicio) return setErro("A data de fim não pode ser anterior à data de início.");
    if (!cid.trim()) return setErro("Informe o CID da licença.");
    if (matricula && matricula.length !== 8) {
      return setErro("A matrícula deve ter 8 dígitos.");
    }

    setSalvando(true);
    try {
      let urlFinal = arquivoURL;

      if (arquivo) {
        setFazendoUpload(true);
        urlFinal = await uploadArquivoLicenca(arquivo, usuario.uid);
        setFazendoUpload(false);
      }

      if (modoEdicao) {
        await editarLicenca(licencaId, {
          nomeFunc: nomeFunc.trim(),
          dataInicio,
          dataFim,
          cid,
          arquivoURL: urlFinal,
        });
      } else {
        const funcionarioId = await buscarOuCriarFuncionario(nomeFunc, matricula, usuario.uid);
        await cadastrarLicenca({
          funcionarioId,
          nomeFunc: nomeFunc.trim(),
          donoUid: usuario.uid,
          dataInicio,
          dataFim,
          cid,
          arquivoURL: urlFinal,
        });
      }

      navigate("/licencas");
    } catch (err) {
      console.error("Erro ao salvar licença:", err);
      setErro("Não foi possível salvar a licença. Tente novamente.");
    } finally {
      setSalvando(false);
      setFazendoUpload(false);
    }
  }

  if (carregando) {
    return (
      <div className="licenca-bg">
        <div className="licenca-container">
          <p style={{ color: "#3e7d52", textAlign: "center", paddingTop: 48 }}>
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  const labelBotao = fazendoUpload
    ? "Enviando arquivo..."
    : salvando
    ? "Salvando..."
    : modoEdicao
    ? "Salvar alterações"
    : "Salvar licença";

  return (
    <div className="licenca-bg">
      <div className="licenca-container">
        <button className="licenca-link-voltar" onClick={() => navigate("/licencas")}>
          ← Voltar
        </button>
        <h1 className="licenca-titulo">
          {modoEdicao ? "Editar licença" : "Nova licença"}
        </h1>
        <p className="licenca-sub">
          {modoEdicao
            ? "Atualize as informações da licença médica."
            : "Preencha os dados da licença médica do funcionário."}
        </p>

        <div className="licenca-card">
          <form className="licenca-form" onSubmit={handleSalvar}>

            <div className="licenca-datas">
              {/* Funcionário */}
              <div className="licenca-campo">
                <label className="licenca-label">Funcionário</label>
                <div className="licenca-autocomplete-wrap" ref={autocompleteRef}>
                  <input
                    className="licenca-input"
                    type="text"
                    placeholder="Nome do funcionário"
                    value={nomeFunc}
                    onChange={handleNomeFuncChange}
                    onFocus={() => {
                      setSugestoes(
                        nomeFunc.trim()
                          ? todosFuncionarios.filter((f) =>
                              f.nome.toLowerCase().includes(nomeFunc.toLowerCase())
                            )
                          : todosFuncionarios
                      );
                      setMostrarSugestoes(true);
                    }}
                    autoComplete="off"
                  />
                  {mostrarSugestoes && (
                    <div className="licenca-autocomplete-lista">
                      {sugestoes.map((f) => (
                        <div
                          key={f.id}
                          className="licenca-autocomplete-item"
                          onMouseDown={() => selecionarFuncionario(f)}
                        >
                          {f.nome}
                        </div>
                      ))}
                      {nomeFunc.trim() &&
                        !sugestoes.some(
                          (f) => f.nome.toLowerCase() === nomeFunc.trim().toLowerCase()
                        ) && (
                          <div
                            className="licenca-autocomplete-novo"
                            onMouseDown={() => setMostrarSugestoes(false)}
                          >
                            + Criar "{nomeFunc.trim()}"
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>

              {/* Matrícula */}
              <div className="licenca-campo">
                <label className="licenca-label">
                  Matrícula <span className="licenca-label-opcional">(opcional)</span>
                </label>
                <div className="licenca-autocomplete-wrap" ref={matriculaAutocompleteRef}>
                  <input
                    className="licenca-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="8 dígitos"
                    value={matricula}
                    maxLength={8}
                    onChange={handleMatriculaChange}
                    onFocus={() => {
                      setSugestoesMatricula(
                        matricula
                          ? todosFuncionarios.filter((f) => (f.matricula || "").includes(matricula))
                          : todosFuncionarios.filter((f) => f.matricula)
                      );
                      setMostrarSugestoesMatricula(true);
                    }}
                    autoComplete="off"
                  />
                  {mostrarSugestoesMatricula && (
                    <div className="licenca-autocomplete-lista">
                      {sugestoesMatricula.map((f) => (
                        <div
                          key={f.id}
                          className="licenca-autocomplete-item"
                          onMouseDown={() => selecionarMatricula(f)}
                        >
                          {f.matricula} — {f.nome}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Datas */}
            <div className="licenca-datas">
              <div className="licenca-campo">
                <label className="licenca-label">Data de início</label>
                <input
                  className="licenca-input"
                  type="date"
                  value={dataInicio}
                  max={dataFim || undefined}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div className="licenca-campo">
                <label className="licenca-label">Data de fim</label>
                <input
                  className="licenca-input"
                  type="date"
                  value={dataFim}
                  min={dataInicio || undefined}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>

            {/* CID */}
            <div className="licenca-campo">
              <label className="licenca-label">CID</label>
              <div className="licenca-autocomplete-wrap" ref={cidAutocompleteRef}>
                <input
                  className="licenca-input"
                  type="text"
                  placeholder="Ex: M54.5"
                  value={cid}
                  onChange={handleCidChange}
                  onFocus={() => {
                    setSugestoesCid(
                      cid.trim()
                        ? todosCids.filter((c) => c.toLowerCase().includes(cid.toLowerCase()))
                        : todosCids
                    );
                    setMostrarSugestoesCid(true);
                  }}
                  autoComplete="off"
                />
                {mostrarSugestoesCid && (
                  <div className="licenca-autocomplete-lista">
                    {sugestoesCid.map((c) => (
                      <div
                        key={c}
                        className="licenca-autocomplete-item"
                        onMouseDown={() => selecionarCid(c)}
                      >
                        {c}
                      </div>
                    ))}
                    {cid.trim() &&
                      !sugestoesCid.some((c) => c.toLowerCase() === cid.trim().toLowerCase()) && (
                        <div
                          className="licenca-autocomplete-novo"
                          onMouseDown={() => setMostrarSugestoesCid(false)}
                        >
                          + Usar "{cid.trim()}"
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* Upload */}
            <div className="licenca-campo">
              <label className="licenca-label">
                Arquivo da licença <span className="licenca-label-opcional">(opcional)</span>
              </label>
              <div className="licenca-upload-area" onClick={() => inputArquivoRef.current?.click()}>
                <div className="licenca-upload-icone">📄</div>
                <p className="licenca-upload-texto">
                  {arquivo ? arquivo.name : "Toque para selecionar um arquivo"}
                </p>
                <p className="licenca-upload-hint">PDF, JPG ou PNG — máximo 10MB</p>
                <input
                  ref={inputArquivoRef}
                  className="licenca-upload-input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleArquivoChange}
                />
              </div>
              {arquivoURL && !arquivo && (
                <p className="licenca-upload-existente">
                  📎 <a href={arquivoURL} target="_blank" rel="noopener noreferrer">Ver arquivo atual</a>
                </p>
              )}
              {fazendoUpload && <p className="licenca-upload-progress">Enviando arquivo...</p>}
            </div>

            {erro && <p className="licenca-erro">{erro}</p>}

            <div className="licenca-acoes">
              <button className="licenca-btn-salvar" type="submit" disabled={salvando || fazendoUpload}>
                {labelBotao}
              </button>
              <button className="licenca-btn-cancelar" type="button" onClick={() => navigate("/licencas")}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}