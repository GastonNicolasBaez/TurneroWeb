const express = require('express');
const router = express.Router();
const sql = require('mssql');

// Ruta de login
router.post('/', async (req, res) => {
  const { usuario } = req.body;  // Capturamos el usuario ingresado

  try {
    const pool = await sql.connect();
    
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
    console.error("Error en el servidor:", err);  // Ver el error detallado en la consola
    res.status(500).send("Error en el servidor");
  }
});
