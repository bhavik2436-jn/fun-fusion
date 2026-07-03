const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const roomHandler = require('./socket/roomHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../public')));

io.on('connection', (socket) => {
    console.log(`⚡ Naya player connect hua! ID: ${socket.id}`);

    // Radar jo har signal ko pakdega
    socket.onAny((eventName, ...args) => {
        console.log(`📡 RADAR NE PAKDA: [${eventName}]`);
    });

    // Room aur Game ka connection
    roomHandler(io, socket);

    socket.on('disconnect', () => {
        console.log(`❌ Player chala gaya! ID: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Fun Fusion Server chal raha hai: http://localhost:${PORT}`);
});