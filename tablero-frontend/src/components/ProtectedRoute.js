import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ userData, children }) => {
  if (!userData) {
    // Si no hay datos de usuario, redirigir al login
    return <Navigate to="/" replace />;
  }

  // Si hay datos de usuario, mostrar el componente protegido
  return children;
};

export default ProtectedRoute; 