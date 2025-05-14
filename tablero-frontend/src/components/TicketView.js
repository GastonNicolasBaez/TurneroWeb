import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './TicketView.css';

const TicketView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Función para cargar los detalles del ticket
    const fetchTicketDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/tickets/${id}`);
        if (response.data.success) {
          setTicket(response.data.ticket);
        } else {
          setError('No se pudo encontrar el ticket');
        }
      } catch (err) {
        console.error('Error al cargar detalles del ticket:', err);
        setError('Error al cargar los detalles del ticket');
      } finally {
        setLoading(false);
      }
    };

    fetchTicketDetails();
  }, [id]);

  const handleBack = () => {
    navigate(-1); // Volver a la página anterior
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'medium'
    }).format(date);
  };

  if (loading) {
    return <div className="ticket-view loading">Cargando detalles del ticket...</div>;
  }

  if (error) {
    return (
      <div className="ticket-view error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={handleBack} className="button secondary">Volver</button>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="ticket-view not-found">
        <h2>Ticket no encontrado</h2>
        <button onClick={handleBack} className="button secondary">Volver</button>
      </div>
    );
  }

  return (
    <div className="ticket-view">
      <div className="ticket-card">
        <div className={`ticket-status ${ticket.Estado.toLowerCase()}`}>
          {ticket.Estado}
        </div>
        
        <h2>Detalles del Ticket #{ticket.NumeroTicket}</h2>
        
        <div className="ticket-info">
          <div className="info-group">
            <label>Box Asignado:</label>
            <span>{ticket.BoxAsignado}</span>
          </div>
          
          <div className="info-group">
            <label>Fecha de Creación:</label>
            <span>{formatDate(ticket.FechaCreacion)}</span>
          </div>
          
          {ticket.FechaCompletado && (
            <div className="info-group">
              <label>Fecha de Completado:</label>
              <span>{formatDate(ticket.FechaCompletado)}</span>
            </div>
          )}
          
          <div className="info-group">
            <label>Estado:</label>
            <span className={ticket.Estado.toLowerCase()}>{ticket.Estado}</span>
          </div>
        </div>
        
        <div className="ticket-actions">
          <button onClick={handleBack} className="button secondary">Volver</button>
        </div>
      </div>
    </div>
  );
};

export default TicketView;
