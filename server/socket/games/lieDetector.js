const spicyStatements = [
    "Kya tumne kabhi galti se doston ke samne paad kar kisi aur par ilzaam lagaya hai? 💨",
    "Kya tumne kabhi kisi dost ka birthday gift kisi aur ko re-gift kiya hai? 🎁",
    "Kya tumne kabhi bimar hone ka bahana banakar college ya ghoomna cancel kiya hai? 🛌",
    "Kya tumne kabhi raste par gira hua paisa chupke se apni jeb mein daala hai? 💸",
    "Kya tumne kabhi apne kisi dost ke crush ko secretly dhoonda ya stalk kiya hai? 🔍",
    "Kya tumne kabhi public place mein galti se kisi cheez ko tod kar chupchaap wahan se kat liya hai? 🏃‍♂️"
];

const aiResponses = [
    "AI Scanner says: 🟢 TRUE STATEMENT! Dil saaf hai iska.",
    "AI Scanner says: 🔴 HIGH VOLTAGE LIE DETECTED! Bhaari bluff hai.",
    "AI Scanner says: ⚠️ SYSTEM GLITCH! Itna bada jhooth ki firewall hil gayi.",
    "AI Scanner says: 🟢 TRUTH! Is baar bach gaya."
];

module.exports = (io, socket, activeRooms) => {
    
    socket.on('startLieDetector', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;

        const isSolo = room.players.length === 1;
        const targetPlayer = room.players[Math.floor(Math.random() * room.players.length)];

        room.lieGame = {
            statement: spicyStatements[Math.floor(Math.random() * spicyStatements.length)],
            targetId: targetPlayer.id,
            targetName: targetPlayer.name,
            votes: {}, // Kisne kya guess kiya (sach ya jhooth)
            timeLeft: 20
        };

        io.to(roomCode).emit('loadLieDetectorUI', {
            statement: room.lieGame.statement,
            targetId: room.lieGame.targetId,
            targetName: room.lieGame.targetName,
            isSolo: isSolo,
            isMyScan: (socket.id === room.lieGame.targetId && !isSolo)
        });

        // 20s Pulse Countdown
        room.lieTimer = setInterval(() => {
            room.lieGame.timeLeft--;
            io.to(roomCode).emit('lieTimeUpdate', room.lieGame.timeLeft);

            if(room.lieGame.timeLeft <= 0) {
                clearInterval(room.lieTimer);
                revealLieResults(io, roomCode, room, isSolo);
            }
        }, 1000);
    });

    socket.on('submitLieVote', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room || !room.lieGame) return;

        room.lieGame.votes[socket.id] = data.vote; // 'truth' or 'lie'

        // Agar sabne vote kar diya (target player ko chhodkar online mode mein)
        const totalVotersNeeded = room.players.length === 1 ? 1 : room.players.length - 1;
        if(Object.keys(room.lieGame.votes).length >= totalVotersNeeded) {
            clearInterval(room.lieTimer);
            revealLieResults(io, data.roomCode, room, room.players.length === 1);
        }
    });

    function revealLieResults(io, roomCode, room, isSolo) {
        let resultMsg = "";
        
        if (isSolo) {
            // Solo Mode: AI dynamically roasts or judges your answer
            resultMsg = aiResponses[Math.floor(Math.random() * aiResponses.length)];
        } else {
            // Multiplayer Mode: Calculate how many friends caught the bluff
            let truthVotes = 0;
            let lieVotes = 0;
            for(let id in room.lieGame.votes) {
                if(room.lieGame.votes[id] === 'truth') truthVotes++;
                else lieVotes++;
            }
            
            const finalVerdict = Math.random() > 0.5 ? "LIE 🔴" : "TRUTH 🟢";
            resultMsg = `Thermal Scanner Verdict for ${room.lieGame.targetName}: [${finalVerdict}]<br>Friends Opinion - Truth: ${truthVotes} | Lie: ${lieVotes}`;
        }

        // Add fun points for participation
        room.players.forEach(p => p.score += 10);

        io.to(roomCode).emit('lieResults', {
            resultMsg: resultMsg,
            scores: room.players.map(pl => ({ name: pl.name, score: pl.score }))
        });
    }
};