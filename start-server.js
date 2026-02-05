// Wrapper script to keep server running
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting TARS server...');

const server = spawn('node', [path.join(__dirname, 'server', 'index.js')], {
  stdio: 'inherit',
  cwd: __dirname
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  // Auto-restart if it crashes
  if (code !== 0) {
    console.log('Restarting in 2 seconds...');
    setTimeout(() => {
      require('./start-server.js');
    }, 2000);
  }
});

// Keep process alive
setInterval(() => {}, 1000);

// Handle shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  server.kill();
  process.exit(0);
});
