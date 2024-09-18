// dbConfig.js
const sql = require('mssql');

const config = {
  user: 'usuario_sistemas',
  password: 'claromecopa2015',
  server: 'HNPBS15',
  database: 'informatica',
  options: {
    encrypt: false, // Cambiar a false si no estás usando cifrado
    trustServerCertificate: true // Cambiar según la configuración de certificados
  }
};

module.exports = config;
