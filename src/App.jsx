import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./services/firebase/config";
import Login from "./pages/Login";
import Conexoes from "./pages/Conexoes";
import Termos from "./pages/Termos";
import "./pages/Home.css";

function RotaProtegida({ children, usuario, carregando }) {
  if (carregando) return <div className="loading">Carregando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;
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
          <button className="home-btn-primario" onClick={() => navigate("/conexoes")}>
            Conexões
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
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCarregando(false);
    });
    return () => unsub();
  }, []);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          carregando ? null : usuario ? <Navigate to="/" replace /> : <Login />
        }
      />
      <Route path="/termos" element={<Termos />} />
      <Route
        path="/"
        element={
          <RotaProtegida usuario={usuario} carregando={carregando}>
            <Home usuario={usuario} />
          </RotaProtegida>
        }
      />
      <Route
        path="/conexoes"
        element={
          <RotaProtegida usuario={usuario} carregando={carregando}>
            <Conexoes usuario={usuario} />
          </RotaProtegida>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}