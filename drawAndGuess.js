// ==========================================
// 📝 WORD DATABASE
// ==========================================
const words = [
    // Easy & Fun
    "Samosa", "Vada Pav", "Biryani", "Chai", "Cricket", "Bollywood", "Salman", "Shahrukh", 
    "Auto Rickshaw", "Local Train", "Metro", "Traffic", "Taj Mahal", "Gym", "Selfie", "Instagram",
    
    // Objects & Daily Life
    "Laptop", "Smartphone", "Headphones", "Water Bottle", "Backpack", "Sunglasses", "Wallet", "Keychain",
    "Pizza", "Burger", "Ice Cream", "Coffee Mug", "Guitar", "Football", "Skateboard", "Helicopter",
    
    // Quirky & Party Vibe
    "Nazar Battu", "Jugaad", "Paparazzi", "Ghost", "Alien", "Zombie", "Superheroes", "Time Machine",
    "Dinosaur", "Vampire", "Pirate Ship", "Magic Wand", "Brainwash", "Sleepwalking", "Hiccup", "Sneezing"
];

// ==========================================
// 🔄 AUTOMATIC NON-REPEAT WORD PICKER
// ==========================================
function getUniqueRandomWord(room) {
    if (!room.drawGame.usedWords || room.drawGame.usedWords.length === words.length) {
        room.drawGame.usedWords = []; // Array reset jab saare words use ho jayein
    }
    const availableWords = words.filter(w => !room.drawGame.usedWords.includes(w));
    const randomIndex = Math.floor(Math.random() * availableWords.length);
    const selected = availableWords[randomIndex];
    
    room.drawGame.usedWords.push(selected); // Used list mein safe record karo
    return selected.toUpperCase();
}

module.exports = (io, socket, activeRooms) => {

    socket.on('startDrawAndGuess', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;
        if(room.players.length < 2) return socket.emit('errorMsg', 'Drawing ke liye kam se kam 2 players chahiye!');

        room.drawGame = {
            turnIndex: 0,
            currentWord: "",
            drawerId: null,
            timer: null,
            timeLeft: 45,
            usedWords: []
        };

        startNextDrawTurn(io, roomCode, room);
    });

    function startNextDrawTurn(io, roomCode, room) {
        if(room.drawGame.timer) clearInterval(room.drawGame.timer);

        const drawer = room.players[room.drawGame.turnIndex];
        room.drawGame.drawerId = drawer.id;
        room.drawGame.currentWord = getUniqueRandomWord(room);
        room.drawGame.timeLeft = 45;

        // 🔤 Hint Generate karo (e.g., A P P L E -> _ _ _ _ _)
        const wordHint = room.drawGame.currentWord.replace(/[A-Z0-9]/g, "_ ");

        room.players.forEach(p => {
            io.to(p.id).emit('loadDrawAndGuess', {
                isDrawer: (p.id === drawer.id),
                drawerName: drawer.name,
                word: (p.id === drawer.id) ? room.drawGame.currentWord : wordHint, // Drawer ko word, baaki ko hint
                scores: room.players.map(pl => ({name: pl.name, score: pl.score}))
            });
        });

        room.drawGame.timer = setInterval(() => {
            room.drawGame.timeLeft--;
            io.to(roomCode).emit('drawTimeUpdate', room.drawGame.timeLeft);

            if(room.drawGame.timeLeft <= 0) {
                clearInterval(room.drawGame.timer);
                io.to(roomCode).emit('drawTurnOver', {
                    reason: 'timeout',
                    word: room.drawGame.currentWord,
                    drawerName: drawer.name,
                    scores: room.players.map(pl => ({name: pl.name, score: pl.score}))
                });
                room.drawGame.turnIndex = (room.drawGame.turnIndex + 1) % room.players.length;
            }
        }, 1000);
    }

    socket.on('drawEvent', (data) => {
        socket.to(data.roomCode).emit('receiveDrawEvent', data);
    });

    socket.on('clearCanvasEvent', (roomCode) => {
        socket.to(roomCode).emit('receiveClearCanvas');
    });

    socket.on('submitDrawGuess', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room || !room.drawGame || room.drawGame.timeLeft <= 0) return;
        
        if(socket.id === room.drawGame.drawerId) return;

        const guess = data.guess.toUpperCase().trim();
        const guesser = room.players.find(p => p.id === socket.id);
        
        if (guess === room.drawGame.currentWord) {
            clearInterval(room.drawGame.timer);
            const drawer = room.players.find(p => p.id === room.drawGame.drawerId);
            
            if(guesser) guesser.score += 20; 
            if(drawer) drawer.score += 10;  
            
            io.to(data.roomCode).emit('drawTurnOver', {
                reason: 'guessed',
                winnerName: guesser.name,
                word: room.drawGame.currentWord,
                drawerName: drawer.name,
                scores: room.players.map(pl => ({name: pl.name, score: pl.score}))
            });

            room.drawGame.turnIndex = (room.drawGame.turnIndex + 1) % room.players.length;
        } else {
            // 💬 GALAT GUESS KO SABKO BHEJO (Live Feed)
            if(guesser) {
                io.to(data.roomCode).emit('liveWrongGuess', {
                    playerName: guesser.name,
                    guess: guess
                });
            }
            socket.emit('wrongDrawGuess');
        }
    });

    socket.on('nextDrawRound', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;
        startNextDrawTurn(io, roomCode, room);
    });
};