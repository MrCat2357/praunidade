import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./services/firebase/config";
import Login from "./pages/Login";
import Conexoes from "./pages/Conexoes";
import Perfil from "./pages/Perfil";
import Termos from "./pages/Termos";
import NovaLicenca from "./pages/NovaLicenca";
import ListaLicencas from "./pages/ListaLicencas";
import Timeline from "./pages/Timeline";
import "./pages/Home.css";
import Funcionarios from "./pages/Funcionarios";

// Além de estar autenticado no Firebase Auth, o usuário só tem acesso
// liberado às rotas internas se o cadastro estiver de fato concluído
// (documento usuarios/{uid} no Firestore). Isso evita que uma conta
// Google recém-criada — autenticada no popup, mas que ainda não aceitou
// os Termos de Uso — seja redirecionada para dentro da plataforma.
function RotaProtegida({ children, usuario, perfilCompleto, carregando }) {
  if (carregando) return <div className="loading">Carregando...</div>;
  if (!usuario || !perfilCompleto) return <Navigate to="/login" replace />;
  return children;
}

function Home({ usuario }) {
  const navigate = useNavigate();
  return (
    <div className="home-bg">
      <div className="home-card">
        <h1 className="home-saudacao">Olá, {usuario?.displayName || "usuário"}!</h1>
        <p className="home-sub">PraUnidade — em construção.</p>
        <div className="home-acoes">
          <button className="home-btn-primario" onClick={() => navigate("/timeline")}>
            Acompanhamento INSS
          </button>
          <button className="home-btn-primario" onClick={() => navigate("/licencas")}>
            Licenças
          </button>
          <button className="home-btn-primario" onClick={() => navigate("/funcionarios")}>
            Funcionários
          </button>
          <button className="home-btn-primario" onClick={() => navigate("/conexoes")}>
            Conexões
          </button>
          <button className="home-btn-primario" onClick={() => navigate("/perfil")}>
            Meu perfil
          </button>
          <button
            className="home-btn-secundario"
            onClick={() => auth.signOut().then(() => navigate("/login"))}
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [perfilCompleto, setPerfilCompleto] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUsuario(null);
        setPerfilCompleto(false);
        setCarregando(false);
        return;
      }

      setUsuario(user);

      // Cobre os casos de F5 / nova aba: se já existe documento em
      // usuarios/{uid}, o cadastro foi concluído em algum momento e o
      // acesso pode ser liberado. Se não existe (ex: popup do Google
      // autenticou mas a pessoa fechou a aba antes de aceitar os
      // termos), o acesso continua bloqueado.
      try {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        setPerfilCompleto(snap.exists());
      } catch {
        setPerfilCompleto(false);
      } finally {
        setCarregando(false);
      }
    });
    return () => unsub();
  }, []);

  // Chamado pelo Login.jsx assim que um fluxo termina com sucesso
  // (login normal, cadastro normal, Google já existente ou aceite dos
  // termos do Google). Evita depender só da checagem assíncrona do
  // Firestore acima, que teria corrida com o navigate("/") do Login.
  function handleAuthComplete() {
    setPerfilCompleto(true);
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          carregando ? null : usuario && perfilCompleto ? (
            <Navigate to="/" replace />
          ) : (
            <Login onAuthComplete={handleAuthComplete} />
          )
        }
      />
      <Route path="/termos" element={<Termos />} />
      <Route
        path="/"
        element={
          <RotaProtegida usuario={usuario} perfilCompleto={perfilCompleto} carregando={carregando}>
            <Home usuario={usuario} />
          </RotaProtegida>
        }
      />
      <Route
        path="/conexoes"
        element={
          <RotaProtegida usuario={usuario} perfilCompleto={perfilCompleto} carregando={carregando}>
            <Conexoes usuario={usuario} />
          </RotaProtegida>
        }
      />
      <Route
        path="/perfil"
        element={
          <RotaProtegida usuario={usuario} perfilCompleto={perfilCompleto} carregando={carregando}>
            <Perfil usuario={usuario} />
          </RotaProtegida>
        }
      />
      <Route
        path="/nova-licenca"
        element={
          <RotaProtegida usuario={usuario} perfilCompleto={perfilCompleto} carregando={carregando}>
            <NovaLicenca usuario={usuario} />
          </RotaProtegida>
        }
      />
      <Route
        path="/licencas"
        element={
          <RotaProtegida usuario={usuario} perfilCompleto={perfilCompleto} carregando={carregando}>
            <ListaLicencas usuario={usuario} />
          </RotaProtegida>
        }
      />
      <Route
        path="/timeline"
        element={
          <RotaProtegida usuario={usuario} perfilCompleto={perfilCompleto} carregando={carregando}>
            <Timeline usuario={usuario} />
          </RotaProtegida>
        }
      />
      <Route
        path="/funcionarios"
        element={
          <RotaProtegida usuario={usuario} perfilCompleto={perfilCompleto} carregando={carregando}>
            <Funcionarios usuario={usuario} />
          </RotaProtegida>
        }
      />
      <Route
        path="/licenca/:id/editar"
        element={
          <RotaProtegida usuario={usuario} perfilCompleto={perfilCompleto} carregando={carregando}>
            <NovaLicenca usuario={usuario} />
          </RotaProtegida>
        }
      />

      {/* ─── Rotas de visita a uma conexão (modo somente leitura) ─── */}
      <Route
        path="/conexao/:uid"
        element={
          <RotaProtegida usuario={usuario} perfilCompleto={perfilCompleto} carregando={carregando}>
            <Perfil usuario={usuario} />
          </RotaProtegida>
        }
      />
      <Route
        path="/conexao/:uid/conexoes"
        element={
          <RotaProtegida usuario={usuario} perfilCompleto={perfilCompleto} carregando={carregando}>
            <Conexoes usuario={usuario} />
          </RotaProtegida>
        }
      />
      <Route
        path="/conexao/:uid/funcionarios"
        element={
          <RotaProtegida usuario={usuario} perfilCompleto={perfilCompleto} carregando={carregando}>
            <Funcionarios usuario={usuario} />
          </RotaProtegida>
        }
      />
      <Route
        path="/conexao/:uid/licencas"
        element={
          <RotaProtegida usuario={usuario} perfilCompleto={perfilCompleto} carregando={carregando}>
            <ListaLicencas usuario={usuario} />
          </RotaProtegida>
        }
      />
      <Route
        path="/conexao/:uid/inss"
        element={
          <RotaProtegida usuario={usuario} perfilCompleto={perfilCompleto} carregando={carregando}>
            <Timeline usuario={usuario} />
          </RotaProtegida>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}