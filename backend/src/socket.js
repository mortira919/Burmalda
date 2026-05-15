const { Server } = require('socket.io');

let io = null;

function init(server) {
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });
  io.on('connection', (socket) => {
    console.log('WS client connected:', socket.id);
    socket.on('disconnect', () => console.log('WS client disconnected:', socket.id));
  });
  return io;
}

function emit(event, data) {
  if (io) io.emit(event, data);
}

module.exports = { init, emit };
