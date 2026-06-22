import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  checkEmailExists,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  resetPassword,
} from "../services/firebase/auth";
import "./Login.css";

const STEP = {
  EMAIL: "email",
  LOGIN: "login",
  REGISTER: "register",
  RESET_SENT: "reset_sent",
};

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEP.EMAIL);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [termos, setTermos] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  function limparErro() {
    setErro("");
    setSucesso("");
  }

  // Passo 1 — verificar email
  async function handleCheckEmail(e) {
    e.preventDefault();
    limparErro();
    if (!email) return setErro("Digite seu e-mail.");
    setLoading(true);
    try {
      const existe = await checkEmailExists(email);
      setStep(existe ? STEP.LOGIN : STEP.REGISTER);
    } catch {
      setErro("Não foi possível verificar o e-mail. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  // Passo 2a — login com senha
  async function handleLogin(e) {
    e.preventDefault();
    limparErro();
    if (!password) return setErro("Digite sua senha.");
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate("/");
    } catch (err) {
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setErro("Senha incorreta. Tente novamente.");
      } else {
        setErro("Erro ao entrar. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Passo 2b — cadastro
  async function handleRegister(e) {
    e.preventDefault();
    limparErro();
    if (!nome.trim()) return setErro("Digite seu nome completo.");
    if (password.length < 6) return setErro("A senha deve ter no mínimo 6 caracteres.");
    if (!termos) return setErro("Aceite os Termos de Uso para continuar.");
    setLoading(true);
    try {
      await registerWithEmail(email, password, nome.trim());
      navigate("/");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setErro("Este e-mail já está cadastrado.");
      } else {
        setErro("Erro ao criar conta. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Google
  async function handleGoogle() {
    limparErro();
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate("/");
    } catch {
      setErro("Não foi possível entrar com o Google. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  // Esqueci senha
  async function handleReset() {
    limparErro();
    setLoading(true);
    try {
      await resetPassword(email);
      setStep(STEP.RESET_SENT);
    } catch {
      setErro("Não foi possível enviar o e-mail. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-dot" />
          PraUnidade
        </div>

        {/* PASSO 1 — EMAIL */}
        {step === STEP.EMAIL && (
          <>
            <h1 className="login-title">Entrar na sua conta</h1>
            <p className="login-sub">Bem-vindo! Digite seu e-mail para começar.</p>
            <form onSubmit={handleCheckEmail} className="login-form">
              <label className="login-label">E-mail</label>
              <input
                className="login-input"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              {erro && <p className="login-erro">{erro}</p>}
              <button className="login-btn-primary" type="submit" disabled={loading}>
                {loading ? "Verificando..." : "Continuar"}
              </button>
            </form>
            <div className="login-divider"><span>ou continue com</span></div>
            <button className="login-btn-google" onClick={handleGoogle} disabled={loading}>
              <GoogleIcon /> Continuar com Google
            </button>
          </>
        )}

        {/* PASSO 2A — LOGIN */}
        {step === STEP.LOGIN && (
          <>
            <h1 className="login-title">Entrar na sua conta</h1>
            <p className="login-sub">Encontramos sua conta. Digite sua senha.</p>
            <form onSubmit={handleLogin} className="login-form">
              <label className="login-label">E-mail</label>
              <div className="login-input-frozen-wrap">
                <input className="login-input login-input-frozen" value={email} readOnly />
                <button type="button" className="login-trocar" onClick={() => { setStep(STEP.EMAIL); limparErro(); }}>
                  Trocar
                </button>
              </div>
              <label className="login-label">Senha</label>
              <div className="login-input-pass-wrap">
                <input
                  className="login-input"
                  type={showPass ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
                <button type="button" className="login-show-pass" onClick={() => setShowPass(!showPass)}>
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
              {erro && <p className="login-erro">{erro}</p>}
              <button className="login-btn-primary" type="submit" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
            <button className="login-link" onClick={handleReset} disabled={loading}>
              Esqueci a senha
            </button>
            <div className="login-divider"><span>ou continue com</span></div>
            <button className="login-btn-google" onClick={handleGoogle} disabled={loading}>
              <GoogleIcon /> Continuar com Google
            </button>
          </>
        )}

        {/* PASSO 2B — CADASTRO */}
        {step === STEP.REGISTER && (
          <>
            <h1 className="login-title">Criar sua conta</h1>
            <p className="login-sub">E-mail novo por aqui! Vamos criar sua conta.</p>
            <form onSubmit={handleRegister} className="login-form">
              <label className="login-label">E-mail</label>
              <div className="login-input-frozen-wrap">
                <input className="login-input login-input-frozen" value={email} readOnly />
                <button type="button" className="login-trocar" onClick={() => { setStep(STEP.EMAIL); limparErro(); }}>
                  Trocar
                </button>
              </div>
              <label className="login-label">Nome completo</label>
              <input
                className="login-input"
                type="text"
                placeholder="Seu nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoFocus
              />
              <label className="login-label">Senha</label>
              <div className="login-input-pass-wrap">
                <input
                  className="login-input"
                  type={showPass ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" className="login-show-pass" onClick={() => setShowPass(!showPass)}>
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
              <label className="login-termos">
                <input
                  type="checkbox"
                  checked={termos}
                  onChange={(e) => setTermos(e.target.checked)}
                />
                Li e aceito os{" "}
                <a href="/termos" target="_blank" rel="noopener noreferrer">
                  Termos de Uso
                </a>
              </label>
              {erro && <p className="login-erro">{erro}</p>}
              <button className="login-btn-primary" type="submit" disabled={loading}>
                {loading ? "Criando conta..." : "Criar conta"}
              </button>
            </form>
            <div className="login-divider"><span>ou cadastre-se com</span></div>
            <button className="login-btn-google" onClick={handleGoogle} disabled={loading}>
              <GoogleIcon /> Continuar com Google
            </button>
          </>
        )}

        {/* RESET ENVIADO */}
        {step === STEP.RESET_SENT && (
          <>
            <h1 className="login-title">E-mail enviado</h1>
            <p className="login-sub">
              Enviamos um link para <strong>{email}</strong>. Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
            </p>
            <button className="login-btn-primary" onClick={() => { setStep(STEP.LOGIN); limparErro(); }}>
              Voltar para o login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: 8 }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
    </svg>
  );
}