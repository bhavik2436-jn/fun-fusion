const cyberCards = [
    // 🟢 GOOD CARDS (Assets)
    { name: "Golden Server Rack 🖥️", value: 50, type: "good" },
    { name: "Encrypted Bitcoin ₿", value: 40, type: "good" },
    { name: "Stealth Cloak Drive 🕶️", value: 35, type: "good" },
    { name: "Diamond Core 💎", value: 30, type: "good" },
    { name: "AI Companion Core 🤖", value: 30, type: "good" },
    { name: "Master Password Key 🗝️", value: 25, type: "good" },
    { name: "Quantum Chip 🧠", value: 20, type: "good" },
    { name: "Neural Link Module 🌐", value: 20, type: "good" },
    { name: "Hyper-Speed SSD 💾", value: 20, type: "good" },
    { name: "Cybernetic Upgrade 🦾", value: 15, type: "good" },
    { name: "Unlimited Wi-Fi Router 📡", value: 15, type: "good" },
    { name: "Rare Scrap Metal ⚙️", value: 10, type: "good" },

    // 🔴 BAD CARDS (Threats)
    { name: "Dead Battery Pack 🪫", value: -5, type: "bad" },
    { name: "Fake Gold Coin 🪙", value: -10, type: "bad" },
    { name: "Phishing Link Spam 🎣", value: -10, type: "bad" },
    { name: "Burned Motherboard 🔥", value: -15, type: "bad" },
    { name: "Corrupted Save File ❌", value: -15, type: "bad" },
    { name: "Toxic Cyber Waste ☣️", value: -20, type: "bad" },
    { name: "Stolen Data Drive 🚨", value: -25, type: "bad" },
    { name: "System Glitch Virus 👾", value: -30, type: "bad" },
    { name: "EMP Blast Grenade 💣", value: -35, type: "bad" },
    { name: "Ransomware Trojan 💀", value: -40, type: "bad" }
];

module.exports = (io, socket, activeRooms) => {
    
    socket.on('startBluffBattle', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;
        if(room.players.length < 2) return socket.emit('errorMsg', 'Bluff Battle ke liye kam se kam 2 players chahiye!');

        // Har round mein cards reset aur distribute honge
        room.bluffGame = {
            turnIndex: 0,
            attackerId: room.players[0].id,
            targetId: null,
            secretCard: null,
            declaredCardName: ""
        };

        sendNewRoundData(io, roomCode, room);
    });

    function sendNewRoundData(io, roomCode, room) {
        const attacker = room.players[room.bluffGame.turnIndex];
        room.bluffGame.attackerId = attacker.id;

        // Sabko randomly ek-ek card distribute karo
        room.players.forEach(p => {
            p.currentBluffCard = cyberCards[Math.floor(Math.random() * cyberCards.length)];
        });

        room.players.forEach(p => {
            io.to(p.id).emit('loadBluffHub', {
                isMyTurn: (p.id === attacker.id),
                attackerName: attacker.name,
                myCard: p.currentBluffCard,
                playersList: room.players.filter(pl => pl.id !== attacker.id).map(pl => ({id: pl.id, name: pl.name})),
                allCardOptions: cyberCards.map(c => c.name),
                scores: room.players.map(pl => ({name: pl.name, score: pl.score}))
            });
        });
    }

    socket.on('submitBluffAttack', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room || !room.bluffGame) return;

        const attacker = room.players.find(p => p.id === socket.id);
        room.bluffGame.targetId = data.targetId;
        room.bluffGame.secretCard = attacker.currentBluffCard;
        room.bluffGame.declaredCardName = data.declaredCardName;

        // Sirf target player ko action screen dikhao
        io.to(data.targetId).emit('bluffChallengeReceived', {
            attackerName: attacker.name,
            declaredCard: data.declaredCardName
        });

        // Baaki poore room ko waiting screen dikhao
        room.players.forEach(p => {
            if(p.id !== data.targetId) {
                io.to(p.id).emit('bluffWaitingForTarget', {
                    attackerName: attacker.name,
                    targetName: room.players.find(pl => pl.id === data.targetId).name,
                    declaredCard: data.declaredCardName
                });
            }
        });
    });

    socket.on('resolveBluffAction', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room || !room.bluffGame) return;

        const attacker = room.players.find(p => p.id === room.bluffGame.attackerId);
        const target = room.players.find(p => p.id === room.bluffGame.targetId);
        const actualCard = room.bluffGame.secretCard;
        const declared = room.bluffGame.declaredCardName;

        let isBluffing = (actualCard.name !== declared);
        let resultMsg = "";
        let winnerId = "";

        if (data.action === 'challenge') {
            // Target ne kah ki tum jhooth bol rahe ho!
            if (isBluffing) {
                // Jhooth pakda gaya! Target wins.
                target.score += 25;
                attacker.score -= 15;
                winnerId = target.id;
                resultMsg = `🚨 JHOOTH PAKDA GAYA! ${attacker.name} bluff kar raha tha! Uske paas sach mein ${actualCard.name} tha.`;
            } else {
                // Attacker sach bol raha tha! Attacker wins.
                attacker.score += 25;
                target.score -= 15;
                winnerId = attacker.id;
                resultMsg = `⚡ TRUTHFUL ATTACK! ${attacker.name} sach bol raha tha! Uske paas sach mein ${actualCard.name} tha. ${target.name} ka challenge fail hua!`;
            }
        } else {
            // Target ne card trust karke accept kar liya
            target.score += actualCard.value; // Card ki value add/subtract hogi
            winnerId = target.id;
            resultMsg = `🤝 TRUSTED! ${target.name} ne card accept kar liya. Card tha: ${actualCard.name} (Value: ${actualCard.value} pts)`;
        }

        io.to(data.roomCode).emit('bluffRoundOver', {
            resultMsg: resultMsg,
            scores: room.players.map(pl => ({name: pl.name, score: pl.score}))
        });

        // Turn badlo agle player ke liye
        room.bluffGame.turnIndex = (room.bluffGame.turnIndex + 1) % room.players.length;
    });

    socket.on('nextBluffRound', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;
        sendNewRoundData(io, roomCode, room);
    });
};