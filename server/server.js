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

    // ==========================================
// 🌐 GLOBAL LOBBY SYNC & CHAT HANDLERS
// ==========================================

// 1. Host Back to Lobby Sync
socket.on('hostBackToLobby', (roomId) => {
    // Pura room state reset karenge aur sabhi ko lobby mein bhejenge
    io.to(roomId).emit('redirectToLobby');
});

// 2. Global Chat Message System
socket.on('sendLobbyMessage', ({ roomId, sender, message }) => {
    io.to(roomId).emit('receiveLobbyMessage', {
        sender: sender,
        message: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
});

// 3. User Disconnect / Quit Cleanup
socket.on('quitGameSession', ({ roomId, username, isHost }) => {
    socket.leave(roomId);
    if (isHost) {
        // Agar host chala gaya, toh game session terminate karo
        io.to(roomId).emit('hostHasLeft');
    } else {
        // Player left, update remaining player list
        io.to(roomId).emit('playerLeftUpdate', username);
    }
});

    socket.on('disconnect', () => {
        console.log(`❌ Player chala gaya! ID: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Fun Fusion Server chal raha hai: http://localhost:${PORT}`);
});