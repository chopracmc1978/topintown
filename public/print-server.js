/**
 * Local Print Server for ESC/POS Thermal Printers
 * 
 * Run this on a computer on your local network that can reach the printer.
 * 
 * Installation:
 *   1. Install Node.js if not already installed
 *   2. Save this file on your local machine
 *   3. Run: node print-server.js
 * 
 * The server will listen on port 3001 and forward print jobs to your thermal printer.
 */

const http = require('http');
const net = require('net');

const PORT = 3001;

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Print server is running' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/print') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { printer_ip, port = 9100, data, auto_cut = true } = JSON.parse(body);
        
        if (!printer_ip || !data) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing printer_ip or data' }));
          return;
        }

        console.log(`Printing to ${printer_ip}:${port}...`);

        // Connect to printer via TCP
        const client = new net.Socket();
        
        client.setTimeout(10000); // 10 second timeout

        client.connect(port, printer_ip, () => {
          console.log('Connected to printer');
          
          // Send ESC/POS data
          client.write(Buffer.from(data, 'utf8'), () => {
            console.log('Data sent to printer');
            client.end();
          });
        });

        client.on('close', () => {
          console.log('Printer connection closed');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Print job sent' }));
        });

        client.on('error', (err) => {
          console.error('Printer error:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Printer error: ${err.message}` }));
        });

        client.on('timeout', () => {
          console.error('Printer connection timeout');
          client.destroy();
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Printer connection timeout' }));
        });

      } catch (err) {
        console.error('Parse error:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║          ESC/POS Print Server Running                 ║
╠═══════════════════════════════════════════════════════╣
║  Port: ${PORT}                                          ║
║  URL:  http://localhost:${PORT}                         ║
╠═══════════════════════════════════════════════════════╣
║  Endpoints:                                           ║
║    GET  /health  - Check server status                ║
║    POST /print   - Send print job                     ║
╠═══════════════════════════════════════════════════════╣
║  In your POS settings, set Print Server URL to:       ║
║    http://YOUR_LOCAL_IP:${PORT}                         ║
╚═══════════════════════════════════════════════════════╝
  `);
});
