const express = require('express');
const router = express.Router();
const sql = require('mssql');
const config = require('../dbConfig');

// Ruta de login
router.post('/', async (req, res) => {
  const { usuario } = req.body;  // Capturamos el usuario ingresado

  try {
    const pool = await sql.connect(config);
    
    console.log("Buscando usuario:", usuario);  // Log para verificar que el usuario llega correctamente
    
    const result = await pool.request()
      .input('Usuario', sql.VarChar, usuario)
      .query('SELECT NumeroBox, nombreApellido FROM OperadorBox WHERE USUARIO = @Usuario');
    
    console.log("Resultado de la consulta:", result.recordset);  // Log para ver los resultados de la consulta

    if (result.recordset.length > 0) {
      res.json({
        success: true,
        userData: {
          usuario: usuario,
          numeroBox: result.recordset[0].NumeroBox,
          nombreApellido: result.recordset[0].nombreApellido || usuario // Si no hay nombreApellido, usar el usuario como fallback
        },
      });
    } else {
      console.log("Usuario no encontrado");
      res.json({ success: false, message: "Usuario no encontrado" });
    }
  } catch (err) {
    console.error("Error en el servidor:", err);  // Ver el error detallado en la consola
    res.status(500).json({ success: false, message: "Error en el servidor" });
  }
});

module.exports = router;
