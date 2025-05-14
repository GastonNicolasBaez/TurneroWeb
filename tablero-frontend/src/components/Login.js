import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const Login = ({ setUserData }) => {
  const [usuario, setUsuario] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Validación básica
    if (!usuario.trim()) {
      setError("Por favor ingrese su código de usuario");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const response = await axios.post("http://localhost:5000/api/login", {
        usuario,
      });

      if (response.data.success) {
        // Guardar datos del operador y box
        setUserData(response.data.userData);
        navigate("/dashboard");  // Navegar a la pantalla principal
      } else {
        setError(response.data.message || "Usuario no encontrado");
      }
    } catch (err) {
      console.error("Error de conexión:", err);
      setError("Error de conexión con el servidor. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Tablero de Turnos</h1>
          <h2>Acceso al Sistema</h2>
        </div>
        
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="usuario">Código de Usuario</label>
            <input
              type="text"
              id="usuario"
              placeholder="Ingrese su código"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? "Procesando..." : "Ingresar"}
          </button>
        </form>
        
        <div className="login-footer">
          <p>Sistema de Gestión de Turnos v1.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
