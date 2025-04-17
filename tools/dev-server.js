/**
 * Simple development server for testing
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3000;

// MIME types for different file extensions
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

// Build the project first
console.log('Building project...');
exec('node tools/build.js', (error) => {
  if (error) {
    console.error('Build failed:', error);
    return;
  }
  
  console.log('Starting development server...');
  
  // Create the server
  const server = http.createServer((req, res) => {
    // Parse URL
    let url = req.url;
    
    // Default to index.html
    if (url === '/') {
      url = '/examples/basic/index.html';
    }
    
    // Get file path
    let filePath = path.join(__dirname, '..', url);
    
    // Get file extension
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';
    
    // Read the file
    fs.readFile(filePath, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          res.writeHead(404);
          res.end('404 Not Found');
        } else {
          res.writeHead(500);
          res.end(`Server Error: ${error.code}`);
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });
  
  // Start the server
  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Visit http://localhost:${PORT}/examples/basic/index.html to see the demo`);
  });
});
