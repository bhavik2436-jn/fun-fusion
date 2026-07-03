const wkmQuestions = [
    { q: "Agar mujhe achanak 1 Lakh rupaye mil jayein, toh main sabse pehle kya karunga?", opts: ["Save karunga/Bank mein daalunga 💰", "Shopping ya naya Gadget lunga 📱", "Doston ke sath Party/Trip karunga 🎉", "Sab faaltu cheezon mein uda dunga 💸"] },
    { q: "Mera ideal Sunday kaisa hota hai?", opts: ["Din bhar bed pe pada rehna/Sona 😴", "Doston ke sath bahar ghoomna 🚗", "Movies/Series binge-watch karna 🍿", "Pending kaam ya padhai karna 📚"] },
    { q: "Jab main gusse mein hota hoon, toh main kaisa react karta hoon?", opts: ["Ekdum chup ho jata hoon 🤫", "Zor se chilla deta hoon/Gussa karta hoon 🤬", "Sarcastic taane marta hoon 😒", "Sad hokar rone lagta hoon 🥺"] },
    { q: "Mujhe sabse zyada darr kis cheez se lagta hai?", opts: ["Kide-makode (Cockroach/Spiders) 🕷️", "Heights (Uchai) se 🎢", "Akele reh jane se 👤", "Life mein fail hone se 📉"] },
    { q: "Mera ultimate comfort food kya hai?", opts: ["Maggi / Instant Noodles 🍜", "Pizza ya Burger 🍕", "Ghar ka Khana (Dal Chawal) 🍛", "Biryani 🍗"] },
    { q: "Agar mujhe ek Super Power choose karni ho, toh kya hogi?", opts: ["Hawa mein Udna (Flying) 🦸‍♂️", "Dimaag Padhna (Mind Reading) 🧠", "Time Travel karna ⏳", "Gayab ho jana (Invisibility) 🫥"] },
    { q: "College/School mein mera sabse bada distraction kya hai/tha?", opts: ["Mera Mobile/Social Media 📱", "Crush ko dekhna/Sochna 😍", "Doston ke sath bakwaas karna 🗣️", "Bhookh lagna/Khana sochna 🍔"] },
    { q: "Main vacation ke liye kahan jana pasand karunga?", opts: ["Pahaad aur Thand (Mountains) 🏔️", "Beach aur Party (Goa/Maldives) 🏖️", "Historical/Cultural Cities 🏛️", "Ghar pe hi chutti mana lunga 🛌"] },
    { q: "Main ek din bina kis cheez ke nahi guzaar sakta?", opts: ["Internet/Wi-Fi 🌐", "Chai ya Coffee ☕", "Music 🎧", "Mera best friend/partner ❤️"] },
    { q: "Mujhe kaisa gift sabse zyada pasand aayega?", opts: ["Mehenge kapde ya shoes 👟", "Latest tech gadget/game 🎮", "Handmade ya emotional gift 💌", "Cash de do, main khud le lunga 💵"] }
];

module.exports = (io, socket, activeRooms) => {

    socket.on('startWkm', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room || room.players.length < 2) return;
        
        room.wkmGame = { turnIndex: 0, targetId: null, targetAnswer: null, guesses: {}, timer: null };
        startWkmRound(io, roomCode, room);
    });

    function startWkmRound(io, roomCode, room) {
        const targetPlayer = room.players[room.wkmGame.turnIndex];
        room.wkmGame.targetId = targetPlayer.id;
        room.wkmGame.targetAnswer = null;
        room.wkmGame.guesses = {};
        
        // Pick random question
        const qObj = wkmQuestions[Math.floor(Math.random() * wkmQuestions.length)];
        room.wkmGame.currentQuestion = qObj.q;
        room.wkmGame.currentOptions = qObj.opts;

        // Phase 1: Target chooses answer
        io.to(roomCode).emit('wkmPhase1', {
            targetName: targetPlayer.name,
            targetId: targetPlayer.id,
            question: qObj.q,
            options: qObj.opts,
            scores: room.players.map(p => ({name: p.name, score: p.score}))
        });
    }

    socket.on('submitWkmTargetAnswer', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room || socket.id !== room.wkmGame.targetId) return;

        room.wkmGame.targetAnswer = data.answerIndex; // 0, 1, 2, or 3
        
        // Phase 2: Others start guessing
        io.to(data.roomCode).emit('wkmPhase2', {
            targetName: room.players.find(p => p.id === room.wkmGame.targetId).name
        });
    });

    socket.on('submitWkmGuess', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room || socket.id === room.wkmGame.targetId) return;

        room.wkmGame.guesses[socket.id] = data.guessIndex;

        io.to(data.roomCode).emit('wkmPlayerGuessedUpdate', Object.keys(room.wkmGame.guesses).length);

        // Check if everyone (except target) has guessed
        if(Object.keys(room.wkmGame.guesses).length === room.players.length - 1) {
            resolveWkmResults(io, data.roomCode, room);
        }
    });

    function resolveWkmResults(io, roomCode, room) {
        const targetId = room.wkmGame.targetId;
        const targetAns = room.wkmGame.targetAnswer;
        const targetPlayer = room.players.find(p => p.id === targetId);
        
        const correctGuessers = [];
        let correctCount = 0;

        room.players.forEach(p => {
            if(p.id !== targetId && room.wkmGame.guesses[p.id] === targetAns) {
                p.score += 20; // 20 points for right guess
                correctCount++;
                correctGuessers.push(p.name);
            }
        });

        // Target gets 5 points for every friend who knows them well
        if(targetPlayer) targetPlayer.score += (correctCount * 5);

        io.to(roomCode).emit('wkmResults', {
            targetName: targetPlayer.name,
            question: room.wkmGame.currentQuestion,
            options: room.wkmGame.currentOptions,
            correctAnswerIndex: targetAns,
            correctGuessers: correctGuessers,
            scores: room.players.map(p => ({name: p.name, score: p.score}))
        });

        // Advance Turn
        room.wkmGame.turnIndex = (room.wkmGame.turnIndex + 1) % room.players.length;
    }

    socket.on('nextWkmRound', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;
        startWkmRound(io, roomCode, room);
    });
};