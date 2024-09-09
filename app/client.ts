const net = require('net');

// Create a TCP client
const client = new net.Socket();

// Connect to the Redis server
client.connect(6379, 'localhost', () => {
  console.log('Connected to Redis server');

  // Send the raw Redis protocol message
  const message = "*2\r\n$4\r\nECHO\r\n$3\r\nhey\r\n";

  client.write(message);
});

// Handle data received from the server
client.on('data', (data: Buffer) => {
  console.log('Received:', data.toString());
  // Close the connection after receiving the response
  client.destroy();
});

// Handle connection closure
client.on('close', () => {
  console.log('Connection closed');
});

// Handle errors
client.on('error', (err: Error) => {
  console.error('Error:', err);
});