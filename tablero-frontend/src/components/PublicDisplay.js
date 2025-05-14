import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './PublicDisplay.css';

const PublicDisplay = () => {
  // Estado para el ticket a mostrar
  const [displayTicket, setDisplayTicket] = useState(null);
  // Estado para el próximo número a ser atendido
  const [nextTicketNumber, setNextTicketNumber] = useState(null);
  
  // Estado general
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Función para obtener el próximo número de ticket
  const fetchNextTicketNumber = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/tickets/last');
      if (response.data.success) {
        setNextTicketNumber(response.data.nextTicket);
        
        // Crear un ticket "virtual" para mostrar el próximo número
        setDisplayTicket({
          NumeroTicket: response.data.nextTicket,
          BoxAsignado: 1, // Valor predeterminado o podrías usar otro valor basado en la lógica de tu aplicación
        });
        
        setLastUpdate(new Date());
      } else {
        setError('No se pudo cargar el próximo número de ticket');
      }
    } catch (err) {
      console.error('Error al cargar el próximo número de ticket:', err);
      setError('Error al cargar el próximo número de ticket');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al iniciar y configurar actualización
  useEffect(() => {
    // Carga inicial
    fetchNextTicketNumber();
    
    // Actualización periódica
    const interval = setInterval(() => {
      fetchNextTicketNumber();
    }, 3000);
    
    // Asegurar que el fondo ocupe toda la pantalla
    document.body.classList.add('public-display-page');
    
    // Función para actualizar la altura de la ventana (importante para móviles)
    const updateHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Establecer altura inicial y actualizar en resize
    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    return () => {
      clearInterval(interval);
      document.body.classList.remove('public-display-page');
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  // Formato de fecha actual
  const formatCurrentDate = () => {
    const options = { 
      weekday: 'long', 
      day: 'numeric',
      month: 'long'
    };
    return new Date().toLocaleDateString('es-ES', options);
  };

  // Formato de última actualización
  const formatLastUpdate = () => {
    if (!lastUpdate) return '';
    
    return lastUpdate.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Pantalla de carga
  if (loading && !displayTicket) {
    return (
      <div className="public-display public-display-page loading">
        <div className="loading-spinner"></div>
        Cargando información...
      </div>
    );
  }

  return (
    <div className="public-display public-display-page">
      <header className="public-header">
        <div className="hospital-logo">
          <span className="icon">🏥</span>
          <h1>Hospital Naval Puerto Belgrano</h1>
        </div>
        <div className="update-info">
          <div className="current-date">{formatCurrentDate()}</div>
          <p className="update-time">Actualizado: {formatLastUpdate()}</p>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}
      
      <div className="tickets-display">
        <div className="tickets-container">
          <div className="display-header">
            <span className="icon">🎫</span>
            Gestión de Turnos
          </div>
          
          {!displayTicket ? (
            <div className="no-tickets">
              <span className="icon">⏳</span>
              <div className="no-tickets-message">No hay turnos disponibles en este momento</div>
            </div>
          ) : (
            <div className="display-content">
              <div className="current-number-panel">
                <div className="panel-decoration decoration-top-right"></div>
                <div className="current-label">Número</div>
                <div className="current-numero">{displayTicket.NumeroTicket}</div>
                <div className="panel-decoration decoration-bottom-left"></div>
              </div>
              <div className="current-box-panel">
                <div className="box-label">Box</div>
                <div className="current-box">{displayTicket.BoxAsignado}</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <footer className="public-footer">
        <div className="instruction">
          <span className="icon">📢</span>
          Por favor, preste atención a su número de turno
        </div>
      </footer>
    </div>
  );
};

export default PublicDisplay; 