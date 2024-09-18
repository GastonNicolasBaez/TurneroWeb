const express = require('express');
const router = express.Router();
const sql = require('mssql');
const config = require('./dbConfig'); // Importar la configuración

// Incrementar el ticket desde el frontend
router.post('/increment', async (req, res) => {
  const { numeroTicket, boxAsignado } = req.body;  // El ticket es enviado desde el frontend

  try {
    const pool = await sql.connect(config);
    // Insertamos el nuevo ticket en la base de datos
    await pool.request()
      .input('NumeroTicket', sql.Int, numeroTicket)
      .input('BoxAsignado', sql.Int, boxAsignado)
      .query('INSERT INTO Tickets (NumeroTicket, BoxAsignado) VALUES (@NumeroTicket, @BoxAsignado)');

    res.json({ success: true, nuevoNumeroTicket: numeroTicket });
  } catch (err) {
    console.error("Error en el servidor:", err);  // Ver el error detallado en la consola
    res.status(500).send("Error en el servidor");
  }
});

module.exports = router;
