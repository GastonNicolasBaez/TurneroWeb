import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const Dashboard = ({ userData }) => {
  const [numeroTicket, setNumeroTicket] = useState(1);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [nextTicketConfig, setNextTicketConfig] = useState("");
  const [configMessage, setConfigMessage] = useState("");
  const [finalizandoDia, setFinalizandoDia] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  const navigate = useNavigate();

  // Cargar tickets al iniciar
  useEffect(() => {
    fetchTickets();
  }, [userData]);

  // Función para obtener tickets del operador y el próximo número global
  const fetchTickets = async () => {
    if (!userData || !userData.numeroBox) return;
    
    setLoading(true);
    try {
      console.log("Obteniendo tickets para box:", userData.numeroBox);
      
      // Obtener tickets del box actual (solo los no finalizados)
      const response = await axios.get(`http://localhost:5000/api/tickets/box/${userData.numeroBox}`);
      
      if (response.data.success) {
        console.log(`Recibidos ${response.data.tickets.length} tickets para mostrar`);
        setTickets(response.data.tickets);
      } else {
        console.error("Error en respuesta del servidor:", response.data);
        setError("Error al cargar tickets: " + (response.data.message || "Error desconocido"));
      }
      
      // Obtener el último número de ticket global para calcular el siguiente
      const globalTicketsResponse = await axios.get('http://localhost:5000/api/tickets/last');
      
      if (globalTicketsResponse.data.success) {
        console.log("Información del próximo ticket:", globalTicketsResponse.data);
        // Actualizar el número mostrado
        setNumeroTicket(globalTicketsResponse.data.nextTicket);
      } else {
        console.error("Error al obtener información del próximo ticket:", globalTicketsResponse.data);
      }
    } catch (err) {
      console.error("Error al cargar tickets:", err);
      setError("Error de conexión al cargar tickets");
    } finally {
      setLoading(false);
    }
  };

  // Función para incrementar el ticket
  const incrementarTicket = async () => {
    setLoading(true);
    try {
      const response = await axios.post("http://localhost:5000/api/tickets/increment", {
        boxAsignado: userData.numeroBox,
      });

      if (response.data.success) {
        console.log("Respuesta de incrementar ticket:", response.data);
        
        // Actualizar el número de ticket al próximo número que sigue en la secuencia
        setNumeroTicket(response.data.proximoNumeroTicket || response.data.nuevoNumeroTicket + 1);
        
        // Recargar la lista de tickets
        fetchTickets();
      } else {
        setError(response.data.message || "Error al incrementar ticket");
      }
    } catch (error) {
      console.error("Error al incrementar el ticket:", error);
      setError(error.response?.data?.message || "Error al incrementar el ticket");
    } finally {
      setLoading(false);
    }
  };

  // Función para marcar un ticket como atendido
  const marcarComoAtendido = async (ticketId) => {
    setLoading(true);
    setError("");
    
    try {
      console.log(`Enviando solicitud para marcar ticket ${ticketId} como atendido`);
      
      // Llamada directa con parámetros simplificados
      const url = `http://localhost:5000/api/tickets/${ticketId}/atendido`;
      console.log("URL:", url);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log("Respuesta:", data);
      
      if (data.success) {
        // Actualizar la lista de tickets
        await fetchTickets();
      } else {
        setError(data.message || "Error al marcar el ticket como atendido");
      }
    } catch (error) {
      console.error("Error completo:", error);
      setError("Error de conexión al marcar el ticket como atendido");
    } finally {
      setLoading(false);
    }
  };

  // Función para marcar un ticket como ausente
  const marcarComoAusente = async (ticketId) => {
    setLoading(true);
    setError("");
    
    try {
      console.log(`Enviando solicitud para marcar ticket ${ticketId} como ausente`);
      
      // Llamada directa con parámetros simplificados
      const url = `http://localhost:5000/api/tickets/${ticketId}/ausente`;
      console.log("URL:", url);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log("Respuesta:", data);
      
      if (data.success) {
        // Actualizar la lista de tickets
        await fetchTickets();
      } else {
        setError(data.message || "Error al marcar el ticket como ausente");
      }
    } catch (error) {
      console.error("Error completo:", error);
      setError("Error de conexión al marcar el ticket como ausente");
    } finally {
      setLoading(false);
    }
  };

  // Función para finalizar el día
  const finalizarDia = async () => {
    if (!userData || !userData.numeroBox) {
      setError("Error: No se pudo identificar el número de box");
      return;
    }
    
    // Asegurarse de que el boxId sea un número
    const boxIdToSend = parseInt(userData.numeroBox);
    if (isNaN(boxIdToSend)) {
      setError("Error: El número de box no es válido");
      return;
    }
    
    console.log(`Intentando finalizar el día para box ${boxIdToSend}, tipo: ${typeof boxIdToSend}`);
    
    if (!window.confirm(`¿Estás seguro de que deseas finalizar el día para el box ${boxIdToSend}? Todos los tickets activos de este box se marcarán como finalizados y ya no se mostrarán en esta vista.`)) {
      return;
    }
    
    setFinalizandoDia(true);
    setError("");
    
    try {
      console.log(`[DEPURACIÓN] Iniciando solicitud para finalizar el día para box ${boxIdToSend}.`);
      console.log(`[DEPURACIÓN] Cuerpo de la solicitud: ${JSON.stringify({boxId: boxIdToSend})}`);
      
      const response = await fetch("http://localhost:5000/api/tickets/finalizar-dia", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          boxId: boxIdToSend
        })
      });
      
      if (!response.ok) {
        console.log(`[DEPURACIÓN] Respuesta de error HTTP: ${response.status}`);
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`[DEPURACIÓN] Respuesta del servidor:`, data);
      
      if (data.success) {
        // 1. Vaciar completamente la lista de tickets
        setTickets([]);
        
        // 2. Mostrar mensaje de éxito incluyendo cuántos tickets se finalizaron
        setMensajeExito(`Día finalizado correctamente para box ${boxIdToSend}. ${data.ticketsFinalizados || 0} tickets han sido finalizados.`);
        
        // 3. Obtener el número de ticket para el nuevo día
        try {
          const configResponse = await fetch('http://localhost:5000/api/tickets/last');
          const configData = await configResponse.json();
          console.log("[DEPURACIÓN] Nueva información de ticket:", configData);
          
          if (configData.success) {
            setNumeroTicket(configData.nextTicket);
          }
        } catch (configError) {
          console.error("[DEPURACIÓN] Error al obtener configuración después de finalizar día:", configError);
        }
        
        // 4. Mostrar el mensaje por un tiempo y luego ocultarlo
        setTimeout(() => {
          setMensajeExito("");
        }, 4000);
      } else {
        console.log(`[DEPURACIÓN] Error en la respuesta: ${data.message}`);
        setError(data.message || "Error al finalizar el día");
      }
    } catch (error) {
      console.error("[DEPURACIÓN] Error al finalizar el día:", error);
      setError(`Error al finalizar el día: ${error.message}`);
    } finally {
      setFinalizandoDia(false);
    }
  };

  // Función para actualizar la configuración del número inicial
  const actualizarConfiguracion = async (e) => {
    e.preventDefault();
    setLoading(true);
    setConfigMessage("");
    
    const numValue = parseInt(nextTicketConfig);
    // Validación
    if (isNaN(numValue) || numValue < 1 || numValue > 999) {
      setConfigMessage("El número debe ser entre 1 y 999");
      setLoading(false);
      return;
    }
    
    console.log("Enviando configuración:", numValue);
    
    try {
      // 1. Enviar la configuración al servidor
      const response = await fetch("http://localhost:5000/api/tickets/config", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nextNumber: numValue
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Respuesta del servidor para config:", data);
      
      if (data.success) {
        // 2. Mostrar mensaje de éxito
        setConfigMessage("Configuración actualizada correctamente. La secuencia continuará desde este número.");
        
        // 3. Actualizar el número de ticket mostrado inmediatamente
        setNumeroTicket(numValue);
        
        // 4. Cerrar el formulario después de un momento
        setTimeout(() => {
          setShowConfig(false);
          setConfigMessage("");
        }, 3000);
      } else {
        setConfigMessage(data.message || "Error al actualizar configuración");
      }
    } catch (error) {
      console.error("Error al configurar:", error);
      setConfigMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Función para abrir la pantalla pública
  const abrirPantallaPublica = () => {
    window.open("/public-display", "_blank");
  };

  // Función para ir a estadísticas
  const irAEstadisticas = () => {
    navigate("/statistics");
  };

  // Función para volver al login
  const volverAlLogin = () => {
    navigate("/");
  };

  // Mostrar u ocultar configuración
  const toggleConfig = async () => {
    const newShowConfig = !showConfig;
    setShowConfig(newShowConfig);
    
    // Si abrimos la configuración, obtenemos el valor actual
    if (newShowConfig) {
      try {
        console.log("Obteniendo configuración actual...");
        const response = await fetch("http://localhost:5000/api/tickets/config");
        const data = await response.json();
        
        console.log("Configuración recibida:", data);
        
        if (data.success) {
          setNextTicketConfig(data.nextTicketNumber.toString());
        } else {
          setConfigMessage("Error al obtener la configuración: " + (data.message || ""));
        }
      } catch (error) {
        console.error("Error al obtener configuración:", error);
        setConfigMessage("Error de conexión al obtener la configuración");
      }
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2>Bienvenido, {userData?.nombreApellido || userData?.usuario}</h2>
        <p>Box Asignado: {userData?.numeroBox}</p>
      </header>
      
      <main className="dashboard-content">
        <section className="ticket-control">
          <h3>Control de Tickets</h3>
          <p>Número de Ticket Actual: {numeroTicket}</p>
          
          <div className="button-group">
            <button 
              onClick={incrementarTicket} 
              disabled={loading || numeroTicket > 999}
              className="button primary"
            >
              {loading ? "Procesando..." : "Incrementar Ticket"}
            </button>
            
            <button
              onClick={toggleConfig}
              className="button config"
            >
              {showConfig ? "Ocultar Configuración" : "Configurar Secuencia"}
            </button>

            <button
              onClick={finalizarDia}
              disabled={finalizandoDia}
              className="button finalizar"
            >
              {finalizandoDia ? "Procesando..." : "Finalizar Día"}
            </button>
          </div>
          
          {showConfig && (
            <div className="config-form">
              <h4>Configurar número inicial de la secuencia</h4>
              <form onSubmit={actualizarConfiguracion}>
                <input 
                  type="number" 
                  value={nextTicketConfig} 
                  onChange={(e) => setNextTicketConfig(e.target.value)}
                  min="1"
                  max="999"
                  required
                />
                <button 
                  type="submit"
                  className="button primary"
                  disabled={loading}
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </form>
              {configMessage && <p className="config-message">{configMessage}</p>}
            </div>
          )}
          
          {mensajeExito && <p className="success-message">{mensajeExito}</p>}
          {numeroTicket > 999 && <p className="error-message">Se ha alcanzado el límite máximo de tickets (999)</p>}
        </section>

        <section className="ticket-list">
          <h3>Mis Tickets Recientes</h3>
          {error && <p className="error-message">{error}</p>}
          {tickets.length === 0 ? (
            <p>No hay tickets para mostrar</p>
          ) : (
            <ul>
              {tickets.map(ticket => (
                <li key={ticket.ID} className={`ticket-item ${ticket.Estado !== 'Activo' ? ticket.Estado.toLowerCase() : 'active'}`}>
                  <div className="ticket-info">
                    <span className="ticket-number">Ticket #{ticket.NumeroTicket}</span>
                    <span className="ticket-estado">Estado: {ticket.Estado}</span>
                  </div>
                  <div className="ticket-actions">
                    {ticket.Estado === 'Activo' && (
                      <>
                        <button 
                          onClick={() => marcarComoAtendido(ticket.ID)}
                          className="button small success"
                        >
                          Atendido
                        </button>
                        <button 
                          onClick={() => marcarComoAusente(ticket.ID)}
                          className="button small danger"
                        >
                          Ausente
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="dashboard-footer">
        <button onClick={abrirPantallaPublica} className="button secondary">Ver Pantalla Pública</button>
        <button onClick={irAEstadisticas} className="button secondary">Ver Estadísticas</button>
        <button onClick={volverAlLogin} className="button secondary">Volver al Login</button>
      </footer>
    </div>
  );
};

export default Dashboard;
