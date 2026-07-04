const quizDatabase = [
    { q: "Konsa janwar apne pairo (feet) se taste karta hai?", opts: ["Saamp (Snake)", "Titli (Butterfly)", "Mendhak (Frog)", "Billi (Cat)"], ans: 1 },
    { q: "Inmein se kis superhero ke paas koi super-powers nahi hain?", opts: ["Spiderman", "Captain America", "Batman", "Wonder Woman"], ans: 2 },
    { q: "Duniya ka sabse chota desh (country) konsa hai?", opts: ["Maldives", "Monaco", "Vatican City", "Nepal"], ans: 2 },
    { q: "Konsa planet 'Red Planet' kehlata hai?", opts: ["Venus", "Mars", "Jupiter", "Saturn"], ans: 1 },
    { q: "Bina soche batao: 8 + 5 * 2 = ?", opts: ["26", "18", "21", "13"], ans: 1 },
    { q: "Humare body mein total kitni haddiyan (bones) hoti hain?", opts: ["206", "208", "212", "198"], ans: 0 },
    { q: "Kis janwar ke 3 dil (hearts) hote hain?", opts: ["Shark", "Whale", "Octopus", "Dolphin"], ans: 2 },
    { q: "Wifi ka full form kya hota hai?", opts: ["Wireless Fidelity", "Wireless Fiber", "Wired Fiber", "Koi full form nahi hai"], ans: 3 }, // Trick question! Wi-Fi doesn't actually stand for anything officially, though many think it's Wireless Fidelity.
    { q: "Instagram kab launch hua tha?", opts: ["2008", "2010", "2012", "2014"], ans: 1 },
    { q: "Kutte (Dogs) konsa color nahi dekh sakte?", opts: ["Red & Green", "Blue & Yellow", "Black & White", "Sab dekh sakte hain"], ans: 0 },
    { q: "Duniya mein sabse zyada boli jane wali language konsi hai?", opts: ["English", "Hindi", "Spanish", "Mandarin (Chinese)"], ans: 0 }, // English is #1 by total speakers currently
    { q: "Spider ke kitne pair (legs) hote hain?", opts: ["6", "8", "10", "12"], ans: 1 },
    { q: "Australia ki capital (rajdhani) kya hai?", opts: ["Sydney", "Melbourne", "Canberra", "Perth"], ans: 2 },
    { q: "Konsa bird peeche ki taraf (backwards) udh sakta hai?", opts: ["Eagle", "Hummingbird", "Sparrow", "Penguin"], ans: 1 },
    { q: "Burj Khalifa mein total kitne floors hain?", opts: ["154", "163", "172", "180"], ans: 1 },
    { q: "India ka National Animal kya hai?", opts: ["Lion", "Tiger", "Elephant", "Leopard"], ans: 1 },
    { q: "Ek din mein kitne seconds hote hain?", opts: ["86,400", "3,600", "1,440", "24,000"], ans: 0 },
    { q: "Harry Potter series mein total kitni movies hain?", opts: ["6", "7", "8", "9"], ans: 2 },
    { q: "Agar aap race mein 2nd aane wale ko peeche chodte ho, toh aap kis position par ho?", opts: ["1st", "2nd", "3rd", "Last"], ans: 1 }, // Trick!
    { q: "Titanic movie kis saal release hui thi?", opts: ["1995", "1997", "1999", "2001"], ans: 1 },
    { q: "Subah uthte hi Mummy ka sabse pehla aur sabse khatarnak weapon kaunsa hota hai?", 
        opts: ["Chappal", "Belan", "Tana (Taunt)", "Gussa"], ans: 3 },
    { q: "Dosto ke group mei 'Bhai kal pakka 100% paise de dunga' bolne wale ko kya kehte hain?", 
        opts: ["Harishchandra", "International Fraud", "Sachcha Dost", "Dhande ka Raja"], ans: 1 },
    { q: "Gym join karne ke pehle 3 din ke baad log aaine (mirror) mei kya dhundte hain?", 
        opts: ["Six Pack Abs", "Vazandari (Weight)", "Bodybuilt Shape", "Sirf Shakal"], ans: 3 },

    { q: "Gully cricket mei agar ball kisi ke gutter ya gande paani mei chali jaye, toh ball nikalne ki duty kiski hoti hai?", 
        opts: ["Ghar ke malik ki", "Batsman ki (Jisne maara woh nikala)", "Bowler ki", "Sabse chhote bachhe ki"], ans: 4 },
    { q: "Dosto mei sabse ganda aur 'Zinda Lash' jaisa munh se badbu kab aata hai?", 
        opts: ["Pyaaz khane ke baad", "Garlic khane ke baad", "Subah bina brush kiye chai peene par", "Gutter ke paas khade hone par"], ans: 2 },
    { q: "Train ya public washroom ka sabse ganda aur ghinnona sach kya hai?", 
        opts: ["Paani nahi hona", "Darwaza tuta hona", "Flushing na hona aur har jagah 'kachra' dikhna", "Light na hona"],    ans: 1 },
    { q: "Mumbai Local Train mei 'Fourth Seat' par baithne ke liye kya sabse zyaada zaroori hai?", 
        opts: ["Ticket", "Attitude", "Thodi si jagah aur jigar", "Roz ka pass"], 
        ans: 3 },
    { q: "College exams ke ek raat pehle har student kya karta hai?", 
        opts: ["Poori neend sota hai", "Summerize whole syllabus with AI", "Exam ki padhai", "Mummy se aashirwad leta hai"], 
        ans: 2 },
    { q: "Kisi bhi sarkari form ya UPSC ka form bharte waqt sabse bada headache kya hota hai?", 
        opts: ["Photo aur Signature ko KB size mei compress karna", "Naam likhna", "Address dalna", "OtP aana"], ans: 1 },
    { q: "Indian Toilet mei baithkar log sabse zyaada timepass kaise karte hain?", 
        opts: ["Paper padhke", "Reels aur Instagram scroll karke", "Gaana gake", "Soch vichaar karke"], ans: 4 },
    { q: "Pet saaf na hone par (Constipation) insaan toilet seat par baithkar kaunsa expression deta hai?", 
        opts: ["Singham Dynamic Look", "Heavy Weightlifter Face", "Rone wala face", "Smile face"], ans: 2},
    { q: "Public toilet ke darwaze ke peeche log aksar kya ajeeb kaam karte hain?", 
        opts: ["Shayari aur ajeeb phone numbers likhna", "Painting karna", "Saaf-safai", "Kuch nahi"], ans: 1},

    { q: "Bhartiya Samvidhan (Indian Constitution) ka Janak (Father) kise kaha jata hai?", 
        opts: ["Mahatma Gandhi", "Dr. B. R. Ambedkar", "Jawaharlal Nehru", "Sardar Patel"], ans: 1 },
    { q: "Vedic Mathematics mei 'Ekadhikena Purvena' sutra ka use aamtaur par kis cheez ke liye hota hai?", 
        opts: ["Subtractions", "Squares ending with 5 / Fast Calculations", "Divisions", "Algebra"], ans: 1 
    }
    // Backend can generate 20 more randomly!
];

module.exports = (io, socket, activeRooms) => {

    socket.on('startFastQuiz', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room || room.players.length < 2) return;

        startNextQuizRound(io, roomCode, room);
    });

    function startNextQuizRound(io, roomCode, room) {
        if(room.quizTimer) clearInterval(room.quizTimer);

        const currentQ = quizDatabase[Math.floor(Math.random() * quizDatabase.length)];
        
        room.quizGame = {
            question: currentQ.q,
            options: currentQ.opts,
            answerIndex: currentQ.ans,
            answersLocked: {}, // Format: { playerId: { ans: 2, timeRemaining: 12 } }
            timeLeft: 15
        };

        io.to(roomCode).emit('loadFastQuiz', {
            question: room.quizGame.question,
            options: room.quizGame.options,
            scores: room.players.map(p => ({name: p.name, score: p.score}))
        });

        room.quizTimer = setInterval(() => {
            room.quizGame.timeLeft--;
            io.to(roomCode).emit('quizTimeUpdate', room.quizGame.timeLeft);

            if(room.quizGame.timeLeft <= 0) {
                clearInterval(room.quizTimer);
                evaluateQuizResults(io, roomCode, room);
            }
        }, 1000);
    }

    socket.on('submitQuizAnswer', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room || !room.quizGame || room.quizGame.timeLeft <= 0) return;
        
        // Agar pehle se answer de diya hai toh ignore karo
        if(room.quizGame.answersLocked[socket.id]) return;

        // Save answer and the EXACT time remaining for speed bonus
        room.quizGame.answersLocked[socket.id] = {
            ans: data.answerIndex,
            timeRemaining: room.quizGame.timeLeft
        };

        // Notify room that someone locked in (increases tension)
        io.to(data.roomCode).emit('quizPlayerLocked', Object.keys(room.quizGame.answersLocked).length);

        // Agar sabne answer de diya, end timer early!
        if(Object.keys(room.quizGame.answersLocked).length === room.players.length) {
            clearInterval(room.quizTimer);
            evaluateQuizResults(io, data.roomCode, room);
        }
    });

    function evaluateQuizResults(io, roomCode, room) {
        const correctAns = room.quizGame.answerIndex;
        const roundResults = [];

        room.players.forEach(p => {
            const playerLock = room.quizGame.answersLocked[p.id];
            let pointsGained = 0;
            let status = "Did not answer ⏳";

            if (playerLock) {
                if (playerLock.ans === correctAns) {
                    // Correct! Base 10 pts + Speed Bonus (timeRemaining * 2)
                    pointsGained = 10 + (playerLock.timeRemaining * 2);
                    p.score += pointsGained;
                    status = `CORRECT (+${pointsGained}) ⚡`;
                } else {
                    // Wrong! Minus 10 points
                    p.score -= 10;
                    pointsGained = -10;
                    status = "WRONG (-10) ❌";
                }
            } else {
                p.score -= 5; // Penalty for sleeping
            }

            roundResults.push({
                name: p.name,
                points: pointsGained,
                status: status,
                time: playerLock ? (15 - playerLock.timeRemaining) : 15 // Seconds taken
            });
        });

        // Sort round results by highest points gained this round
        roundResults.sort((a, b) => b.points - a.points);

        io.to(roomCode).emit('quizResultsOver', {
            correctAnswerIndex: correctAns,
            roundResults: roundResults,
            scores: room.players.map(p => ({name: p.name, score: p.score}))
        });
    }

    socket.on('nextQuizRound', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;
        startNextQuizRound(io, roomCode, room);
    });
};