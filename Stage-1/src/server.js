require('dotenv').config(); 
const app = require('./app'); 
const http = require('http');
// const https = require('https');

const PORT = process.env.PORT; 
const server = http.createServer(app); 

server.listen(PORT, () => {
  console.log(`Inventory Server running on port ${PORT}`);
});
