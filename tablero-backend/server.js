const express = require('express');
const sql = require('mssql');
const cors = require('cors'); // Importar el middleware CORS
const config = require('./dbConfig'); // Importar la configuración

const app = express();
app.use(express.json());

// Configurar CORS
app.use(cors({
  origin: 'http://localhost:3000', // Permitir solicitudes desde el frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
  allowedHeaders: ['Content-Type'] // Encabezados permitidos
}));

// Ruta de login
app.post('/api/login', async (req, res) => {
  const { usuario } = req.body;  // Capturamos el usuario ingresado

  try {
    const pool = await sql.connect(config);
    
    console.log("Buscando usuario:", usuario);  // Log para verificar que el usuario llega correctamente
    
    const result = await pool.request()
      .input('Usuario', sql.VarChar, usuario)
      .query('SELECT NumeroBox FROM OperadorBox WHERE USUARIO = @Usuario');
    
    console.log("Resultado de la consulta:", result.recordset);  // Log para ver los resultados de la consulta

    if (result.recordset.length > 0) {
      res.json({
        success: true,
        userData: {
          usuario: usuario,
          numeroBox: result.recordset[0].NumeroBox,
        },
      });
    } else {
      console.log("Usuario no encontrado");
      res.json({ success: false, message: "Usuario no encontrado" });
    }
  } catch (err) {
    console.error("Error en el servidor:", err.message);  // Ver el error detallado en la consola
    res.status(500).send("Error en el servidor");
  }
});

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
