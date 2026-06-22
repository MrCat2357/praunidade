import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./services/firebase/config";
import Login from "./pages/Login";

function RotaProtegida({ children, usuario, carregando }) {
  if (carregando) return <div className="loading">Carregando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

function Home({ usuario }) {
  const navigate = useNavigate();
  return (
    <div style={{ padding: 32, color: "#f1f5f9", fontFamily: "sans-serif" }}>
      <h1>Olá, {usuario?.displayName || "usuário"}!</h1>
      <p>PraUnidade — em construção.</p>
      <button
        onClick={() => auth.signOut().then(() => navigate("/login"))}
        style={{ marginTop: 16, padding: "10px 20px", cursor: "pointer" }}
      >
        Sair
      </button>
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
      <Route
        path="/"
        element={
          <RotaProtegida usuario={usuario} carregando={carregando}>
            <Home usuario={usuario} />
          </RotaProtegida>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}