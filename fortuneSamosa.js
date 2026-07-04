const roastFortunes = [
    "ki shadi mein dulhan ki jagah uski college ki IT proxy sheet bhaag kar aayegi! 📋💍",
    "ko aane wale waqt mein ek aisa ganda gaddhi (scraps) ka business milega jisme yeh raaton-raat ameer banega par nahana bhool jayega! 🗑️💰",
    "ka browser history galti se pure khandaan ke WhatsApp group mein leak ho jayega! 🕵️‍♂️💀",
    "gym mein itna heavy protein powder khayega ki iske muscles toh nahi, par iska dimaag ekdum baans (bamboo) jaisa ho jayega! 💪🌱",
    "cricket match mein pehli ball pe dhoor se clean-bold hoga par galti se umpire par hi bat phek dega! 🏏❌",
    "bina nahaaye ek mahina guzaar dega aur doston ko lagega ki room mein koi bhoot mar gaya hai! 🤢👻",
    "raaton-raat ek aisa software banayega jo doston ke phone se chupke se paise uda kar khud pizza party karega! 🍕💻",
    "apne crush ko 'I love you' bolne jayega par gusse mein uske papa ko bol kar maar khayega! 🏃‍♂️🥊",
    "aane wale waqt mein itna bada fattu banega ki horror movie ka poster dekh kar bhi bed ke niche chup jayega! 🛌👾",
    "apne doston ko ek ladki/ladke ke liye ₹10 ki pani puri ki shart par sabse pehle dhokha dega! 💔😋",
    "exam mein poori micro-cheating ki chits lekar jayega par galti se apni mummy ki grocery list supervisor ko de aayega! 📝🛒",
    "ka dimaag hamesha double meaning baaton mein itna tez chalega ki isko jail mein bhi ek alag cell diya jayega! 🧠🏢",
    "gusse mein itni gandi gaaliyan dega ki dosto ke kaan se bluetooth signals nikalne lagenge! 🤬🔌",
    "free ka khana khane ke liye dushman ki shadi mein bhi catering ka kurta pehen kar ghuss jayega! 🍛🤵",
    "hamesha plan banakar last minute cancel karega aur ek din iske dost isko kidnap karke pahadon pe chhod aayenge! 🏔️🚗",
    "roz subah mirror ke samne 2 ghante over-acting karega par real life mein ek machhar dekh kar bhi ro dega! 🪞🦟",
    "internet par itna fake gyaan pelega ki Wikipedia iske naam par ban (block) lagane ka naya rule nikalega! 🤓🚫",
    "agale 5 saal mein ameer toh banega par itna kanjoos hoga ki doston ko bday par sirf paani pilayega! 💧💰",
    "ek aisi gaadi khareedega jisme break nahi hoga aur roz Goregaon ke signal par police se danda khayega! 🚗👮‍♂️",
    "apne poore group mein sabse pehle shadi karke ghar-jamai banega aur bartan dhoyega! 🧹🧼"
];

module.exports = (io, socket, activeRooms) => {
    
    socket.on('startFortuneSamosa', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;

        const isSolo = room.players.length === 1;
        // Kisi ek random player ko Target banao roast karne ke liye
        const targetPlayer = room.players[Math.floor(Math.random() * room.players.length)];
        const randomPrediction = roastFortunes[Math.floor(Math.random() * roastFortunes.length)];

        room.samosaGame = {
            targetId: targetPlayer.id,
            targetName: targetPlayer.name,
            predictionText: `🔮 PREDICTION FOR <b>${targetPlayer.name}</b>: ${randomPrediction}`,
            votes: {}, // socketId -> 'WILL_HAPPEN' or 'NO_WAY'
            timeLeft: 20,
            isSolo: isSolo
        };

        // Solo Mode mein directly user ke name par custom predict text banao
        if (isSolo) {
            room.samosaGame.predictionText = `🔮 PREDICTION FOR <b>${targetPlayer.name}</b>: ${randomPrediction}`;
        }

        io.to(roomCode).emit('loadFortuneSamosaUI', {
            prediction: room.samosaGame.predictionText,
            targetName: room.samosaGame.targetName,
            isSolo: isSolo
        });

        // 20 Seconds Destiny Timer
        room.samosaTimer = setInterval(() => {
            room.samosaGame.timeLeft--;
            io.to(roomCode).emit('samosaTimeUpdate', room.samosaGame.timeLeft);

            if(room.samosaGame.timeLeft <= 0) {
                clearInterval(room.samosaTimer);
                revealSamosaDestiny(io, roomCode, room);
            }
        }, 1000);
    });

    socket.on('submitSamosaVote', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room || !room.samosaGame) return;

        room.samosaGame.votes[socket.id] = data.vote; // 'WILL_HAPPEN' / 'NO_WAY'

        // Agar sabne bet laga di toh direct open karo destiny
        if(Object.keys(room.samosaGame.votes).length === room.players.length) {
            clearInterval(room.samosaTimer);
            revealSamosaDestiny(io, data.roomCode, room);
        }
    });

    function revealSamosaDestiny(io, roomCode, room) {
        let verdictHTML = "";
        
        if (room.samosaGame.isSolo) {
            // Solo Mode: Samosa Bot comments brutally
            const toxicReplies = [
                "🤖 Bot Samosa says: 100% Sach hoga! Apne stars kharab hain bhai tumhare.",
                "🤖 Bot Samosa says: Bhagwan bachaaye is kismat se! Canteen ka bill bharo pehle.",
                "🤖 Bot Samosa says: Mujhe toh lagta hai yeh aane wale mangalwar ko hi ho jayega! 💀",
                "🤖 Bot Samosa says: 0% Chance. Itni acchi kismat kahan tumhari!"
            ];
            verdictHTML = `<p style="color: #f59e0b; font-size:18px;">${toxicReplies[Math.floor(Math.random() * toxicReplies.length)]}</p>`;
        } else {
            // Multiplayer Mode: Count how many friends voted for destruction vs survival
            let happenCount = 0;
            let noWayCount = 0;
            
            for(let id in room.samosaGame.votes) {
                if(room.samosaGame.votes[id] === 'WILL_HAPPEN') happenCount++;
                else noWayCount++;
            }
            
            verdictHTML = `
                <div style="text-align:left; font-family:monospace; font-size:15px; color:#a1a1aa;">
                    > Pack Opinion Split:<br>
                    - Destined to happen (Barbadi): <b style="color:#ef4444;">${happenCount} Friends</b><br>
                    - No way (Bach gaya): <b style="color:#10b981;">${noWayCount} Friends</b><br><br>
                    📢 <b>Final Verdict:</b> ${happenCount >= noWayCount ? "🔴 Samosa Has Spoken! Destined to be ROASTED!" : "🟢 Saved by the squad grid!"}
                </div>
            `;
        }

        // Give dynamic mystery points
        room.players.forEach(p => p.score += Math.floor(Math.random() * 20) + 10);

        io.to(roomCode).emit('samosaVerdict', {
            verdict: verdictHTML,
            scores: room.players.map(pl => ({ name: pl.name, score: pl.score }))
        });
    }
};