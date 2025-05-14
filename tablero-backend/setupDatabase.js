const sql = require('mssql');
const config = require('./dbConfig');

async function setupDatabase() {
  try {
    console.log('Conectando a la base de datos...');
    const pool = await sql.connect(config);
    
    console.log('Verificando si la tabla Tickets existe...');
    const checkTableResult = await pool.request().query(`
      SELECT OBJECT_ID('Tickets') as TableExists
    `);
    
    // Si la tabla ya existe, preguntar si quiere eliminarla
    if (checkTableResult.recordset[0].TableExists) {
      console.log('La tabla Tickets ya existe. Se recreará con la estructura adecuada.');
      
      // Eliminar la tabla existente
      await pool.request().query('DROP TABLE Tickets');
      console.log('Tabla Tickets eliminada.');
    }
    
    // Crear la tabla Tickets con la estructura necesaria
    console.log('Creando tabla Tickets...');
    await pool.request().query(`
      CREATE TABLE Tickets (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        NumeroTicket INT NOT NULL,
        BoxAsignado INT NOT NULL,
        FechaCreacion DATETIME DEFAULT GETDATE(),
        Estado VARCHAR(20) DEFAULT 'Activo',
        EstadoOriginal VARCHAR(20) NULL,
        FechaCompletado DATETIME NULL
      )
    `);
    
    console.log('Tabla Tickets creada exitosamente.');
    
    // Verificar si la tabla OperadorBox existe
    console.log('Verificando si la tabla OperadorBox existe...');
    const checkOperadorBoxResult = await pool.request().query(`
      SELECT OBJECT_ID('OperadorBox') as TableExists
    `);
    
    // Si la tabla no existe, crearla
    if (!checkOperadorBoxResult.recordset[0].TableExists) {
      console.log('Creando tabla OperadorBox...');
      await pool.request().query(`
        CREATE TABLE OperadorBox (
          ID INT IDENTITY(1,1) PRIMARY KEY,
          USUARIO VARCHAR(50) NOT NULL,
          NumeroBox INT NOT NULL,
          nombreApellido VARCHAR(100) NULL
        )
      `);
      
      // Insertar algunos operadores de ejemplo
      console.log('Insertando operadores de ejemplo...');
      await pool.request().query(`
        INSERT INTO OperadorBox (USUARIO, NumeroBox, nombreApellido)
        VALUES 
          ('4473', 1, 'Juan Pérez'),
          ('5578', 2, 'María González'),
          ('6692', 3, 'Carlos Rodríguez'),
          ('7812', 4, 'Laura Fernández')
      `);
      
      console.log('Tabla OperadorBox creada e inicializada exitosamente.');
    } else {
      // Verificar si la columna nombreApellido existe en la tabla OperadorBox
      console.log('Verificando si la columna nombreApellido existe...');
      const checkColumnResult = await pool.request().query(`
        SELECT COUNT(*) as ColumnExists FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'OperadorBox' AND COLUMN_NAME = 'nombreApellido'
      `);
      
      if (checkColumnResult.recordset[0].ColumnExists === 0) {
        console.log('Añadiendo columna nombreApellido a la tabla OperadorBox...');
        await pool.request().query(`
          ALTER TABLE OperadorBox ADD nombreApellido VARCHAR(100) NULL
        `);
        
        // Actualizar ejemplos con nombres
        await pool.request().query(`
          UPDATE OperadorBox SET nombreApellido = 'Juan Pérez' WHERE USUARIO = '4473';
          UPDATE OperadorBox SET nombreApellido = 'María González' WHERE USUARIO = '5578';
          UPDATE OperadorBox SET nombreApellido = 'Carlos Rodríguez' WHERE USUARIO = '6692';
          UPDATE OperadorBox SET nombreApellido = 'Laura Fernández' WHERE USUARIO = '7812';
        `);
        
        console.log('Columna nombreApellido añadida e inicializada.');
      } else {
        console.log('La columna nombreApellido ya existe en la tabla OperadorBox.');
      }
    }
    
    console.log('Configuración de la base de datos completada.');
    
    // Cerrar la conexión
    await sql.close();
  } catch (err) {
    console.error('Error al configurar la base de datos:', err);
  }
}

// Ejecutar la configuración si se llama directamente
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase; 