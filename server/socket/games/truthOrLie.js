module.exports = (io, socket, activeRooms) => {

    socket.on('startTol', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room || room.players.length < 2) return socket.emit('errorMsg', 'Kam se kam 2 players chahiye!');

        room.tolGame = {
            turnIndex: 0,
            targetId: null,
            statements: [], // [string, string, string]
            lieIndex: null, // 0, 1, or 2
            guesses: {} // { playerId: guessedIndex }
        };

        startTolRound(io, roomCode, room);
    });

    function startTolRound(io, roomCode, room) {
        const targetPlayer = room.players[room.tolGame.turnIndex];
        room.tolGame.targetId = targetPlayer.id;
        room.tolGame.statements = [];
        room.tolGame.lieIndex = null;
        room.tolGame.guesses = {};

        io.to(roomCode).emit('loadTolPhase1', {
            targetName: targetPlayer.name,
            targetId: targetPlayer.id,
            scores: room.players.map(p => ({name: p.name, score: p.score}))
        });
    }

    socket.on('submitTolStatements', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room || socket.id !== room.tolGame.targetId) return;

        room.tolGame.statements = data.statements;
        room.tolGame.lieIndex = data.lieIndex;

        // Phase 2: Dikhayao baaki sabko aur guess karne bolo
        io.to(data.roomCode).emit('loadTolPhase2', {
            targetName: room.players.find(p => p.id === room.tolGame.targetId).name,
            statements: data.statements
        });
    });

    socket.on('submitTolGuess', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room || socket.id === room.tolGame.targetId) return;

        room.tolGame.guesses[socket.id] = data.guessIndex;

        io.to(data.roomCode).emit('tolPlayerGuessedUpdate', Object.keys(room.tolGame.guesses).length);

        // Agar sabne guess kar liya (except target)
        if(Object.keys(room.tolGame.guesses).length === room.players.length - 1) {
            evaluateTolResults(io, data.roomCode, room);
        }
    });

    function evaluateTolResults(io, roomCode, room) {
        const targetId = room.tolGame.targetId;
        const lieIndex = parseInt(room.tolGame.lieIndex);
        const targetPlayer = room.players.find(p => p.id === targetId);
        
        let correctGuessers = [];
        let fooledCount = 0;

        room.players.forEach(p => {
            if(p.id !== targetId) {
                const pGuess = parseInt(room.tolGame.guesses[p.id]);
                if(pGuess === lieIndex) {
                    p.score += 20; // Sahi jhooth pakda
                    correctGuessers.push(p.name);
                } else {
                    fooledCount++; // Target ne bewakoof banaya
                }
            }
        });

        // Target ko points har ek bewakoof banne wale dost ke liye
        if(targetPlayer) {
            targetPlayer.score += (fooledCount * 15);
        }

        io.to(roomCode).emit('tolResults', {
            targetName: targetPlayer.name,
            statements: room.tolGame.statements,
            lieIndex: lieIndex,
            correctGuessers: correctGuessers,
            fooledCount: fooledCount,
            scores: room.players.map(p => ({name: p.name, score: p.score}))
        });

        // Agle player ki turn
        room.tolGame.turnIndex = (room.tolGame.turnIndex + 1) % room.players.length;
    }

    socket.on('nextTolRound', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;
        startTolRound(io, roomCode, room);
    });
};