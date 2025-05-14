const express = require('express');
const router = express.Router();
const sql = require('mssql');
const config = require('../dbConfig');

// Variables globales de configuración
let nextTicketNumber = null; // Valor predeterminado es null para indicar que no hay configuración manual
let diaActual = new Date().toISOString().split('T')[0]; // Fecha actual en formato YYYY-MM-DD

// Obtener todos los tickets
router.get('/', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .query('SELECT * FROM Tickets ORDER BY FechaCreacion DESC');
    
    res.json({ success: true, tickets: result.recordset });
  } catch (err) {
    console.error("Error al obtener tickets:", err);
    res.status(500).json({ success: false, message: "Error al obtener tickets" });
  }
});

// Obtener la configuración actual
router.get('/config', async (req, res) => {
  try {
    // Obtener el último ticket para referencia
    const pool = await sql.connect(config);
    const result = await pool.request()
      .query('SELECT ISNULL(MAX(NumeroTicket), 0) as LastTicket FROM Tickets');
    
    const lastTicket = result.recordset[0].LastTicket || 0;
    
    res.json({ 
      success: true, 
      nextTicketNumber: nextTicketNumber || (lastTicket + 1),
      hasCustomConfig: nextTicketNumber !== null,
      lastTicket: lastTicket,
      diaActual: diaActual
    });
  } catch (err) {
    console.error("Error al obtener configuración:", err);
    res.status(500).json({ success: false, message: "Error al obtener configuración" });
  }
});

// Actualizar la configuración del número inicial
router.post('/config', async (req, res) => {
  const { nextNumber } = req.body;
  
  console.log("Recibido nextNumber:", nextNumber, "tipo:", typeof nextNumber);
  
  // Validación más estricta
  if (nextNumber === undefined || nextNumber === null) {
    console.error("nextNumber es undefined o null");
    return res.status(400).json({ 
      success: false, 
      message: "Número no especificado" 
    });
  }
  
  const parsedNumber = parseInt(nextNumber);
  if (isNaN(parsedNumber)) {
    console.error("nextNumber no es un número válido:", nextNumber);
    return res.status(400).json({ 
      success: false, 
      message: "El valor debe ser un número válido" 
    });
  }
  
  if (parsedNumber < 1 || parsedNumber > 999) {
    console.error("nextNumber fuera de rango:", parsedNumber);
    return res.status(400).json({ 
      success: false, 
      message: "El número debe estar entre 1 y 999" 
    });
  }
  
  try {
    // IMPORTANTE: Actualizar la variable global con el número exacto
    nextTicketNumber = parsedNumber;
    
    console.log("CONFIGURACIÓN: Número actualizado a:", nextTicketNumber);
    
    res.json({ 
      success: true, 
      message: "Configuración actualizada", 
      nextTicketNumber 
    });
  } catch (err) {
    console.error("Error al actualizar configuración:", err);
    res.status(500).json({ success: false, message: "Error al actualizar configuración" });
  }
});

// Finalizar día - marcar todos los tickets activos como "Finalizado"
router.post('/finalizar-dia', async (req, res) => {
  try {
    // Log detallado del cuerpo de la solicitud
    console.log("FINALIZAR DÍA - REQUEST BODY:", JSON.stringify(req.body));
    
    // Extraer y convertir explícitamente a número
    const boxId = req.body.boxId ? parseInt(req.body.boxId) : null;
    console.log("FINALIZAR DÍA - boxId extraído y convertido:", boxId, "tipo:", typeof boxId);
    
    // Validar que haya un boxId válido
    if (!boxId || isNaN(boxId)) {
      console.log("FINALIZAR DÍA - ERROR: No se proporcionó boxId válido");
      return res.status(400).json({ 
        success: false, 
        message: "Se requiere especificar un número de box válido" 
      });
    }
    
    const pool = await sql.connect(config);
    
    // Primero verificamos cuántos tickets serán afectados SOLO para el box especificado
    const countResult = await pool.request()
      .input('BoxAsignado', sql.Int, boxId)
      .query("SELECT COUNT(*) as Count FROM Tickets WHERE Estado != 'Finalizado' AND BoxAsignado = @BoxAsignado");
    
    const ticketsCount = countResult.recordset[0].Count;
    console.log(`FINALIZAR DÍA - Para box ${boxId}: ${ticketsCount} tickets encontrados`);
    
    if (ticketsCount === 0) {
      console.log(`FINALIZAR DÍA - No hay tickets para finalizar en box ${boxId}`);
      return res.json({
        success: true,
        message: `No hay tickets para finalizar en el box ${boxId}.`,
        ticketsFinalizados: 0
      });
    }
    
    // Modificamos la actualización para preservar el estado original
    try {
      // Primero, verificar si existe la columna EstadoOriginal
      const columnCheck = await pool.request().query(`
        SELECT COUNT(*) as Count FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Tickets' AND COLUMN_NAME = 'EstadoOriginal'
      `);
      
      const columnExists = columnCheck.recordset[0].Count > 0;
      console.log(`FINALIZAR DÍA - Columna EstadoOriginal existe: ${columnExists}`);
      
      // Si la columna no existe, crearla
      if (!columnExists) {
        await pool.request().query(`ALTER TABLE Tickets ADD EstadoOriginal NVARCHAR(50)`);
        console.log("FINALIZAR DÍA - Columna EstadoOriginal creada");
      }
      
      // Actualizar EstadoOriginal con el estado actual antes de finalizar
      const prepUpdateQuery = `
        UPDATE Tickets 
        SET EstadoOriginal = Estado 
        WHERE Estado != 'Finalizado' AND BoxAsignado = @BoxAsignado
      `;
      
      const prepUpdateResult = await pool.request()
        .input('BoxAsignado', sql.Int, boxId)
        .query(prepUpdateQuery);
      
      console.log(`FINALIZAR DÍA - Estados originales guardados: ${prepUpdateResult.rowsAffected[0]} tickets`);
      
      // Luego hacemos la actualización a Finalizado
      const finalizeQuery = `
        UPDATE Tickets 
        SET Estado = 'Finalizado', FechaCompletado = GETDATE() 
        WHERE Estado != 'Finalizado' AND BoxAsignado = @BoxAsignado
      `;
      
      const updateResult = await pool.request()
        .input('BoxAsignado', sql.Int, boxId)
        .query(finalizeQuery);
      
      console.log(`FINALIZAR DÍA - Completado para box ${boxId}, ${updateResult.rowsAffected[0]} tickets actualizados`);
      
      // Actualizar día actual para marcar el inicio de un nuevo día (esto sigue siendo global)
      diaActual = new Date().toISOString().split('T')[0];
      
      return res.json({ 
        success: true, 
        message: `Día finalizado correctamente para box ${boxId}. ${updateResult.rowsAffected[0]} tickets finalizados.`,
        ticketsFinalizados: updateResult.rowsAffected[0],
        boxId: boxId,
        nuevoDia: diaActual
      });
      
    } catch (err) {
      console.error("FINALIZAR DÍA - ERROR durante el proceso:", err);
      return res.status(500).json({ 
        success: false, 
        message: "Error al finalizar el día: " + err.message 
      });
    }
  } catch (err) {
    console.error("FINALIZAR DÍA - ERROR general:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Error al finalizar el día: " + err.message 
    });
  }
});

// Obtener el último número de ticket del sistema
router.get('/last', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .query('SELECT ISNULL(MAX(NumeroTicket), 0) as LastTicket FROM Tickets');
    
    const lastTicket = result.recordset[0].LastTicket || 0;
    
    // Si hay una configuración manual, devolver ese valor exacto
    // De lo contrario, devolver el último + 1
    const nextTicket = (nextTicketNumber !== null) ? nextTicketNumber : (lastTicket + 1);
    
    console.log("CONSULTA ÚLTIMO TICKET:", 
      "\n - Último ticket en BD:", lastTicket, 
      "\n - Número configurado:", nextTicketNumber, 
      "\n - Próximo a usar:", nextTicket);
    
    res.json({ 
      success: true, 
      lastTicket: lastTicket,
      nextTicket: nextTicket,
      hasCustomConfig: nextTicketNumber !== null,
      diaActual: diaActual
    });
  } catch (err) {
    console.error("Error al obtener último ticket:", err);
    res.status(500).json({ success: false, message: "Error al obtener último ticket" });
  }
});

// Obtener estadísticas de tickets
router.get('/estadisticas', async (req, res) => {
  try {
    const { soloHoy } = req.query;
    const pool = await sql.connect(config);
    
    // Verificamos si existe la columna EstadoOriginal
    let hasEstadoOriginal = false;
    try {
      const columnCheck = await pool.request().query(`
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Tickets' AND COLUMN_NAME = 'EstadoOriginal'
      `);
      hasEstadoOriginal = columnCheck.recordset.length > 0;
    } catch (err) {
      console.error("Error al verificar columna EstadoOriginal:", err);
    }
    
    // Consulta base
    let query = `
      SELECT 
        BoxAsignado, 
        COUNT(*) as TotalTickets,
        SUM(CASE 
          WHEN Estado = 'Atendido' THEN 1 
          ${hasEstadoOriginal ? "WHEN Estado = 'Finalizado' AND EstadoOriginal = 'Atendido' THEN 1" : ""}
          ELSE 0 
        END) as TicketsAtendidos,
        SUM(CASE 
          WHEN Estado = 'Ausente' THEN 1 
          ${hasEstadoOriginal ? "WHEN Estado = 'Finalizado' AND EstadoOriginal = 'Ausente' THEN 1" : ""}
          ELSE 0 
        END) as TicketsAusentes,
        SUM(CASE WHEN Estado = 'Activo' THEN 1 ELSE 0 END) as TicketsActivos,
        SUM(CASE WHEN Estado = 'Finalizado' THEN 1 ELSE 0 END) as TicketsFinalizados,
        SUM(CASE WHEN Estado IN ('Atendido', 'Ausente', 'Finalizado') THEN 1 ELSE 0 END) as TicketsCompletados
      FROM Tickets 
    `;
    
    // Si se solicita solo el día actual, agregamos el filtro
    if (soloHoy === 'true') {
      query += `WHERE CONVERT(date, FechaCreacion) = CONVERT(date, GETDATE()) `;
    }
    
    // Finalizamos la consulta con el GROUP BY
    query += `GROUP BY BoxAsignado`;
    
    const result = await pool.request().query(query);
    
    // Procesar los datos para asegurar que no haya valores nulos
    const estadisticas = result.recordset.map(stat => ({
      ...stat,
      TotalTickets: stat.TotalTickets || 0,
      TicketsAtendidos: stat.TicketsAtendidos || 0,
      TicketsAusentes: stat.TicketsAusentes || 0,
      TicketsActivos: stat.TicketsActivos || 0,
      TicketsFinalizados: stat.TicketsFinalizados || 0,
      TicketsCompletados: stat.TicketsCompletados || 0
    }));
    
    res.json({ 
      success: true, 
      estadisticas,
      filtro: soloHoy === 'true' ? 'dia_actual' : 'historico'
    });
  } catch (err) {
    console.error("Error al obtener estadísticas:", err);
    res.status(500).json({ success: false, message: "Error al obtener estadísticas" });
  }
});

// Obtener tickets por box
router.get('/box/:boxId', async (req, res) => {
  const { boxId } = req.params;
  
  try {
    const pool = await sql.connect(config);
    
    // Solo mostrar tickets activos, atendidos o ausentes (no finalizados)
    // Y solo del día actual (usando la fecha de creación)
    const result = await pool.request()
      .input('BoxAsignado', sql.Int, boxId)
      .query(`
        SELECT * FROM Tickets 
        WHERE BoxAsignado = @BoxAsignado 
        AND Estado != 'Finalizado'
        AND CONVERT(date, FechaCreacion) >= CONVERT(date, GETDATE())
        ORDER BY FechaCreacion DESC
      `);
    
    console.log(`Tickets encontrados para box ${boxId}: ${result.recordset.length} (solo del día actual)`);
    
    return res.json({ success: true, tickets: result.recordset });
  } catch (err) {
    console.error("Error al obtener tickets por box:", err);
    return res.status(500).json({ success: false, message: "Error al obtener tickets por box" });
  }
});

// Incrementar el ticket desde el frontend
router.post('/increment', async (req, res) => {
  const { boxAsignado } = req.body;

  try {
    const pool = await sql.connect(config);
    
    // Determinar qué número de ticket usar
    let nuevoNumeroTicket;
    
    // IMPORTANTE: Si hay un valor configurado, usamos exactamente ese número
    if (nextTicketNumber !== null) {
      console.log("CREAR TICKET: Usando número configurado:", nextTicketNumber);
      nuevoNumeroTicket = nextTicketNumber;
      
      // Ya no reseteamos la configuración - la mantenemos para la secuencia
      // nextTicketNumber = null;

      // En lugar de resetear, incrementamos el valor para el próximo ticket
      nextTicketNumber++;
      console.log("CREAR TICKET: Incrementando configuración a:", nextTicketNumber);
    } else {
      // Si no hay configuración, usar el último + 1
      const result = await pool.request()
        .query('SELECT ISNULL(MAX(NumeroTicket), 0) as LastTicket FROM Tickets');
      
      const lastTicket = result.recordset[0].LastTicket || 0;
      nuevoNumeroTicket = lastTicket + 1;
      console.log("CREAR TICKET: Incrementando automáticamente desde:", lastTicket, "a:", nuevoNumeroTicket);
    }
    
    // Verificar que no exceda el límite de 999
    if (nuevoNumeroTicket > 999) {
      return res.status(400).json({ 
        success: false, 
        message: "Se ha alcanzado el límite máximo de tickets (999)" 
      });
    }
    
    // Insertar el nuevo ticket en la base de datos
    await pool.request()
      .input('NumeroTicket', sql.Int, nuevoNumeroTicket)
      .input('BoxAsignado', sql.Int, boxAsignado)
      .query('INSERT INTO Tickets (NumeroTicket, BoxAsignado, FechaCreacion, Estado) VALUES (@NumeroTicket, @BoxAsignado, GETDATE(), \'Activo\')');

    console.log("CREAR TICKET: Ticket creado:", nuevoNumeroTicket, "para box:", boxAsignado);

    res.json({ 
      success: true, 
      nuevoNumeroTicket: nuevoNumeroTicket,
      proximoNumeroTicket: nextTicketNumber !== null ? nextTicketNumber : (nuevoNumeroTicket + 1),
      message: "Ticket creado exitosamente" 
    });
  } catch (err) {
    console.error("Error al incrementar ticket:", err);
    res.status(500).json({ success: false, message: "Error al incrementar ticket" });
  }
});

// Marcar ticket como atendido
router.put('/:ticketId/atendido', async (req, res) => {
  const { ticketId } = req.params;
  
  console.log("Recibida solicitud para marcar ticket como atendido, ID:", ticketId);
  
  try {
    // Validación básica
    const id = parseInt(ticketId);
    if (isNaN(id)) {
      return res.json({ 
        success: false, 
        message: "ID de ticket inválido" 
      });
    }
    
    const pool = await sql.connect(config);
    
    // Actualizar directamente
    await pool.request()
      .input('TicketId', sql.Int, id)
      .query('UPDATE Tickets SET Estado = \'Atendido\', FechaCompletado = GETDATE() WHERE ID = @TicketId');
    
    console.log("Ticket marcado como atendido exitosamente, ID:", id);
    res.json({ 
      success: true, 
      message: "Ticket marcado como atendido" 
    });
  } catch (err) {
    console.error("Error al marcar ticket como atendido:", err);
    res.json({ 
      success: false, 
      message: "Error al marcar ticket como atendido" 
    });
  }
});

// Marcar ticket como ausente
router.put('/:ticketId/ausente', async (req, res) => {
  const { ticketId } = req.params;
  
  console.log("Recibida solicitud para marcar ticket como ausente, ID:", ticketId);
  
  try {
    // Validación básica
    const id = parseInt(ticketId);
    if (isNaN(id)) {
      return res.json({ 
        success: false, 
        message: "ID de ticket inválido" 
      });
    }
    
    const pool = await sql.connect(config);
    
    // Actualizar directamente
    await pool.request()
      .input('TicketId', sql.Int, id)
      .query('UPDATE Tickets SET Estado = \'Ausente\', FechaCompletado = GETDATE() WHERE ID = @TicketId');
    
    console.log("Ticket marcado como ausente exitosamente, ID:", id);
    res.json({ 
      success: true, 
      message: "Ticket marcado como ausente" 
    });
  } catch (err) {
    console.error("Error al marcar ticket como ausente:", err);
    res.json({ 
      success: false, 
      message: "Error al marcar ticket como ausente" 
    });
  }
});

// Obtener un ticket individual por ID (esta ruta debe ir al final para evitar conflictos)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('ID', sql.Int, id)
      .query('SELECT * FROM Tickets WHERE ID = @ID');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Ticket no encontrado" });
    }
    
    res.json({ success: true, ticket: result.recordset[0] });
  } catch (err) {
    console.error("Error al obtener ticket:", err);
    res.status(500).json({ success: false, message: "Error al obtener ticket" });
  }
});

// Ruta de diagnóstico para verificar la estructura de la tabla y algunos tickets
router.get('/diagnostico', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    
    // 1. Obtener estructura de la tabla
    const structureResult = await pool.request().query(`
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH
      FROM 
        INFORMATION_SCHEMA.COLUMNS
      WHERE 
        TABLE_NAME = 'Tickets'
      ORDER BY 
        ORDINAL_POSITION
    `);
    
    // 2. Obtener algunos ejemplos de tickets
    const samplesResult = await pool.request().query(`
      SELECT TOP 10 * FROM Tickets ORDER BY ID DESC
    `);
    
    // 3. Obtener conteos por box y estado
    const statsResult = await pool.request().query(`
      SELECT 
        BoxAsignado,
        Estado,
        COUNT(*) as Cantidad 
      FROM 
        Tickets 
      GROUP BY 
        BoxAsignado, Estado
      ORDER BY 
        BoxAsignado, Estado
    `);
    
    res.json({
      success: true,
      estructura: structureResult.recordset,
      ejemplos: samplesResult.recordset,
      estadisticas: statsResult.recordset
    });
  } catch (err) {
    console.error("Error en diagnóstico:", err);
    res.status(500).json({ success: false, message: "Error al realizar diagnóstico" });
  }
});

module.exports = router;
