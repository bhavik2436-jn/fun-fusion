const exposeQuestions = [
    "Kiska browser history sabse zyada khatarnak/suspicious hoga? 🕵️‍♂️",
    "Zombie apocalypse mein kaun sabse pehle marega? 🧟‍♂️",
    "Kaun sabse zyada nahaane se chidhta hai? 🚿",
    "Kaun sach bolte waqt bhi jhootha lagta hai? 🤥",
    "Road trip par kaun sabse ghatiya gaane bajayega? 🎧",
    "Kaun bina baat ke sabse zyada show-off karta hai? 🕶️",
    "Kaun apno doston ko kisi ladki/ladke ke liye sabse jaldi dhokha dega? 💔",
    "Kaun sabse bada fattu (darpok) hai horror movies dekhte waqt? 👻",
    "Bina nahaye kaun ek hafta guzaar sakta hai? 🤢",
    "Kaun ameer banne ke baad apne doston ko bhool jayega? 💰",
    "Kiski shadi sabse pehle hogi? 💍",
    "Kaun exam mein sabse zyada cheating karta hai par pakda nahi jata? 📝",
    "Kiska dimaag hamesha double meaning baaton mein chalta hai? 🧠",
    "Gusse mein kaun sabse zyada gaaliyan deta hai? 🤬",
    "Kaun free ka khana khane ke liye kahin bhi pahunch sakta hai? 🍕",
    "Kaun hamesha plan banata hai aur last minute pe cancel karta hai? 🚫",
    "Kaun sabse zyada mirror ke aage time waste karta hai? 🪞",
    "Agar group mein koi murder ho jaye, toh sabse bada suspect kaun hoga? 🔪",
    "Kaun internet par sabse zyada fake gyaan pelata hai? 🤓",
    "Kaun sabse zyada over-acting karta hai choti si chot lagne par? 🤕"
];

module.exports = (io, socket, activeRooms) => {

    socket.on('startExpose', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;
        if(room.players.length < 3) return socket.emit('errorMsg', 'Exposé khelne ke liye kam se kam 3 players chahiye!');

        startNextExposeRound(io, roomCode, room);
    });

    function startNextExposeRound(io, roomCode, room) {
        if(room.exposeTimer) clearInterval(room.exposeTimer);

        room.exposeGame = {
            question: exposeQuestions[Math.floor(Math.random() * exposeQuestions.length)],
            votes: {}, // Kisne kisko vote kiya
            timeLeft: 20
        };

        // Sabko question aur voting options bhejo
        io.to(roomCode).emit('loadExposeUI', {
            question: room.exposeGame.question,
            playersList: room.players.map(p => ({id: p.id, name: p.name}))
        });

        // Start 20s Countdown
        room.exposeTimer = setInterval(() => {
            room.exposeGame.timeLeft--;
            io.to(roomCode).emit('exposeTimeUpdate', room.exposeGame.timeLeft);

            if(room.exposeGame.timeLeft <= 0) {
                clearInterval(room.exposeTimer);
                revealExposeResults(io, roomCode, room);
            }
        }, 1000);
    }

    socket.on('submitExposeVote', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room || !room.exposeGame || room.exposeGame.timeLeft <= 0) return;
        
        // Save vote: voterId -> targetId
        room.exposeGame.votes[socket.id] = data.targetId;
        
        // Inform room that someone voted (for dynamic UI update)
        io.to(data.roomCode).emit('playerVotedUpdate', Object.keys(room.exposeGame.votes).length);

        // Agar sabne vote kar diya toh timer ka wait mat karo, direct reveal karo
        if(Object.keys(room.exposeGame.votes).length === room.players.length) {
            clearInterval(room.exposeTimer);
            revealExposeResults(io, data.roomCode, room);
        }
    });

    function revealExposeResults(io, roomCode, room) {
        const voteCounts = {};
        room.players.forEach(p => voteCounts[p.id] = 0); // Initialize

        // Calculate votes
        for (const voterId in room.exposeGame.votes) {
            const targetId = room.exposeGame.votes[voterId];
            if(voteCounts[targetId] !== undefined) {
                voteCounts[targetId]++;
            }
        }

        // Find max votes
        let maxVotes = 0;
        let guiltyPlayers = [];
        
        room.players.forEach(p => {
            if (voteCounts[p.id] > maxVotes) {
                maxVotes = voteCounts[p.id];
                guiltyPlayers = [p];
            } else if (voteCounts[p.id] === maxVotes && maxVotes > 0) {
                guiltyPlayers.push(p);
            }
        });

        // Add penalties (Guilty players lose 5 points, or you can give them points as a joke)
        guiltyPlayers.forEach(gp => {
            const player = room.players.find(p => p.id === gp.id);
            if(player) player.score -= 10;
        });

        // Prepare chart data
        const chartData = room.players.map(p => ({
            name: p.name,
            votes: voteCounts[p.id]
        })).sort((a, b) => b.votes - a.votes); // Sort by highest votes

        io.to(roomCode).emit('exposeResults', {
            question: room.exposeGame.question,
            chartData: chartData,
            guiltyNames: guiltyPlayers.map(p => p.name).join(' & '),
            scores: room.players.map(p => ({name: p.name, score: p.score}))
        });
    }

    socket.on('nextExposeRound', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;
        startNextExposeRound(io, roomCode, room);
    });
};