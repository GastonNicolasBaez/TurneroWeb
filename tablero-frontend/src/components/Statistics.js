import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Statistics.css';

const Statistics = () => {
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDailyStats, setShowDailyStats] = useState(false);
  const navigate = useNavigate();

  // Función para cargar estadísticas con el filtro apropiado
  const loadStatistics = async (onlyToday = false) => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/tickets/estadisticas${onlyToday ? '?soloHoy=true' : ''}`);
      if (response.data.success) {
        // Asegurarse de que todos los valores numéricos sean válidos
        const processedStats = response.data.estadisticas.map(stat => ({
          ...stat,
          TicketsCompletados: (stat.TicketsAtendidos || 0) + (stat.TicketsAusentes || 0) + (stat.TicketsFinalizados || 0),
          TicketsActivos: stat.TicketsActivos || 0,
          TicketsAusentes: stat.TicketsAusentes || 0,
          TotalTickets: stat.TotalTickets || 0
        }));
        setStatistics(processedStats);
      } else {
        setError('No se pudieron cargar las estadísticas');
      }
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
      setError('Error al cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  // Cargar las estadísticas históricas al montar el componente
  useEffect(() => {
    loadStatistics(showDailyStats);
  }, [showDailyStats]);

  const handleBack = () => {
    navigate('/dashboard');
  };

  // Cambiar entre estadísticas diarias e históricas
  const toggleStatsView = () => {
    setShowDailyStats(!showDailyStats);
  };

  const calculateEfficiency = (atendidos, ausentes) => {
    // Si no hay datos, devolver 0
    if (!atendidos && !ausentes) return 0;
    
    const atendidosValue = atendidos || 0;
    const ausentesValue = ausentes || 0;
    const total = atendidosValue + ausentesValue;
    
    // Si no hay atendidos ni ausentes, devolver 0
    if (total === 0) return 0;
    
    // Calcular el porcentaje de atendidos sobre el total (atendidos + ausentes)
    const efficiency = Math.round((atendidosValue / total) * 100);
    
    // Asegurarse de que el resultado sea un número válido
    return isNaN(efficiency) ? 0 : efficiency;
  };

  // Calcular totales de manera segura
  const calculateTotals = () => {
    // Si no hay estadísticas, devolver valores predeterminados
    if (!statistics || statistics.length === 0) {
      return {
        totalBoxes: 0,
        totalTickets: 0,
        totalCompleted: 0,
        totalActivos: 0,
        totalAusentes: 0,
        totalAtendidos: 0,
        globalEfficiency: 0
      };
    }
    
    const totalBoxes = statistics.length;
    const totalTickets = statistics.reduce((acc, stat) => acc + (stat.TotalTickets || 0), 0);
    const totalAtendidos = statistics.reduce((acc, stat) => acc + (stat.TicketsAtendidos || 0), 0);
    const totalAusentes = statistics.reduce((acc, stat) => acc + (stat.TicketsAusentes || 0), 0);
    const totalActivos = statistics.reduce((acc, stat) => acc + (stat.TicketsActivos || 0), 0);
    const totalCompleted = statistics.reduce((acc, stat) => acc + (stat.TicketsCompletados || 0), 0);
    
    // Calcular eficiencia global
    const globalEfficiency = calculateEfficiency(totalAtendidos, totalAusentes);
    
    return {
      totalBoxes,
      totalTickets,
      totalCompleted,
      totalActivos,
      totalAusentes,
      totalAtendidos,
      globalEfficiency
    };
  };

  if (loading) {
    return <div className="statistics loading">Cargando estadísticas...</div>;
  }

  if (error) {
    return (
      <div className="statistics error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={handleBack} className="button secondary">Volver</button>
      </div>
    );
  }

  const totals = calculateTotals();
  const hasData = statistics && statistics.length > 0;

  return (
    <div className="statistics">
      <div className="statistics-header">
        <h2>Estadísticas de Atención</h2>
        <div className="stats-filter">
          <span className="filter-label">
            {showDailyStats ? 'Mostrando: Día Actual' : 'Mostrando: Datos Históricos'}
          </span>
          <button 
            onClick={toggleStatsView} 
            className={`button filter-button ${showDailyStats ? 'primary' : 'secondary'}`}
          >
            {showDailyStats ? 'Ver Histórico' : 'Ver Solo Hoy'}
          </button>
        </div>
      </div>
      
      {/* Siempre mostrar resumen, pero con valores en cero si no hay datos */}
      <div className="stats-container">
        <div className="stats-summary">
          <div className="stat-card">
            <h3>Total de Boxes</h3>
            <div className="stat-value">{totals.totalBoxes}</div>
          </div>
          <div className="stat-card">
            <h3>Total de Tickets</h3>
            <div className="stat-value">{totals.totalTickets}</div>
          </div>
          <div className="stat-card">
            <h3>Tickets Atendidos</h3>
            <div className="stat-value">{totals.totalAtendidos}</div>
          </div>
          <div className="stat-card">
            <h3>Tickets Activos</h3>
            <div className="stat-value">{totals.totalActivos}</div>
          </div>
          <div className="stat-card absent-card">
            <h3>Tickets Ausentes</h3>
            <div className="stat-value">{totals.totalAusentes}</div>
          </div>
          <div className="stat-card efficiency-card">
            <h3>Eficiencia Global</h3>
            <div className="stat-value">{totals.globalEfficiency}%</div>
          </div>
        </div>

        <h3>Desglose por Box</h3>
        
        {!hasData ? (
          <div className="no-data">
            {showDailyStats 
              ? 'No hay datos estadísticos para el día de hoy. Puede deberse a que se ha finalizado el día o no se han registrado tickets.'
              : 'No hay datos estadísticos disponibles en el sistema.'}
          </div>
        ) : (
          <table className="stats-table">
            <thead>
              <tr>
                <th>Box</th>
                <th>Total Tickets</th>
                <th>Atendidos</th>
                <th>Activos</th>
                <th>Ausentes</th>
                <th>Eficiencia</th>
              </tr>
            </thead>
            <tbody>
              {statistics.map((stat) => (
                <tr key={stat.BoxAsignado}>
                  <td>{stat.BoxAsignado}</td>
                  <td>{stat.TotalTickets || 0}</td>
                  <td>{stat.TicketsAtendidos || 0}</td>
                  <td>{stat.TicketsActivos || 0}</td>
                  <td>{stat.TicketsAusentes || 0}</td>
                  <td>
                    <div className="progress-bar">
                      <div 
                        className="progress" 
                        style={{ width: `${calculateEfficiency(stat.TicketsAtendidos, stat.TicketsAusentes)}%` }}
                      ></div>
                      <span>{calculateEfficiency(stat.TicketsAtendidos, stat.TicketsAusentes)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <div className="statistics-actions">
        <button onClick={handleBack} className="button secondary">Volver al Dashboard</button>
      </div>
    </div>
  );
};

export default Statistics; 