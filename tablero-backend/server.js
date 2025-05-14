const express = require('express');
const sql = require('mssql');
const cors = require('cors'); // Importar el middleware CORS
const config = require('./dbConfig'); // Importar la configuración

// Importar rutas
const loginRoutes = require('./routes/Login');
const ticketRoutes = require('./routes/Tickets');

const app = express();
app.use(express.json());

// Configurar CORS
app.use(cors({
  origin: 'http://localhost:3000', // Permitir solicitudes desde el frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization'] // Encabezados permitidos
}));

// Conexión a la base de datos
sql.connect(config)
  .then(() => console.log('Conexión a la base de datos establecida'))
  .catch(err => console.error('Error al conectar a la base de datos:', err));

// Usar rutas
app.use('/api/login', loginRoutes);
app.use('/api/tickets', ticketRoutes);

// Ruta base para verificar que el servidor está funcionando
app.get('/', (req, res) => {
  res.send('API del Tablero de Turnos funcionando correctamente');
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error('Error en el servidor:', err);
  res.status(500).json({
    success: false,
    message: 'Error en el servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : null
  });
});

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
