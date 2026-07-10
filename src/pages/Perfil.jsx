import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth } from "../services/firebase/config";
import { atualizarPerfil, carregarPerfil, atualizarFotoPerfil } from "../services/firebase/auth";
import AvisoVisitante from "../components/AvisoVisitante";
import "../components/AvisoVisitante.css";
import "./Perfil.css";

const BIO_MAX = 120;

function Avatar({ nome, foto }) {
  if (foto) {
    return (
      <div className="perfil-avatar">
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
  return <div className="perfil-avatar">{iniciais || "?"}</div>;
}

export default function Perfil({ usuario }) {
  const navigate = useNavigate();
  const { uid: uidParam } = useParams();
  const donoUid = uidParam || usuario?.uid;
  const modoVisitante = Boolean(uidParam);

  const [nome, setNome] = useState("");
  const [bio, setBio] = useState("");
  const [emailExibido, setEmailExibido] = useState("");
  const [fotoExibida, setFotoExibida] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [sucesso, setSucesso] = useState("");
  const [erro, setErro] = useState("");

  const inputFotoRef = useRef(null);

  useEffect(() => {
    if (!donoUid) return;
    setCarregando(true);

    if (modoVisitante) {
      // Perfil de outra pessoa: tudo vem do Firestore, nunca do
      // `usuario` logado (que é só quem está navegando).
      carregarPerfil(donoUid)
        .then((dados) => {
          setNome(dados?.nome || "");
          setBio(dados?.bio || "");
          setEmailExibido(dados?.email || "");
          setFotoExibida(dados?.foto || "");
        })
        .catch(() => setErro("Não foi possível carregar este perfil agora."))
        .finally(() => setCarregando(false));
    } else {
      // Meu próprio perfil: comportamento 100% igual ao original.
      carregarPerfil(usuario.uid)
        .then((dados) => {
          setNome(dados?.nome || usuario.displayName || "");
          setBio(dados?.bio || "");
          setFotoExibida(dados?.foto || usuario.photoURL || "");
        })
        .catch(() => {
          setNome(usuario.displayName || "");
          setFotoExibida(usuario.photoURL || "");
        })
        .finally(() => setCarregando(false));
      setEmailExibido(usuario.email || "");
    }
  }, [donoUid, modoVisitante, usuario]);

  function limparMensagens() {
    setSucesso("");
    setErro("");
  }

  async function handleSalvar(e) {
    e.preventDefault();
    limparMensagens();

    if (!nome.trim()) return setErro("O nome não pode ficar em branco.");
    if (bio.length > BIO_MAX)
      return setErro(`A descrição deve ter no máximo ${BIO_MAX} caracteres.`);

    setSalvando(true);
    try {
      await atualizarPerfil(usuario.uid, nome.trim(), bio.trim());
      setSucesso("Perfil atualizado!");
      setTimeout(() => setSucesso(""), 3000);
    } catch {
      setErro("Não foi possível salvar as alterações. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleSelecionarFoto(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo depois
    if (!arquivo) return;

    limparMensagens();
    setEnviandoFoto(true);
    try {
      const url = await atualizarFotoPerfil(usuario.uid, arquivo);
      setFotoExibida(url);
      setSucesso("Foto de perfil atualizada!");
      setTimeout(() => setSucesso(""), 3000);
    } catch (err) {
      setErro(err.message || "Não foi possível atualizar a foto. Tente novamente.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function handleSair() {
    await auth.signOut();
    navigate("/login");
  }

  if (carregando) {
    return (
      <div className="perfil-bg">
        <div className="perfil-container">
          <p style={{ color: "#3e7d52", textAlign: "center", paddingTop: 48 }}>
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="perfil-bg">
      <div className="perfil-container">
        <button
          className="perfil-link-voltar"
          onClick={() => navigate(modoVisitante ? "/conexoes" : "/")}
        >
          ← Voltar
        </button>

        {modoVisitante && <AvisoVisitante nomeDono={nome} />}

        <h1 className="perfil-titulo">
          {modoVisitante ? `Perfil de ${nome || "..."}` : "Meu perfil"}
        </h1>
        {!modoVisitante && (
          <p className="perfil-sub">Veja e edite suas informações pessoais.</p>
        )}

        {/* Menu de navegação — só existe no modo visitante, já que o
            Home.jsx (que tem esse menu na conta normal) não é
            reaproveitado aqui. */}
        {modoVisitante && (
          <div className="perfil-menu-visitante">
            <button className="home-btn-primario" onClick={() => navigate(`/conexao/${donoUid}/inss`)}>
              Acompanhamento INSS
            </button>
            <button className="home-btn-primario" onClick={() => navigate(`/conexao/${donoUid}/licencas`)}>
              Licenças
            </button>
            <button className="home-btn-primario" onClick={() => navigate(`/conexao/${donoUid}/funcionarios`)}>
              Funcionários
            </button>
            <button className="home-btn-primario" onClick={() => navigate(`/conexao/${donoUid}/conexoes`)}>
              Conexões
            </button>
          </div>
        )}

        <div className="perfil-card">
          <div className="perfil-avatar-wrap">
            <div className="perfil-avatar-editavel">
              <Avatar nome={nome} foto={fotoExibida} />
              {!modoVisitante && (
                <button
                  type="button"
                  className="perfil-btn-trocar-foto"
                  onClick={() => inputFotoRef.current?.click()}
                  disabled={enviandoFoto}
                  title="Trocar foto de perfil"
                >
                  {enviandoFoto ? "..." : "📷"}
                </button>
              )}
            </div>
            {!modoVisitante && (
              <input
                ref={inputFotoRef}
                type="file"
                accept="image/*"
                className="perfil-input-foto-oculto"
                onChange={handleSelecionarFoto}
              />
            )}
          </div>

          <form className="perfil-form" onSubmit={handleSalvar}>
            <div className="perfil-campo">
              <label className="perfil-label">Nome completo</label>
              <input
                className="perfil-input"
                type="text"
                placeholder="Seu nome completo"
                value={nome}
                readOnly={modoVisitante}
                onChange={(e) => { if (!modoVisitante) { limparMensagens(); setNome(e.target.value); } }}
              />
            </div>

            <div className="perfil-campo">
              <label className="perfil-label">E-mail</label>
              <input
                className="perfil-input perfil-input-bloqueado"
                type="email"
                value={emailExibido}
                readOnly
              />
            </div>

            <div className="perfil-campo">
              <label className="perfil-label">Descrição curta</label>
              <textarea
                className="perfil-textarea"
                rows={3}
                placeholder="Uma frase sobre você ou sua função (opcional)"
                value={bio}
                maxLength={BIO_MAX}
                readOnly={modoVisitante}
                onChange={(e) => { if (!modoVisitante) { limparMensagens(); setBio(e.target.value); } }}
              />
              {!modoVisitante && (
                <p className={`perfil-contador ${bio.length >= BIO_MAX ? "perfil-contador-limite" : ""}`}>
                  {bio.length}/{BIO_MAX}
                </p>
              )}
            </div>

            {sucesso && <p className="perfil-sucesso">{sucesso}</p>}
            {erro && <p className="perfil-erro">{erro}</p>}

            {!modoVisitante && (
              <div className="perfil-acoes">
                <button className="perfil-btn-salvar" type="submit" disabled={salvando}>
                  {salvando ? "Salvando..." : "Salvar alterações"}
                </button>
                <button className="perfil-btn-sair" type="button" onClick={handleSair}>
                  Sair da conta
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}