const socket = io();

// ==========================================
// 📊 STATE VARIABLES
// ==========================================
let amIHost = false;
let currentRoomCode = '';
let myName = ''; 
let mySymbol = ''; 
let heartInterval; 
let secretClickCount = 0; 
let secretTimer;

// ==========================================
// 🎵 AUDIO SYSTEM & UI SWITCHER
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const clickAudio = new Audio('/assets/click.mp3');
const magicAudio = new Audio('/assets/magic.mp3');

function playClick() { try { clickAudio.currentTime = 0; clickAudio.play().catch(e=>console.log(e)); } catch(e){} }
function playMagicSound() { try { magicAudio.currentTime = 0; magicAudio.play().catch(e=>console.log(e)); } catch(e){} }

// Code-Generated Sound System (No MP3 needed!)
function playBeep(frequency = 600, duration = 0.1, type = 'sine') {
    try {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
        oscillator.stop(audioCtx.currentTime + duration);
    } catch(e) { console.log("Beep error:", e); }
}

// Cinematic Slam Sound for Reveal
function playSlamSound() {
    try {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.5);
    } catch(e) {}
}

socket.on('connect', () => console.log("🟢 Frontend backend se connect ho gaya hai!"));

// ==========================================
// 📱 CLIENT-SIDE SOCKET RECEIVERS (SYNC & CHAT)
// ==========================================

// 1. Jab host back to menu/lobby dabaye toh sabko sync karo
socket.on('redirectToLobby', () => {
    console.log("Host redirected to lobby. Syncing layout...");
    
    // Agar bikhra layout hai toh reset to lobby view
    if (typeof switchView === "function") {
        switchView('waiting-room-view'); // Tumhare panel view code ke mutabik
    } else {
        const gameBoard = document.getElementById('game-board-view');
        const waitingRoom = document.getElementById('waiting-room-view');
        if (gameBoard) gameBoard.style.display = 'none';
        if (waitingRoom) waitingRoom.style.display = 'block';
    }
    
    // Reset individual game tracking parameters
    if (typeof resetLocalGameStates === "function") resetLocalGameStates();
});

// 2. Chat message template receiver 
socket.on('receiveLobbyMessage', (data) => {
    const chatBox = document.getElementById('lobby-chat-messages');
    if (chatBox) {
        const msgElement = document.createElement('div');
        msgElement.style.margin = "5px 0";
        msgElement.style.fontSize = "14px";
        msgElement.innerHTML = `<strong style="color: #3b82f6;">${data.sender}:</strong> <span style="color: #fff;">${data.message}</span> <span style="color: #666; font-size: 10px; float: right;">${data.time}</span>`;
        chatBox.appendChild(msgElement);
        chatBox.scrollTop = chatBox.scrollHeight; // Automatic scroll down to latest message
    }
});

// 3. Trigger function message transmit karne ke liye (Lobby Chat Input handler)
function sendGroupMessage() {
    const inputField = document.getElementById('lobby-chat-input');
    if (!inputField || !inputField.value.trim()) return;
    
    if (typeof playClick === "function") playClick(); // Sound click trigger
    
    socket.emit('sendLobbyMessage', {
        roomId: currentRoomCode || '', // Tumhara current room tracking variable
        sender: myName || 'Anonymous', // Tumhara user identification variable
        message: inputField.value.trim()
    });
    
    inputField.value = ''; // Box clear karo text bhejte hi
}

function switchView(viewId) {
    const panels = document.querySelectorAll('.view-panel');
    panels.forEach(panel => panel.classList.add('hidden'));
    const targetPanel = document.getElementById(viewId);
    if(targetPanel) targetPanel.classList.remove('hidden');
}

// 💖 THE SECRET PROPOSAL EASTER EGG TRIGGER
function triggerSecretProposal() {
    secretClickCount++;
    
    // Agar tap ke beech mein 2 second ka gap ho gaya, toh counter reset (taaki galti se na khule)
    clearTimeout(secretTimer);
    secretTimer = setTimeout(() => { secretClickCount = 0; }, 2000);

    // Agar exactly 3 baar tap kiya, toh Jadoo shuru!
    if (secretClickCount === 3) {
        playMagicSound();
        switchView('proposal-view');
        openEnvelope();
        secretClickCount = 0; 
    }
}

// ==========================================
// 🌐 MULTIPLAYER ROOM LOGIC
// ==========================================
function createRoom() {
    myName = document.getElementById('playerName').value.trim(); 
    if (!myName) return alert("Bhai, pehle apna naam toh likho!");
    socket.emit('createRoom', myName);
}

function joinRoom() {
    myName = document.getElementById('playerName').value.trim(); 
    const code = document.getElementById('joinCode').value.trim();
    if (!myName) return alert("Pehle apna naam likho!");
    if (code.length !== 4) return alert("Sahi 4-digit code daalo!");
    socket.emit('joinRoom', { playerName: myName, roomCode: code });
}

socket.on('roomCreated', (data) => setupWaitingRoom(data.roomCode, data.players, true));
socket.on('roomJoined', (data) => setupWaitingRoom(data.roomCode, data.players, false));
socket.on('updatePlayersList', (players) => updatePlayersUI(players));
socket.on('errorMsg', (msg) => alert(msg));

function setupWaitingRoom(code, players, isHost) {
    currentRoomCode = code; amIHost = isHost;       
    document.getElementById('display-room-code').innerText = code;
    if (isHost) {
        document.getElementById('start-game-btn').classList.remove('hidden');
        document.getElementById('waiting-host-msg').classList.add('hidden');
    } else {
        document.getElementById('start-game-btn').classList.add('hidden');
        document.getElementById('waiting-host-msg').classList.remove('hidden');
    }
    updatePlayersUI(players);
    switchView('waiting-room-view');
}

function updatePlayersUI(players) {
    document.getElementById('player-count').innerText = players.length;
    const list = document.getElementById('players-list');
    list.innerHTML = ''; 
    players.forEach(p => {
        const hostTag = p.isHost ? '<span style="color:#eab308; font-size:12px; float:right;">[HOST]</span>' : '';
        list.innerHTML += `<li style="padding: 8px; border-bottom: 1px solid #444;">👤 ${p.name} ${hostTag}</li>`;
    });
}

// ==========================================
// 🎮 GAME LAUNCH HUB (Menu)
// ==========================================
function startGame() { socket.emit('startGame', currentRoomCode); }

socket.on('gameStarted', () => {
    switchView('game-board-view');
    renderGameHub();
});

// Dynamic Rule Button Injector (Call this inside game load events if needed)
function renderUniversalInfoButton() {
    return `<button class="info-trigger-btn" onclick="openRulesModal()">?</button>`;
}

function renderGameHub() {
    const gameContent = document.getElementById('game-content');
    document.getElementById('current-game-title').innerText = "🎮 Game Hub";
    
    if (amIHost) {
        gameContent.innerHTML = `
            <h3 style="color: var(--accent-blue); margin-bottom: 15px;">Welcome, Host! 👑</h3>
            <p style="margin-bottom: 20px; color: #a1a1aa;">Konsi game khelna chahte ho?</p>
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <button class="menu-btn btn-green" onclick="playClick(); launchWordSniper()">🎯 Word Sniper</button>
                <button class="menu-btn btn-blue" onclick="playClick(); launchTicTacToe()">❌⭕ Tic-Tac-Toe</button>
                <button class="menu-btn btn-romantic" onclick="playClick(); socket.emit('launchBlindDeal', currentRoomCode)">💰 The Blind Deal</button>
                <button class="menu-btn" style="background-color: #7c3aed; color: white;" onclick="playClick(); socket.emit('startSecretMission', currentRoomCode)">🕵️‍♂️ Secret Mission (Spy)</button>
                <button class="menu-btn" style="background: linear-gradient(45deg, #ec4899, #8b5cf6); color: white; box-shadow: 0 0 15px rgba(236,72,153,0.4);" onclick="playClick(); socket.emit('startBluffBattle', currentRoomCode)">🃏 Bluff Battle (Cyber)</button>
                <button class="menu-btn" style="background: linear-gradient(45deg, #f97316, #facc15); color: black; box-shadow: 0 0 15px rgba(249,115,22,0.4);" onclick="playClick(); socket.emit('startDrawAndGuess', currentRoomCode)">🎨 Draw & Guess</button>
                <button class="menu-btn" style="background: linear-gradient(90deg, #b91c1c, #000000); color: white; border: 1px solid #ef4444;" onclick="playClick(); socket.emit('startExpose', currentRoomCode)">🎯 The Exposé</button>

                <button class="menu-btn" style="background: linear-gradient(90deg, #ef4444, #3b82f6); color: white; font-weight: bold;" onclick="playClick(); socket.emit('startWyr', currentRoomCode)">🔴 Would You Rather 🔵</button>

                <button class="menu-btn" style="background: linear-gradient(45deg, #4f46e5, #9333ea); color: white; box-shadow: 0 0 15px rgba(147,51,234,0.4);" onclick="playClick(); socket.emit('startWkm', currentRoomCode)">👥 Who Knows Me?</button>
                <button class="menu-btn" style="background: linear-gradient(45deg, #facc15, #f97316); color: black; box-shadow: 0 0 15px rgba(249,115,22,0.4);" onclick="playClick(); socket.emit('startEmojiStory', currentRoomCode)">📖 Emoji Story</button>

                <button class="menu-btn" style="background: linear-gradient(90deg, #0ea5e9, #0284c7); color: white; border: 1px solid #38bdf8;" onclick="playClick(); socket.emit('startFastQuiz', currentRoomCode)">⚡ Fast Quiz (Speed Race)</button>
                <button class="menu-btn" style="background: linear-gradient(90deg, #064e3b, #000000); color: white; border: 1px solid #10b981;" onclick="playClick(); socket.emit('startTol', currentRoomCode)">🤥 Truth or Lie</button>

                <button class="menu-btn" style="background: #000; color: #10b981; border: 1px solid #10b981; font-family: monospace; box-shadow: 0 0 10px rgba(16,185,129,0.3);" onclick="playClick(); socket.emit('startMathHacker', currentRoomCode)">🧑‍💻 Vault Hacker</button>


                <button class="menu-btn" style="background: linear-gradient(90deg, #facc15, #f97316); color: black; border: 1px solid #facc15; font-family: monospace; box-shadow: 0 0 10px rgba(249,115,22,0.3);" onclick="playClick(); socket.emit('startMindReader', currentRoomCode)">🧠 Mind Reader</button>
                <button class="menu-btn" style="background: #000; color: #ef4444; border: 1px solid #ef4444; box-shadow: 0 0 12px rgba(239,68,68,0.3);" onclick="playClick(); socket.emit('startLieDetector', currentRoomCode)">🤥 Lie Detector AI</button>
                <button class="menu-btn" style="background: #000; color: #34d399; border: 1px solid #34d399; box-shadow: 0 0 12px rgba(52,211,153,0.3);" onclick="playClick(); socket.emit('startParadox', currentRoomCode)">🤷‍♂️ Paradox AI</button>
                <button class="menu-btn" style="background: #000; color: #eab308; border: 1px solid #eab308; box-shadow: 0 0 12px rgba(234,179,8,0.3);" onclick="playClick(); socket.emit('startFlashBuzz', currentRoomCode)">⚡ Flash Buzz AI</button>
                <button class="menu-btn" style="background: linear-gradient(45deg, #b45309, #78350f); color: #fff; box-shadow: 0 0 15px rgba(245,158,11,0.5); font-weight: bold;" onclick="playClick(); socket.emit('startFortuneSamosa', currentRoomCode)">🔮 Fortune Samosa</button>

            </div>
        `;
    } else {
        gameContent.innerHTML = `
            <h3 style="color: var(--accent-green);">Ready? Set? GO! 🚀</h3>
            <p style="margin-top: 15px; color: #a1a1aa;">Host nayi game select kar raha hai...</p>
        `;
    }
}

function renderScoreboard(scores) {
    let html = `<div style="margin-bottom: 20px; padding: 10px; background: #1e1e24; border-radius: 6px; display: flex; justify-content: space-around; font-size: 14px; border: 1px solid #333;">`;
    scores.forEach(s => { html += `<span>👤 <b>${s.name}</b>: ${s.score} pts</span>`; });
    html += `</div>`;
    return html;
}

// ==========================================
// 💰 THE BLIND DEAL LOGIC (Fun Group Version)
// ==========================================
socket.on('blindDealSetup', () => {
    document.getElementById('current-game-title').innerText = "📊 Live Trading Terminal";
    const gameContent = document.getElementById('game-content');
    
    if (amIHost) {
        gameContent.innerHTML = `
            <div class="trading-panel" style="text-align: center;">
                <h3 style="color: #eab308; text-transform: uppercase; letter-spacing: 2px;">Create Market Contract</h3>
                <p style="color: #a1a1aa; font-size: 13px; margin-bottom: 20px;">Set the fun bet/item and your secret target points.</p>
                
                <div style="text-align: left; max-width: 300px; margin: 0 auto;">
                    <label style="color: #3b82f6; font-size: 12px; font-weight: bold;">FUN BET / ITEM</label>
                    <input list="fun-items-list" id="dealItem" placeholder="Select or type your own..." class="input-field" style="margin-bottom: 15px; font-family: monospace;">
                    
                    <datalist id="fun-items-list">
                        <option value="Pizza party for the whole squad 🍕">
                        <option value="Unlimited Pani Puri challenge sponsor 😋">
                        <option value="Sponsoring gym protein powder for a month 💪">
                        <option value="New cricket bat for the upcoming match 🏏">
                        <option value="One month of Netflix Premium 🎬">
                        <option value="Doing my college practical assignments for a week 📚">
                        <option value="Buying me a new mechanical keyboard ⌨️">
                        <option value="Treating everyone to midnight Maggi & Chai ☕">
                        <option value="Dinner treat at a fancy place 🍽️">
                        <option value="Paying for the next trip's hotel booking 🏖️">
                        <option value="Loser does the winner's chores for a day 🧹">
                        <option value="Buying me the latest AAA video game 🎮">
                        <option value="Paying my cafe bill for the next 3 times ☕">
                    </datalist>
                    
                    <label style="color: #10b981; font-size: 12px; font-weight: bold;">SECRET TARGET PRICE / POINTS</label>
                    <input type="number" id="targetPrice" placeholder="Enter Amount" class="input-field" style="margin-bottom: 25px; font-family: monospace; font-size: 18px;">
                </div>
                
                <button class="menu-btn btn-green" onclick="playClick(); startBidding()" style="box-shadow: 0 0 15px rgba(16,185,129,0.4);">OPEN MARKET (30s) 📈</button>
            </div>
        `;
    } else {
        gameContent.innerHTML = `
            <div style="text-align: center; margin-top: 30px;">
                <h1 style="font-size: 50px; animation: pulse 1s infinite;">🏢</h1>
                <h3 style="color: #3b82f6; margin-top: 15px; text-transform: uppercase;">Market is Closed</h3>
                <p class="market-ticker" style="margin-top: 10px;">Waiting for Host to list a contract...</p>
            </div>
        `;
    }
});

function startBidding() {
    const item = document.getElementById('dealItem').value.trim();
    const price = document.getElementById('targetPrice').value.trim();
    if(!item || !price) return alert("Bhai, item aur price dono zaroori hain!");
    socket.emit('startBlindDealBidding', { roomCode: currentRoomCode, item: item, price: price });
}

socket.on('blindDealBiddingStarted', (data) => {
    const gameContent = document.getElementById('game-content');
    const timerUI = `
        <div style="margin: 10px auto; background: #000; border: 2px solid #ef4444; border-radius: 5px; width: 80px; padding: 5px;">
            <span id="deal-timer" style="color: #ef4444; font-size: 28px; font-weight: bold; font-family: monospace;">30</span><span style="color: #ef4444; font-size: 12px;">s</span>
        </div>
    `;

    if (amIHost) {
        gameContent.innerHTML = `
            <div class="trading-panel" style="text-align: center;">
                <div class="market-ticker">● LIVE QUOTATIONS FOR: ${data.item.toUpperCase()}</div>
                ${timerUI}
                <p style="color: #a1a1aa; font-size: 12px; border-bottom: 1px solid #333; padding-bottom: 10px;">Monitor incoming bids and guide the market.</p>
                <ul id="live-bids-list" style="list-style: none; padding: 0; margin-top: 10px; max-height: 250px; overflow-y: auto;"></ul>
            </div>
        `;
    } else {
        gameContent.innerHTML = `
            <div class="trading-panel" style="text-align: center; transition: background-color 0.3s;" id="trader-dashboard">
                <div class="market-ticker" style="color: #10b981;">● MARKET OPEN</div>
                ${timerUI}
                <h3 style="color: #eab308; font-size: 20px; text-transform: uppercase; margin-bottom: 5px;">${data.item}</h3>
                <div style="background: #000; padding: 15px; border-radius: 8px; border: 1px solid #222; margin-bottom: 15px;">
                    <span style="color: #10b981; font-size: 24px; font-weight: bold; vertical-align: middle;">₹</span>
                    <input type="number" id="myBid" placeholder="0" class="input-field" style="width: 200px; display: inline-block; margin: 0; font-family: monospace; font-size: 24px; text-align: right; background: transparent; border: none; border-bottom: 2px solid #333; border-radius: 0;">
                </div>
                <button class="menu-btn btn-blue" style="max-width: 200px; margin: 0 auto;" onclick="playClick(); submitDealBid()">SEND QUOTATION 📤</button>
                <div id="bid-feedback-msg" style="margin-top: 15px; font-family: monospace; font-size: 14px; height: 25px;"></div>
            </div>
        `;
    }
});

socket.on('marketTimerUpdate', (timeLeft) => {
    const timerElement = document.getElementById('deal-timer');
    if(timerElement) {
        timerElement.innerText = timeLeft;
        if(timeLeft <= 5 && timeLeft > 0) {
            playBeep(800, 0.1, 'square'); 
            timerElement.style.color = 'yellow';
            if(timeLeft % 2 !== 0) timerElement.style.opacity = '0.5';
            else timerElement.style.opacity = '1';
        } else if (timeLeft > 0) {
            playBeep(400, 0.05, 'sine'); 
        }
    }
});

socket.on('marketTimeout', (data) => {
    playBeep(200, 1.5, 'sawtooth'); 
    document.getElementById('game-content').innerHTML = `
        <div class="trading-panel" style="text-align: center; border-color: #ef4444; box-shadow: 0 0 30px rgba(239,68,68,0.2);">
            <h1 style="font-size: 60px; margin-bottom: 10px;">📉</h1>
            <h2 style="color: #ef4444; font-size: 32px; margin-bottom: 15px; text-transform: uppercase;">Market Closed!</h2>
            <p style="color: #a1a1aa; font-size: 16px;">Time ran out for <b>${data.item}</b>.</p>
            <p style="color: #eab308; font-size: 18px; margin: 15px 0;">No deal was finalized. ❌</p>
            <br>
            ${amIHost ? `<button class="menu-btn btn-blue" onclick="playClick(); renderGameHub()">RETURN TO MENU ⬅️</button>` : `<p class="market-ticker">Awaiting next market cycle...</p>`}
        </div>
    `;
});

function submitDealBid() {
    const bidAmount = document.getElementById('myBid').value.trim();
    if(!bidAmount) return;
    socket.emit('submitBid', { roomCode: currentRoomCode, playerName: myName, bidAmount: bidAmount });
}

socket.on('bidSentAck', () => {
    document.getElementById('bid-feedback-msg').innerHTML = '<span style="color: #3b82f6; animation: pulse 1s infinite;">Transmitting... 📡</span>';
});

socket.on('newBidReceived', (data) => {
    if(!amIHost) return;
    const list = document.getElementById('live-bids-list');
    const li = document.createElement('li');
    li.style = "background: #111; padding: 15px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #3b82f6; text-align: left;";
    li.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 14px; color: #a1a1aa;">Player: <b>${data.playerName}</b></span>
            <span style="font-size: 20px; color: #10b981; font-family: monospace; font-weight: bold;">₹${data.bidAmount}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
            <button onclick="playClick(); sendFeedback('${data.playerId}', 'high', ${data.bidAmount}, this.parentElement.parentElement)" style="padding: 8px; background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid #ef4444; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">📈 TOO HIGH</button>
            <button onclick="playClick(); sendFeedback('${data.playerId}', 'low', ${data.bidAmount}, this.parentElement.parentElement)" style="padding: 8px; background: rgba(59,130,246,0.2); color: #3b82f6; border: 1px solid #3b82f6; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">📉 TOO LOW</button>
            <button onclick="playClick(); sendFeedback('${data.playerId}', 'deal', ${data.bidAmount}, this.parentElement.parentElement)" style="padding: 8px; background: #10b981; color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">🤝 LOCK DEAL</button>
        </div>
    `;
    list.prepend(li);
});

function sendFeedback(playerId, type, amount, liElement) {
    socket.emit('sendBidFeedback', { roomCode: currentRoomCode, playerId: playerId, feedbackType: type, bidAmount: amount });
    if(type !== 'deal') {
        liElement.style.opacity = '0.4'; 
        liElement.style.pointerEvents = 'none';
        liElement.style.borderLeft = "4px solid #444";
    }
}

socket.on('bidFeedback', (type) => {
    const feedbackDiv = document.getElementById('bid-feedback-msg');
    const dashboard = document.getElementById('trader-dashboard');
    dashboard.classList.remove('flash-red', 'flash-green');
    void dashboard.offsetWidth; 
    
    if(type === 'high') {
        dashboard.classList.add('flash-red');
        feedbackDiv.innerHTML = '<span style="color: #ef4444; font-weight: bold;">❌ REJECTED: Too High!</span>';
    } else if(type === 'low') {
        dashboard.classList.add('flash-green');
        feedbackDiv.innerHTML = '<span style="color: #3b82f6; font-weight: bold;">⚠️ REJECTED: Too Low!</span>';
    }
});

socket.on('blindDealWon', (data) => {
    playBeep(600, 0.3, 'sine'); setTimeout(() => playBeep(800, 0.5, 'sine'), 150); 
    document.getElementById('game-content').innerHTML = `
        ${renderScoreboard(data.scores)}
        <div class="trading-panel" style="text-align: center; margin-top: 20px; border-color: #eab308; box-shadow: 0 0 30px rgba(234,179,8,0.2);">
            <h1 style="font-size: 60px; margin-bottom: 10px;">🤝</h1>
            <h2 class="deal-locked-text" style="font-size: 32px; margin-bottom: 15px; text-transform: uppercase;">Contract Signed!</h2>
            <div style="background: rgba(0,0,0,0.5); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p style="color: #a1a1aa; font-size: 16px; margin-bottom: 5px;">Item: <span style="color: white;">${data.item}</span></p>
                <p style="color: #a1a1aa; font-size: 16px; margin-bottom: 15px;">Won By: <span style="color: white; font-weight: bold;">${data.winnerName}</span></p>
                <p style="color: #10b981; font-size: 36px; font-family: monospace; font-weight: bold;">₹${data.winningBid}</p>
            </div>
            ${amIHost ? `<button class="menu-btn btn-blue" onclick="playClick(); renderGameHub()">RETURN TO MENU ⬅️</button>` : `<p class="market-ticker">Awaiting next round...</p>`}
        </div>
    `;
});

// ==========================================
// 🎯 WORD SNIPER LOGIC
// ==========================================
function launchWordSniper() { socket.emit('startWordSniper', currentRoomCode); }

socket.on('loadWordSniper', (gameData) => {
    document.getElementById('current-game-title').innerText = "🎯 Word Sniper";
    document.getElementById('game-content').innerHTML = `
        ${renderScoreboard(gameData.scores)}
        <div style="text-align: center;">
            <p style="color: #a1a1aa; font-size: 14px;">Jaldi se sahi word guess karo!</p>
            <h2 style="font-size: 38px; color: var(--accent-blue); margin: 15px 0; letter-spacing: 4px;">${gameData.scrambledWord}</h2>
            <p style="font-style: italic; color: #eab308; margin-bottom: 20px;">Hint: ${gameData.hint}</p>
            <input type="text" id="wordGuess" placeholder="Apna jawab likho..." class="input-field" style="max-width: 300px; margin: 0 auto 15px auto;" onkeypress="if(event.key === 'Enter') { playClick(); submitGuess(); }">
            <br>
            <button class="menu-btn btn-green" style="max-width: 200px; margin: 0 auto;" onclick="playClick(); submitGuess()">Submit Answer 🚀</button>
        </div>
    `;
    setTimeout(() => { const input = document.getElementById('wordGuess'); if(input) input.focus(); }, 100);
});

function submitGuess() {
    const myGuess = document.getElementById('wordGuess').value.trim();
    if(myGuess) socket.emit('checkAnswer', { roomCode: currentRoomCode, guess: myGuess, playerName: myName });
    document.getElementById('wordGuess').value = '';
}

socket.on('wrongAnswer', () => {
    const guessBox = document.getElementById('wordGuess');
    if(guessBox) { guessBox.style.border = '2px solid red'; setTimeout(() => guessBox.style.border = '1px solid #444', 500); }
});

socket.on('playerWon', (data) => {
    document.getElementById('game-content').innerHTML = `
        ${renderScoreboard(data.scores)}
        <div style="text-align: center;">
            <h1 style="font-size: 45px; animation: pulse 1s infinite;">🏆</h1>
            <h2 style="color: var(--accent-green); margin: 10px 0;">🎉 ${data.winnerName} Sniper Shot! 🎉</h2>
            <p style="margin-top: 10px; color: #a1a1aa; font-size: 18px;">Word was: <br><span style="color: white; font-weight: bold; font-size: 26px;">${data.word}</span></p>
            <br><br>
            ${amIHost ? `<button class="menu-btn btn-blue" onclick="playClick(); renderGameHub()">Back to Menu ⬅️</button>` : `<p style="color: #a1a1aa;">Host menu mein wapas jaa raha hai...</p>`}
        </div>
    `;
});

// ==========================================
// ❌⭕ TIC-TAC-TOE LOGIC
// ==========================================
function launchTicTacToe() { socket.emit('startTicTacToe', currentRoomCode); }

socket.on('loadTicTacToe', (gameData) => {
    document.getElementById('current-game-title').innerText = "❌⭕ Tic-Tac-Toe";
    mySymbol = amIHost ? 'X' : 'O'; 
    drawTicTacToeUI(gameData);
});

socket.on('updateTicTacToe', (gameData) => { drawTicTacToeUI(gameData); });

function drawTicTacToeUI(gameData) {
    const isMyTurn = (gameData.turn === mySymbol);
    const turnMessage = isMyTurn ? `<span style="color: var(--accent-green);">Aapki baari hai! (${mySymbol})</span>` : `<span style="color: #eab308;">Dusre player ki baari hai...</span>`;
    let gridHTML = `<div style="display: grid; grid-template-columns: repeat(3, 80px); gap: 8px; justify-content: center; margin: 20px auto;">`;
    
    gameData.board.forEach((cell, index) => {
        let color = cell === 'X' ? '#ef4444' : (cell === 'O' ? '#3b82f6' : 'white');
        gridHTML += `<div onclick="makeTttMove(${index})" style="width: 80px; height: 80px; background: #2a2a35; border: 2px solid #444; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 45px; font-weight: bold; cursor: pointer; color: ${color};">${cell}</div>`;
    });
    gridHTML += `</div>`;
    
    document.getElementById('game-content').innerHTML = `
        ${renderScoreboard(gameData.scores)}
        <div style="text-align: center;">
            <p style="font-size: 18px; margin-bottom: 10px;">${turnMessage}</p>
            <p style="color: #a1a1aa; font-size: 14px;">Aapka Symbol: <strong>${mySymbol}</strong></p>
            ${gridHTML}
        </div>
    `;
}

function makeTttMove(index) {
    playClick();
    socket.emit('ticTacToeMove', { roomCode: currentRoomCode, index: index, playerName: myName });
}

socket.on('ticTacToeResult', (data) => {
    let resultHTML = '';
    if (data.status === 'win') {
        let color = data.symbol === 'X' ? '#ef4444' : '#3b82f6';
        resultHTML = `<h2 style="color: ${color};">🎉 ${data.winnerName} Jeet Gaya! (${data.symbol})</h2>`;
    } else {
        resultHTML = `<h2 style="color: #a1a1aa;">⚖️ Game Draw Ho Gayi!</h2>`;
    }

    document.getElementById('game-content').innerHTML = `
        ${renderScoreboard(data.scores)}
        <div style="text-align: center; margin-top: 30px;">
            <h1 style="font-size: 50px; margin-bottom: 15px;">${data.status === 'win' ? '🏆' : '🤝'}</h1>
            ${resultHTML}
            <br><br>
            ${amIHost ? `
                <button class="menu-btn btn-blue" onclick="playClick(); launchTicTacToe()" style="margin-bottom: 10px;">Rematch 🔄</button>
                <button class="menu-btn btn-back" onclick="playClick(); renderGameHub()">Menu ⬅️</button>
            ` : `<p style="color: #a1a1aa;">Host agla round decide kar raha hai...</p>`}
        </div>
    `;
});

// ==========================================
// 🕵️‍♂️ SECRET MISSION (SPY MODE) LOGIC
// ==========================================
socket.on('loadSecretMission', (data) => {
    document.getElementById('current-game-title').innerText = "📂 Classified Intel";
    const gameContent = document.getElementById('game-content');
    
    // Asli Role ka Data
    let roleHTML = '';
    if (data.isSpy) {
        roleHTML = `
            <div style="z-index: 10;">
                <h1 style="font-size: 50px; margin-bottom: 5px; animation: pulse 1s infinite;">🕵️‍♂️</h1>
                <h2 style="color: #ef4444; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">YOU ARE THE SPY</h2>
                <div style="background: #000; border: 1px solid #ef4444; padding: 10px; margin-top: 15px;">
                    <p style="color: #a1a1aa; font-size: 12px;">TARGET LOCATION</p>
                    <h3 style="color: #ef4444; font-size: 22px; letter-spacing: 2px;">??? UNKNOWN ???</h3>
                </div>
            </div>
        `;
    } else {
        roleHTML = `
            <div style="z-index: 10;">
                <h1 style="font-size: 50px; margin-bottom: 5px;">📍</h1>
                <h2 style="color: #10b981; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">AGENT ACTIVE</h2>
                <div style="background: #000; border: 1px solid #10b981; padding: 10px; margin-top: 15px;">
                    <p style="color: #a1a1aa; font-size: 12px;">TARGET LOCATION</p>
                    <h3 style="color: #10b981; font-size: 22px; letter-spacing: 1px;">${data.location}</h3>
                </div>
            </div>
        `;
    }

    // UI with Hidden and Revealed States
    gameContent.innerHTML = `
        <div class="trading-panel" style="text-align: center; position: relative;">
            
            <div id="intel-hidden" class="top-secret-folder">
                <div class="classified-stamp">CLASSIFIED</div>
                <h2 style="color: #a1a1aa; font-size: 18px; margin-bottom: 20px; z-index: 10;">Identity Concealed</h2>
                <button class="reveal-btn" id="reveal-btn">👁️ PRESS & HOLD TO VIEW</button>
                <p style="color: #ef4444; font-size: 11px; margin-top: 15px; font-weight: bold; z-index: 10;">Make sure no one is looking!</p>
            </div>

            <div id="intel-revealed" class="top-secret-folder hidden" style="background: ${data.isSpy ? '#2a0808' : '#06261b'};">
                <div class="classified-stamp">TOP SECRET</div>
                ${roleHTML}
            </div>

            <div style="margin-top: 25px; text-align: left; border-top: 1px dashed #444; padding-top: 15px;">
                <p style="color: #3b82f6; font-weight: bold; font-size: 14px; margin-bottom: 10px;">Suspects in the room:</p>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
                    ${data.playersList.map(p => `<span style="background: #222; padding: 5px 10px; border-radius: 4px; font-size: 13px; border: 1px solid #444;">${p}</span>`).join('')}
                </div>
            </div>
            
            <br>
            ${amIHost ? `<button class="menu-btn" style="background: #ef4444; color: white; margin-top: 20px; box-shadow: 0 0 15px rgba(239,68,68,0.5);" onclick="playClick(); socket.emit('endSecretMission', currentRoomCode)">🚨 END MISSION & REVEAL SPY</button>` : `<p style="color: #a1a1aa; font-size: 12px; margin-top: 20px;">Wait for the Host to end the mission.</p>`}
        </div>
    `;

    // The Magic: Press & Hold Logic
    const btn = document.getElementById('reveal-btn');
    const hiddenDiv = document.getElementById('intel-hidden');
    const revealedDiv = document.getElementById('intel-revealed');

    const showIntel = (e) => {
        e.preventDefault(); // Screen scroll na ho
        hiddenDiv.classList.add('hidden');
        revealedDiv.classList.remove('hidden');
        playBeep(300, 0.1, 'square'); // Futuristic scan sound
    };

    const hideIntel = (e) => {
        e.preventDefault();
        revealedDiv.classList.add('hidden');
        hiddenDiv.classList.remove('hidden');
    };

    // Jab touch karein ya mouse dabayein
    btn.addEventListener('mousedown', showIntel);
    btn.addEventListener('touchstart', showIntel);

    // Jab ungli hatayein (Puri screen par kahin bhi)
    window.addEventListener('mouseup', hideIntel);
    window.addEventListener('touchend', hideIntel);
});

socket.on('secretMissionOver', (data) => {
    playBeep(200, 0.8, 'sawtooth'); // Alert Buzzer!
    document.getElementById('game-content').innerHTML = `
        <div class="trading-panel" style="text-align: center; border-color: #ef4444; box-shadow: 0 0 40px rgba(239,68,68,0.3);">
            <h1 style="font-size: 70px; margin-bottom: 10px; animation: pulse 1s infinite;">🚨</h1>
            <h2 style="color: #ef4444; font-size: 32px; margin-bottom: 15px; text-transform: uppercase;">Mission Over!</h2>
            <div style="background: rgba(0,0,0,0.6); padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #444;">
                <p style="color: #a1a1aa; font-size: 16px; margin-bottom: 5px;">The Real Location was:</p>
                <h3 style="color: #10b981; font-size: 26px; margin-bottom: 20px; letter-spacing: 1px;">📍 ${data.location}</h3>
                <p style="color: #a1a1aa; font-size: 16px; margin-bottom: 5px;">And the SPY was...</p>
                <h2 style="color: #ef4444; font-size: 40px; text-transform: uppercase; letter-spacing: 2px;">🕵️‍♂️ ${data.spyName}</h2>
            </div>
            ${amIHost ? `<button class="menu-btn btn-blue" onclick="playClick(); renderGameHub()">RETURN TO MENU ⬅️</button>` : `<p style="color: #a1a1aa;">Host is generating a new mission...</p>`}
        </div>
    `;
});

// ==========================================
// 🃏 GAME 5: BLUFF BATTLE (CYBER UI SYSTEM)
// ==========================================
socket.on('loadBluffHub', (data) => {
    document.getElementById('current-game-title').innerText = "🃏 Cyber Bluff Showdown";
    const gameContent = document.getElementById('game-content');
    
    let actionHTML = '';

    if (data.isMyTurn) {
        // Agar meri baari hai attack karne ki
        actionHTML = `
            <div class="trading-panel" style="border-color: #ec4899; box-shadow: 0 0 20px rgba(236,72,153,0.2);">
                <div class="market-ticker" style="color: #ec4899;">● YOU ARE THE ATTACKER</div>
                <div style="background: #1e1b29; padding: 15px; border: 1px dashed #ec4899; border-radius: 8px; margin: 15px 0;">
                    <p style="color: #a1a1aa; font-size: 12px;">YOUR ACTUAL SECRET CARD</p>
                    <h2 style="color: white; font-size: 24px;">${data.myCard.name}</h2>
                    <span style="font-size: 12px; color: ${data.myCard.type==='good'?'#10b981':'#ef4444'};">
                        (If accepted, changes score by: ${data.myCard.value} pts)
                    </span>
                </div>
                
                <div style="text-align: left; max-width: 280px; margin: 0 auto;">
                    <label style="color: #8b5cf6; font-size: 12px; font-weight: bold;">1. SELECT TARGET VICTIM 🎯</label>
                    <select id="bluffTarget" class="input-field" style="margin-bottom: 15px; background:#000;">
                        ${data.playersList.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                    </select>
                    
                    <label style="color: #8b5cf6; font-size: 12px; font-weight: bold;">2. CHOOSE YOUR CLAIM (LIE OR TRUTH) 🎭</label>
                    <select id="bluffClaim" class="input-field" style="margin-bottom: 20px; background:#000;">
                        ${data.allCardOptions.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
                <button class="menu-btn" style="background: linear-gradient(90deg, #ec4899, #8b5cf6); color:white;" onclick="playClick(); transmitBluffAttack()">TRANSMIT DECEPTION 🚀</button>
            </div>
        `;
    } else {
        // Agar dusre kisi ki baari hai
        actionHTML = `
            <div class="trading-panel" style="text-align: center;">
                <h1 style="font-size: 50px; animation: pulse 1.5s infinite;">⚡</h1>
                <h3 style="color: #8b5cf6;">${data.attackerName.toUpperCase()} IS CHOOSING A TARGET</h3>
                <p class="market-ticker" style="margin-top: 10px;">Intercepting bio-signals... Stay alert.</p>
                <div style="background: #111; padding: 15px; border-radius: 6px; margin-top: 15px; border: 1px solid #222;">
                    <p style="color: #a1a1aa; font-size: 11px; margin-bottom: 5px;">YOUR PROTECTIVE ASSET FOR THIS ROUND:</p>
                    <h4 style="color: #10b981; font-size: 18px;">${data.myCard.name}</h4>
                </div>
            </div>
        `;
    }

    gameContent.innerHTML = `
        ${renderScoreboard(data.scores)}
        ${actionHTML}
    `;
});

function transmitBluffAttack() {
    const targetId = document.getElementById('bluffTarget').value;
    const declaredCardName = document.getElementById('bluffClaim').value;
    socket.emit('submitBluffAttack', {
        roomCode: currentRoomCode,
        targetId: targetId,
        declaredCardName: declaredCardName
    });
}

// Target Player Screen: Action Options
socket.on('bluffChallengeReceived', (data) => {
    playBeep(700, 0.2, 'square');
    const gameContent = document.getElementById('game-content');
    
    // Dynamic Hologram Scanner Layout
    gameContent.innerHTML = `
        <div class="trading-panel" style="border-color: #ef4444; background: #1a0b0b;">
            <div class="market-ticker" style="color: #ef4444; animation: flashRed 1s infinite alternate;">⚠️ INCOMING INTRUSION ALERT</div>
            <h2 style="color: white; margin: 15px 0 5px 0;">${data.attackerName} passed a card!</h2>
            <p style="color: #a1a1aa; font-size: 14px;">They claim it is a:</p>
            <h1 style="color: #eab308; font-size: 28px; font-family: monospace; letter-spacing: 1px; margin: 10px 0;">[ ${data.declaredCard} ]</h1>
            
            <p style="color: #a1a1aa; font-size: 12px; margin-bottom: 20px;">What is your neural instinct?</p>
            
            <div style="display: flex; flex-direction: column; gap: 12px; max-width: 250px; margin: 0 auto;">
                <button class="menu-btn btn-green" onclick="playClick(); resolveBluff('trust')">🟢 TRUST & ACCEPT CARD</button>
                <button class="menu-btn" style="background: #ef4444; color: white;" onclick="runNeuralScanner(); resolveBluff('challenge')">🚨 INTERCEPT & CALL BLUFF!</button>
            </div>
        </div>
    `;
});

// Dynamic Scanning animation wrapper for pure thrill
function runNeuralScanner() {
    playBeep(900, 0.4, 'sawtooth');
    setTimeout(() => playBeep(500, 0.3, 'square'), 150);
}

socket.on('bluffWaitingForTarget', (data) => {
    document.getElementById('game-content').innerHTML = `
        <div class="trading-panel" style="text-align: center;">
            <div class="market-ticker" style="color: #3b82f6;">● INTERCEPTING CONFRONTATION</div>
            <p style="color: white; margin-top: 15px; font-size: 16px;">
                <b>${data.attackerName}</b> passed an encrypted card to <b>${data.targetName}</b>.
            </p>
            <p style="color: #a1a1aa; font-size: 13px; margin-top: 5px;">Claimed Asset: <span style="color:#eab308;">${data.declaredCard}</span></p>
            <br>
            <h3 style="color: #8b5cf6; animation: pulse 1s infinite;">WAITING FOR SCAN RESOLUTION...</h3>
        </div>
    `;
});

socket.on('bluffRoundOver', (data) => {
    const gameContent = document.getElementById('game-content');
    gameContent.innerHTML = `
        ${renderScoreboard(data.scores)}
        <div class="trading-panel" style="text-align: center; border-color: #8b5cf6; box-shadow: 0 0 25px rgba(139,92,246,0.3);">
            <h1 style="font-size: 55px; margin-bottom: 10px;">📡</h1>
            <h3 style="color: #8b5cf6; text-transform: uppercase; letter-spacing: 1px;">Scan Results Transmitted</h3>
            <div style="background: rgba(0,0,0,0.6); padding: 20px; border-radius: 8px; margin: 15px 0; border: 1px solid #333; font-size: 16px; color: white; line-height: 1.6;">
                ${data.resultMsg}
            </div>
            ${amIHost ? `<button class="menu-btn btn-green" onclick="playClick(); socket.emit('nextBluffRound', currentRoomCode)">NEXT CYBER CYCLE ➡️</button>` : `<p class="market-ticker">Awaiting next operational cycle from Host...</p>`}
        </div>
    `;
});

// ==========================================
// 🎨 GAME 6: DRAW & GUESS
// ==========================================
let canvas, ctx;
let isDrawing = false;
let drawColor = '#000000';
let drawWidth = 3;
let myDrawRole = false; 

socket.on('loadDrawAndGuess', (data) => {
    document.getElementById('current-game-title').innerText = "🎨 Draw & Guess";
    const gameContent = document.getElementById('game-content');
    myDrawRole = data.isDrawer;

    gameContent.innerHTML = `
        ${renderScoreboard(data.scores)}
        <div class="trading-panel" style="text-align: center; border-color: #3b82f6;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 10px;">
                <div class="market-ticker" style="color: ${data.isDrawer ? '#10b981' : '#3b82f6'};">
                    ${data.isDrawer ? '● YOUR TURN TO DRAW' : `● ${data.drawerName} IS DRAWING`}
                </div>
                <div id="draw-timer" style="color: #ef4444; font-size: 24px; font-weight: bold; font-family: monospace;">45s</div>
            </div>
            
            <h2 style="color: #eab308; margin-top: 10px; letter-spacing: ${data.isDrawer ? '2px' : '8px'}; font-family: monospace;">
                ${data.word}
            </h2>
            
            <div class="canvas-container">
                <canvas id="drawing-board" width="500" height="500"></canvas>
            </div>

            ${data.isDrawer ? `
                <div style="margin: 10px 0; display: flex; justify-content: center; gap: 5px;">
                    <div class="color-btn active" style="background: #000000;" onclick="setColor(this, '#000000')"></div>
                    <div class="color-btn" style="background: #ef4444;" onclick="setColor(this, '#ef4444')"></div>
                    <div class="color-btn" style="background: #3b82f6;" onclick="setColor(this, '#3b82f6')"></div>
                    <div class="color-btn" style="background: #10b981;" onclick="setColor(this, '#10b981')"></div>
                    <div class="color-btn" style="background: linear-gradient(45deg, red, yellow, green, blue, purple);" onclick="setColor(this, 'rainbow')"></div>
                    <div class="color-btn" style="background: #ffffff; border: 2px solid #ccc; position: relative;" onclick="setColor(this, '#ffffff')">
                        <span style="position: absolute; font-size: 10px; color: black; top: 7px; left: 2px;">ERASE</span>
                    </div>
                </div>
                <button class="menu-btn" style="background: #ef4444; color: white; padding: 8px 15px; font-size: 12px; margin-top: 5px;" onclick="clearCanvas()">🗑️ CLEAR CANVAS</button>
            ` : `
                <div style="margin-top: 15px;">
                    <input type="text" id="drawGuessInput" placeholder="Guess what this is..." class="input-field" style="max-width: 200px; display: inline-block; border-color: #3b82f6;" onkeypress="if(event.key === 'Enter') { playClick(); submitDrawGuess(); }">
                    <button class="menu-btn btn-blue" style="max-width: 80px; padding: 10px; display: inline-block; vertical-align: top;" onclick="playClick(); submitDrawGuess()">GO</button>
                </div>
            `}
            
            <div id="live-guesses" style="height: 60px; overflow-y: auto; background: rgba(0,0,0,0.4); border-radius: 6px; margin-top: 15px; padding: 5px; text-align: left; font-size: 13px; display: flex; flex-direction: column; gap: 4px; border: 1px dashed #444;">
                <span style="color: #a1a1aa; font-style: italic; text-align: center;">Waiting for guesses...</span>
            </div>
        </div>
    `;

    canvas = document.getElementById('drawing-board');
    ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (data.isDrawer) setupCanvasEvents();
});

socket.on('drawTimeUpdate', (time) => {
    const t = document.getElementById('draw-timer');
    if(t) {
        t.innerText = time + 's';
        if(time <= 10) {
            t.style.animation = "pulse 0.5s infinite";
            playBeep(800, 0.05, 'square');
        }
    }
});

function setColor(element, color) {
    if(!myDrawRole) return;
    drawColor = color;
    drawWidth = (color === '#ffffff') ? 20 : 3; 
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
}

function setupCanvasEvents() {
    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let clientX = e.clientX || (e.touches && e.touches[0].clientX);
        let clientY = e.clientY || (e.touches && e.touches[0].clientY);
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const startDraw = (e) => {
        e.preventDefault();
        isDrawing = true;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        socket.emit('drawEvent', { roomCode: currentRoomCode, type: 'start', x: pos.x, y: pos.y, color: drawColor, size: drawWidth });
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        
        let actualColor = drawColor;
        if(drawColor === 'rainbow') {
            actualColor = 'hsl(' + (Date.now() % 360) + ', 100%, 50%)';
        }

        ctx.strokeStyle = actualColor;
        ctx.lineWidth = drawWidth;
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        socket.emit('drawEvent', { roomCode: currentRoomCode, type: 'draw', x: pos.x, y: pos.y, color: actualColor, size: drawWidth });
    };

    const stopDraw = (e) => {
        if(!isDrawing) return;
        e.preventDefault();
        isDrawing = false;
        ctx.closePath();
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseout', stopDraw);
    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDraw);
}

socket.on('receiveDrawEvent', (data) => {
    if (!ctx || myDrawRole) return; 
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.size;
    if (data.type === 'start') {
        ctx.beginPath();
        ctx.moveTo(data.x, data.y);
    } else if (data.type === 'draw') {
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
    }
});

function clearCanvas() {
    if(!myDrawRole) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clearCanvasEvent', currentRoomCode);
}

socket.on('receiveClearCanvas', () => { if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); });

function submitDrawGuess() {
    const input = document.getElementById('drawGuessInput');
    if(!input || !input.value.trim()) return;
    socket.emit('submitDrawGuess', { roomCode: currentRoomCode, guess: input.value });
    input.value = '';
}

socket.on('liveWrongGuess', (data) => {
    const feed = document.getElementById('live-guesses');
    if(feed) {
        if(feed.innerHTML.includes('Waiting')) feed.innerHTML = ''; 
        const newMsg = document.createElement('div');
        newMsg.innerHTML = `<b style="color: #3b82f6;">${data.playerName}:</b> <span style="color: #ef4444;">${data.guess}</span>`;
        feed.appendChild(newMsg);
        feed.scrollTop = feed.scrollHeight; 
    }
});

socket.on('wrongDrawGuess', () => {
    const input = document.getElementById('drawGuessInput');
    if(input) {
        input.style.border = "2px solid red";
        setTimeout(() => { input.style.border = "1px solid #3b82f6"; }, 300);
    }
});

socket.on('drawTurnOver', (data) => {
    playBeep(data.reason === 'guessed' ? 600 : 200, 0.5, data.reason === 'guessed' ? 'sine' : 'sawtooth');
    document.getElementById('game-content').innerHTML = `
        ${renderScoreboard(data.scores)}
        <div class="trading-panel" style="text-align: center; border-color: ${data.reason === 'guessed' ? '#10b981' : '#ef4444'};">
            <h1 style="font-size: 50px;">${data.reason === 'guessed' ? '🎯' : '⌛'}</h1>
            <h2 style="color: ${data.reason === 'guessed' ? '#10b981' : '#ef4444'}; margin-bottom: 10px;">
                ${data.reason === 'guessed' ? `${data.winnerName} Guessed it!` : `Time's Up!`}
            </h2>
            <p style="color: #a1a1aa;">The word was:</p>
            <h1 style="color: #eab308; font-size: 36px; margin: 10px 0;">${data.word}</h1>
            <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 20px;">Drawn by: ${data.drawerName}</p>
            ${amIHost ? `<button class="menu-btn btn-blue" onclick="playClick(); socket.emit('nextDrawRound', currentRoomCode)">NEXT TURN ➡️</button><button class="menu-btn" style="background: #444; color: white; margin-top:10px;" onclick="renderGameHub()">BACK TO MENU</button>` : `<p class="market-ticker">Waiting for Host...</p>`}
        </div>
    `;
});

// ==========================================
// 🎯 GAME 7: THE EXPOSÉ (VOTE OUT)
// ==========================================
socket.on('loadExposeUI', (data) => {
    document.getElementById('current-game-title').innerText = "🎯 The Exposé";
    const gameContent = document.getElementById('game-content');
    
    let buttonsHTML = '';
    data.playersList.forEach(p => {
        buttonsHTML += `<button class="vote-btn" onclick="submitExposeVote('${p.id}', this)" style="width: 100%; margin-bottom: 10px;">${p.name}</button>`;
    });

    gameContent.innerHTML = `
        <div class="expose-panel" style="text-align: center;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #444; padding-bottom: 10px; margin-bottom: 20px;">
                <span class="market-ticker" style="color: #ef4444;">● INTERROGATION ACTIVE</span>
                <span id="expose-timer" style="color: white; font-size: 24px; font-weight: bold; font-family: monospace;">20s</span>
            </div>
            
            <p style="color: #a1a1aa; font-size: 14px; text-transform: uppercase;">The Question:</p>
            <h2 style="color: #f59e0b; font-size: 26px; margin: 10px 0 25px 0; line-height: 1.4;">"${data.question}"</h2>
            
            <p style="color: #3b82f6; font-size: 14px; margin-bottom: 15px;">Cast your vote secretly:</p>
            <div id="expose-buttons-container" style="max-width: 300px; margin: 0 auto;">
                ${buttonsHTML}
            </div>
            
            <p id="vote-status-text" style="color: #a1a1aa; font-size: 13px; margin-top: 20px; font-style: italic;">Waiting for votes... (0 cast)</p>
        </div>
    `;
});

function submitExposeVote(targetId, btnElement) {
    playClick();
    socket.emit('submitExposeVote', { roomCode: currentRoomCode, targetId: targetId });
    
    // UI Update - Lock the buttons
    const container = document.getElementById('expose-buttons-container');
    container.style.pointerEvents = 'none';
    container.style.opacity = '0.5';
    btnElement.classList.add('selected');
    btnElement.innerText += ' (Locked)';
}

socket.on('exposeTimeUpdate', (time) => {
    const t = document.getElementById('expose-timer');
    if(t) {
        t.innerText = time + 's';
        if(time <= 5) {
            t.style.color = '#ef4444';
            playBeep(300, 0.1, 'square'); // Heartbeat tension
        }
    }
});

socket.on('playerVotedUpdate', (voteCount) => {
    const status = document.getElementById('vote-status-text');
    if(status) status.innerText = `Votes cast: ${voteCount}...`;
});

socket.on('exposeResults', (data) => {
    const gameContent = document.getElementById('game-content');
    
    let chartHTML = '<div class="bar-chart-container">';
    const maxVotes = Math.max(...data.chartData.map(d => d.votes)); // Find highest vote for bar scaling

    data.chartData.forEach(d => {
        const percentage = maxVotes === 0 ? 0 : (d.votes / maxVotes) * 100;
        chartHTML += `
            <div class="bar-row">
                <div class="bar-label">${d.name}</div>
                <div class="bar-track">
                    <div class="bar-fill" style="width: 0%;" data-target="${percentage}%"></div>
                    <div class="bar-votes">${d.votes}</div>
                </div>
            </div>
        `;
    });
    chartHTML += '</div>';

    gameContent.innerHTML = `
        ${renderScoreboard(data.scores)}
        <div class="expose-panel" style="text-align: center;">
            <p style="color: #a1a1aa; font-size: 12px; text-transform: uppercase;">Results for:</p>
            <h3 style="color: white; font-size: 18px; margin: 5px 0 20px 0; font-style: italic;">"${data.question}"</h3>
            
            ${chartHTML}
            
            <div style="margin: 40px 0; height: 100px;">
                <div class="guilty-stamp">${data.guiltyNames === "" ? "NO ONE" : data.guiltyNames}</div>
            </div>
            
            <p style="color: #ef4444; font-size: 14px; margin-bottom: 20px;">Guilty players lose 10 points!</p>
            
            ${amIHost ? `<button class="menu-btn" style="background: white; color: black; font-weight: bold;" onclick="playClick(); socket.emit('nextExposeRound', currentRoomCode)">NEXT QUESTION ➡️</button>` : `<p style="color: #a1a1aa;">Host is pulling the next file...</p>`}
        </div>
    `;

    // Dramatic Reveal Animations
    setTimeout(() => {
        playBeep(500, 0.5, 'sine'); // Whoosh sound for bars
        document.querySelectorAll('.bar-fill').forEach(bar => {
            bar.style.width = bar.getAttribute('data-target');
        });
    }, 100);

    // The Slam effect for the Stamp
    setTimeout(() => {
        playSlamSound();
    }, 1500); // Stamp hits at 1.5s based on CSS delay
});

// ==========================================
// 🔴🔵 GAME 8: WOULD YOU RATHER
// ==========================================
socket.on('loadWyrUI', (data) => {
    document.getElementById('current-game-title').innerText = "🤷‍♂️ Would You Rather";
    const gameContent = document.getElementById('game-content');
    
    gameContent.innerHTML = `
        ${renderScoreboard(data.scores)}
        <div style="text-align: center;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="color: #a1a1aa; font-weight: bold; letter-spacing: 1px;">GUESS THE MAJORITY MIND!</span>
                <span id="wyr-timer" style="color: #eab308; font-size: 28px; font-weight: bold; font-family: monospace;">15s</span>
            </div>
            
            <div class="wyr-container" id="wyr-buttons-box">
                <button class="wyr-btn wyr-btn-a" id="wyr-btn-a" onclick="submitWyrVote('A')">
                    ${data.optionA}
                </button>
                
                <div class="wyr-vs-badge">VS</div>
                
                <button class="wyr-btn wyr-btn-b" id="wyr-btn-b" onclick="submitWyrVote('B')">
                    ${data.optionB}
                </button>
            </div>
            <p id="wyr-wait-msg" style="color: #10b981; margin-top: 20px; font-weight: bold; opacity: 0; transition: 0.3s;">Vote Locked! Waiting for others... 🔒</p>
        </div>
    `;
});

function submitWyrVote(choice) {
    playClick();
    socket.emit('submitWyrVote', { roomCode: currentRoomCode, choice: choice });
    
    // UI Update - Lock both buttons
    const btnA = document.getElementById('wyr-btn-a');
    const btnB = document.getElementById('wyr-btn-b');
    btnA.style.pointerEvents = 'none';
    btnB.style.pointerEvents = 'none';
    
    if(choice === 'A') btnB.classList.add('locked');
    else btnA.classList.add('locked');
    
    document.getElementById('wyr-wait-msg').style.opacity = '1';
}

socket.on('wyrTimeUpdate', (time) => {
    const t = document.getElementById('wyr-timer');
    if(t) {
        t.innerText = time + 's';
        if(time <= 5) {
            t.style.color = '#ef4444';
            playBeep(400, 0.1, 'sawtooth'); 
        }
    }
});

socket.on('wyrResults', (data) => {
    playBeep(600, 0.5, 'sine'); // Result reveal sound
    
    // Calculate total for percentages
    const totalVotes = data.countA + data.countB;
    const percentA = totalVotes === 0 ? 0 : Math.round((data.countA / totalVotes) * 100);
    const percentB = totalVotes === 0 ? 0 : Math.round((data.countB / totalVotes) * 100);

    // Styling winners
    const aColor = data.winningChoice === 'A' ? '#10b981' : (data.winningChoice === 'TIE' ? '#eab308' : '#ef4444');
    const bColor = data.winningChoice === 'B' ? '#10b981' : (data.winningChoice === 'TIE' ? '#eab308' : '#ef4444');

    document.getElementById('game-content').innerHTML = `
        ${renderScoreboard(data.scores)}
        <div style="text-align: center; background: #111; padding: 20px; border-radius: 10px; border: 1px solid #333;">
            <h2 style="color: white; margin-bottom: 25px; text-transform: uppercase;">Group Verdict</h2>
            
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <!-- Option A Result -->
                <div style="background: rgba(239,68,68,0.1); border: 1px solid #ef4444; padding: 15px; border-radius: 8px; text-align: left; position: relative;">
                    <h3 style="color: white; margin-bottom: 10px; font-size: 16px;">${data.optionA}</h3>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="color: #a1a1aa; font-size: 12px;">Votes: ${data.votersA.join(', ') || 'No one'}</span>
                        <span style="color: ${aColor}; font-weight: bold; font-size: 20px;">${percentA}%</span>
                    </div>
                    <div style="width: 100%; background: #222; height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="width: ${percentA}%; background: ${aColor}; height: 100%; transition: 1s;"></div>
                    </div>
                </div>

                <!-- Option B Result -->
                <div style="background: rgba(59,130,246,0.1); border: 1px solid #3b82f6; padding: 15px; border-radius: 8px; text-align: left; position: relative;">
                    <h3 style="color: white; margin-bottom: 10px; font-size: 16px;">${data.optionB}</h3>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="color: #a1a1aa; font-size: 12px;">Votes: ${data.votersB.join(', ') || 'No one'}</span>
                        <span style="color: ${bColor}; font-weight: bold; font-size: 20px;">${percentB}%</span>
                    </div>
                    <div style="width: 100%; background: #222; height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="width: ${percentB}%; background: ${bColor}; height: 100%; transition: 1s;"></div>
                    </div>
                </div>
            </div>
            
            <p style="color: #10b981; font-size: 14px; margin: 20px 0; font-weight: bold;">Majority wins +15 Points!</p>
            
            ${amIHost ? `<button class="menu-btn btn-blue" style="max-width: 250px; margin: 0 auto;" onclick="playClick(); socket.emit('nextWyrRound', currentRoomCode)">NEXT DEBATE ➡️</button>` : `<p style="color: #a1a1aa; font-size: 13px;">Host is loading the next debate...</p>`}
        </div>
    `;
});

// ==========================================
// 👥 GAME 9: WHO KNOWS ME? (FRIENDSHIP TEST)
// ==========================================
let wkmAmITarget = false;

socket.on('wkmPhase1', (data) => {
    document.getElementById('current-game-title').innerText = "👥 Who Knows Me?";
    const gameContent = document.getElementById('game-content');
    wkmAmITarget = (data.targetId === socket.id);
    
    let optionsHTML = '';
    data.options.forEach((opt, index) => {
        // Agar main target hoon, toh click karke lock kar sakta hoon. 
        // Agar main target nahi hoon, toh buttons disabled rahenge phase 1 mein.
        const clickEvent = wkmAmITarget ? `onclick="lockWkmAnswer(${index}, this)"` : `style="opacity: 0.5; pointer-events: none;"`;
        optionsHTML += `<button class="wkm-opt-btn" id="wkm-opt-${index}" ${clickEvent}><span style="background: #312e81; padding: 5px 10px; border-radius: 4px; margin-right: 15px;">${['A','B','C','D'][index]}</span> ${opt}</button>`;
    });

    gameContent.innerHTML = `
        ${renderScoreboard(data.scores)}
        <div class="wkm-panel">
            <div class="market-ticker" style="color: ${wkmAmITarget ? '#f59e0b' : '#a1a1aa'}; margin-bottom: 15px;">
                ${wkmAmITarget ? '👑 YOU ARE THE HOT SEAT TARGET' : `👀 ${data.targetName.toUpperCase()} IS IN THE HOT SEAT`}
            </div>
            
            <h2 style="color: white; font-size: 22px; margin-bottom: 25px; line-height: 1.4; border-bottom: 1px dashed #444; padding-bottom: 15px;">
                "${data.question}"
            </h2>
            
            <div id="wkm-options-box" style="max-width: 400px; margin: 0 auto;">
                ${optionsHTML}
            </div>
            
            <p id="wkm-status-msg" style="color: #6366f1; margin-top: 20px; font-weight: bold; font-size: 14px;">
                ${wkmAmITarget ? "Select your true answer to lock it! 🔒" : `Waiting for ${data.targetName} to lock their secret answer...`}
            </p>
        </div>
    `;
});

function lockWkmAnswer(index, btnElement) {
    playClick();
    socket.emit('submitWkmTargetAnswer', { roomCode: currentRoomCode, answerIndex: index });
    
    // Lock my screen
    const box = document.getElementById('wkm-options-box');
    box.style.pointerEvents = 'none';
    btnElement.classList.add('locked');
    document.getElementById('wkm-status-msg').innerText = "Answer Locked! Waiting for others to guess... ⏳";
    document.getElementById('wkm-status-msg').style.color = '#10b981';
}

socket.on('wkmPhase2', (data) => {
    if(wkmAmITarget) return; // Target ka screen waise hi rahega
    playBeep(400, 0.2, 'square');

    // Guesser ke buttons unlock karo
    document.getElementById('wkm-status-msg').innerHTML = `<span style="color: #f59e0b;">${data.targetName} locked their answer!</span><br>What do you think they chose?`;
    
    for(let i=0; i<4; i++) {
        const btn = document.getElementById(`wkm-opt-${i}`);
        if(btn) {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
            btn.setAttribute('onclick', `submitWkmGuess(${i}, this)`);
        }
    }
});

function submitWkmGuess(index, btnElement) {
    playClick();
    socket.emit('submitWkmGuess', { roomCode: currentRoomCode, guessIndex: index });
    
    // Lock my guess
    const box = document.getElementById('wkm-options-box');
    box.style.pointerEvents = 'none';
    btnElement.classList.add('locked');
    document.getElementById('wkm-status-msg').innerText = "Guess Submitted! Waiting for results... 📡";
}

socket.on('wkmPlayerGuessedUpdate', (count) => {
    if(wkmAmITarget) {
        document.getElementById('wkm-status-msg').innerText = `Answer Locked! ${count} friends have guessed... ⏳`;
    }
});

socket.on('wkmResults', (data) => {
    playMagicSound(); // Big reveal!
    
    const gameContent = document.getElementById('game-content');
    
    let optionsHTML = '';
    data.options.forEach((opt, index) => {
        let extraClass = (index === data.correctAnswerIndex) ? 'correct-reveal' : 'wrong-reveal';
        optionsHTML += `<div class="wkm-opt-btn ${extraClass}"><span style="background: rgba(0,0,0,0.3); padding: 5px 10px; border-radius: 4px; margin-right: 15px;">${['A','B','C','D'][index]}</span> ${opt}</div>`;
    });

    let winnersText = data.correctGuessers.length > 0 
        ? `<span style="color: #10b981;">Correct Guesses by: ${data.correctGuessers.join(', ')} 🎉</span>` 
        : `<span style="color: #ef4444;">No one knows ${data.targetName} at all! 😭</span>`;

    gameContent.innerHTML = `
        ${renderScoreboard(data.scores)}
        <div class="wkm-panel">
            <h3 style="color: #a1a1aa; font-size: 14px; text-transform: uppercase;">The Truth About ${data.targetName}</h3>
            <h2 style="color: white; font-size: 20px; margin: 10px 0 20px 0;">"${data.question}"</h2>
            
            <div style="max-width: 400px; margin: 0 auto; pointer-events: none;">
                ${optionsHTML}
            </div>
            
            <div style="background: #111; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px dashed #4f46e5;">
                <p style="font-weight: bold; font-size: 16px;">${winnersText}</p>
            </div>
            
            <br>
            ${amIHost ? `<button class="menu-btn" style="background: #4f46e5; color: white;" onclick="playClick(); socket.emit('nextWkmRound', currentRoomCode)">NEXT PLAYER ➡️</button>` : `<p style="color: #a1a1aa; font-size: 13px;">Host is setting up the next Hot Seat...</p>`}
        </div>
    `;
});

// ==========================================
// 🎬 GAME 10: EMOJI STORY (CINEMATIC)
// ==========================================
let emojiGameActive = false;

socket.on('loadEmojiStory', (data) => {
    document.getElementById('current-game-title').innerText = "🎬 Emoji Cinema";
    const gameContent = document.getElementById('game-content');
    emojiGameActive = true;
    
    gameContent.innerHTML = `
        ${renderScoreboard(data.scores)}
        <div class="cinema-panel" id="cinema-board">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #7f1d1d; padding-bottom: 10px;">
                <span style="color: #fbbf24; font-weight: bold; letter-spacing: 2px;">GUESS THE MOVIE/WORD</span>
                <span id="emoji-timer" style="color: white; font-size: 24px; font-weight: bold; font-family: monospace;">40s</span>
            </div>
            
            <p style="color: #a1a1aa; font-size: 14px; margin-top: 15px; font-style: italic;">Hint: ${data.hint}</p>
            
            <div class="emoji-display-box" id="the-emojis">
                ${data.emoji}
            </div>
            
            <div id="emoji-input-section">
                <input type="text" id="emojiGuessInput" placeholder="Type your guess here..." class="input-field" style="max-width: 220px; display: inline-block; border-color: #fbbf24; background: #000; color: #fbbf24; font-weight: bold;" onkeypress="if(event.key === 'Enter') { playClick(); submitEmojiGuess(); }">
                <button class="menu-btn" style="max-width: 80px; padding: 10px; display: inline-block; vertical-align: top; background: #fbbf24; color: #000; font-weight: bold;" onclick="playClick(); submitEmojiGuess()">GO 🚀</button>
            </div>

            <!-- 💬 Troll Feed for wrong guesses -->
            <div class="troll-feed" id="emoji-live-guesses">
                <span style="color: #a1a1aa; font-style: italic; text-align: center; width: 100%; display: inline-block;">Director is waiting for guesses...</span>
            </div>
        </div>
    `;
    setTimeout(() => { const inp = document.getElementById('emojiGuessInput'); if(inp) inp.focus(); }, 100);
});

function submitEmojiGuess() {
    if(!emojiGameActive) return;
    const input = document.getElementById('emojiGuessInput');
    if(!input || !input.value.trim()) return;
    socket.emit('submitEmojiGuess', { roomCode: currentRoomCode, guess: input.value });
    input.value = ''; // clear box
}

socket.on('emojiTimeUpdate', (time) => {
    const t = document.getElementById('emoji-timer');
    if(t) {
        t.innerText = time + 's';
        if(time <= 10) {
            t.style.color = '#ef4444';
            playBeep(700, 0.05, 'square'); 
        }
    }
});

socket.on('liveWrongEmojiGuess', (data) => {
    const feed = document.getElementById('emoji-live-guesses');
    if(feed) {
        if(feed.innerHTML.includes('Director')) feed.innerHTML = ''; 
        const newMsg = document.createElement('div');
        newMsg.className = 'troll-msg';
        newMsg.innerHTML = `<b style="color: #fbbf24;">${data.playerName}:</b> <span style="color: #ef4444;">${data.guess}</span> ❌`;
        feed.appendChild(newMsg);
        feed.scrollTop = feed.scrollHeight; 
    }
});

socket.on('wrongEmojiFeedback', () => {
    const input = document.getElementById('emojiGuessInput');
    if(input) {
        input.style.border = "2px solid red";
        input.style.animation = "shake 0.3s";
        setTimeout(() => { 
            input.style.border = "1px solid #fbbf24"; 
            input.style.animation = ""; 
        }, 300);
    }
});

socket.on('emojiPlayerSolved', (data) => {
    playMagicSound();
    const board = document.getElementById('cinema-board');
    if(board) board.classList.add('success-flash');
    setTimeout(() => board.classList.remove('success-flash'), 500);

    const feed = document.getElementById('emoji-live-guesses');
    if(feed) {
        if(feed.innerHTML.includes('Director')) feed.innerHTML = ''; 
        const newMsg = document.createElement('div');
        newMsg.className = 'troll-msg';
        newMsg.innerHTML = `<b style="color: #10b981;">🎉 ${data.playerName} GUESSED IT! (+${data.points} pts)</b>`;
        feed.appendChild(newMsg);
        feed.scrollTop = feed.scrollHeight; 
    }

    // Agar main hi woh player hoon jisne solve kiya, toh input disable kar do
    if(data.playerName === myName) {
        const inpSec = document.getElementById('emoji-input-section');
        if(inpSec) inpSec.innerHTML = `<h3 style="color: #10b981; margin: 15px 0;">Nailed it! 🍿 Relax and watch others struggle.</h3>`;
    }
});

socket.on('emojiRoundOver', (data) => {
    emojiGameActive = false;
    playBeep(200, 0.8, 'sawtooth');
    
    document.getElementById('game-content').innerHTML = `
        ${renderScoreboard(data.scores)}
        <div class="cinema-panel" style="text-align: center;">
            <h1 style="font-size: 60px; margin-bottom: 10px;">🎬</h1>
            <h2 style="color: #fbbf24; margin-bottom: 15px; text-transform: uppercase;">CUT! Scene Over.</h2>
            
            <p style="color: #a1a1aa; font-size: 16px;">The correct answer was:</p>
            <h1 style="color: white; font-size: 34px; margin: 10px 0 20px 0; letter-spacing: 2px;">${data.answer}</h1>
            
            <div style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px dashed #7f1d1d;">
                <p style="color: #10b981; font-size: 16px; font-weight: bold;">${data.solvedCount} players guessed correctly!</p>
            </div>
            
            ${amIHost ? `<button class="menu-btn" style="background: #fbbf24; color: black; font-weight: bold;" onclick="playClick(); socket.emit('nextEmojiRound', currentRoomCode)">NEXT MOVIE ➡️</button>` : `<p style="color: #a1a1aa;">Host is rolling the next film reel...</p>`}
        </div>
    `;
});

// ==========================================
// ⚡ GAME 11: FAST QUIZ (SPEED RACE)
// ==========================================
socket.on('loadFastQuiz', (data) => {
    document.getElementById('current-game-title').innerText = "⚡ Fast Quiz";
    const gameContent = document.getElementById('game-content');
    
    let optionsHTML = '';
    data.options.forEach((opt, index) => {
        optionsHTML += `<button class="quiz-opt-btn" id="quiz-opt-${index}" onclick="submitQuizAnswer(${index}, this)"><span style="background: #38bdf8; color: black; padding: 4px 10px; border-radius: 4px; margin-right: 15px;">${['A','B','C','D'][index]}</span> ${opt}</button>`;
    });

    gameContent.innerHTML = `
        ${renderScoreboard(data.scores)}
        <div class="quiz-panel">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #38bdf8; padding-bottom: 10px; margin-bottom: 20px;">
                <span style="color: #38bdf8; font-weight: bold; font-size: 14px; letter-spacing: 2px;">SPEED RACE</span>
                <span id="quiz-timer" style="color: #facc15; font-size: 28px; font-weight: bold; font-family: monospace;">15s</span>
            </div>
            
            <h2 style="color: white; font-size: 22px; margin-bottom: 25px; line-height: 1.4;">
                ${data.question}
            </h2>
            
            <div id="quiz-options-box" style="max-width: 400px; margin: 0 auto;">
                ${optionsHTML}
            </div>
            
            <p id="quiz-status-msg" style="color: #0ea5e9; margin-top: 15px; font-weight: bold; font-size: 13px;">Read fast. Think faster. ⏱️</p>
        </div>
    `;
});

function submitQuizAnswer(index, btnElement) {
    playClick();
    socket.emit('submitQuizAnswer', { roomCode: currentRoomCode, answerIndex: index });
    
    // Lock all buttons
    const box = document.getElementById('quiz-options-box');
    box.style.pointerEvents = 'none';
    
    // Dim others, highlight selected
    for(let i=0; i<4; i++) {
        const btn = document.getElementById(`quiz-opt-${i}`);
        if(i === index) btn.classList.add('locked');
        else btn.style.opacity = '0.5';
    }
    
    document.getElementById('quiz-status-msg').innerHTML = "<span style='color:#facc15;'>Answer Locked! Waiting for others... 🔒</span>";
}

socket.on('quizTimeUpdate', (time) => {
    const t = document.getElementById('quiz-timer');
    if(t) {
        t.innerText = time + 's';
        if(time <= 5) {
            t.style.color = '#ef4444';
            playBeep(400, 0.1, 'sawtooth'); // Tension tick
        }
    }
});

socket.on('quizPlayerLocked', (count) => {
    const status = document.getElementById('quiz-status-msg');
    if(status && !status.innerHTML.includes('Locked')) {
        status.innerText = `${count} players have locked their answers... ⏳`;
    }
});

socket.on('quizResultsOver', (data) => {
    playMagicSound();
    
    // Animate correct button
    for(let i=0; i<4; i++) {
        const btn = document.getElementById(`quiz-opt-${i}`);
        if(btn) {
            if(i === data.correctAnswerIndex) {
                btn.classList.add('correct');
                btn.classList.remove('locked');
                btn.style.opacity = '1';
            } else {
                btn.classList.add('wrong');
                btn.classList.remove('locked');
            }
        }
    }

    // Generate speed leaderboard
    let speedRows = '';
    data.roundResults.forEach((r, idx) => {
        const color = r.points > 0 ? '#10b981' : (r.points < 0 ? '#ef4444' : '#a1a1aa');
        speedRows += `
            <div class="speed-row">
                <span style="color: white; font-weight: bold;">${idx+1}. ${r.name}</span>
                <span style="color: #a1a1aa;">${r.time === 15 ? 'Timeout' : r.time+'s'}</span>
                <span style="color: ${color}; font-weight: bold;">${r.status}</span>
            </div>
        `;
    });

    const gameContent = document.getElementById('game-content');
    const existingPanel = gameContent.innerHTML; // Keep question on screen
    
    setTimeout(() => {
        gameContent.innerHTML = `
            ${renderScoreboard(data.scores)}
            <div class="quiz-panel">
                <h2 style="color: #38bdf8; margin-bottom: 15px; text-transform: uppercase;">Round Speed Board ⚡</h2>
                <div class="speed-board">
                    ${speedRows}
                </div>
                <br>
                ${amIHost ? `<button class="menu-btn" style="background: #0ea5e9; color: white;" onclick="playClick(); socket.emit('nextQuizRound', currentRoomCode)">NEXT QUESTION ➡️</button>` : `<p style="color: #0ea5e9; font-size: 13px;">Host is loading the next question...</p>`}
            </div>
        `;
    }, 2500); // Wait 2.5 seconds showing the correct answer before showing leaderboard
});

// ==========================================
// 🤥 GAME 12: TRUTH OR LIE
// ==========================================
let tolAmITarget = false;

socket.on('loadTolPhase1', (data) => {
    document.getElementById('current-game-title').innerText = "🤥 Truth or Lie";
    const gameContent = document.getElementById('game-content');
    tolAmITarget = (data.targetId === socket.id);
    
    if (tolAmITarget) {
        gameContent.innerHTML = `
            ${renderScoreboard(data.scores)}
            <div class="tol-panel">
                <div class="market-ticker" style="color: #10b981; margin-bottom: 15px;">● YOU ARE UNDER INTERROGATION</div>
                <h3 style="color: white; margin-bottom: 15px;">Write 2 Truths and 1 Lie about yourself.</h3>
                
                <div style="text-align: left; max-width: 400px; margin: 0 auto;">
                    <textarea class="tol-textarea" id="tol-stmt-0" placeholder="Statement 1..."></textarea>
                    <div class="tol-radio-group">
                        <input type="radio" name="lieSelect" value="0" id="lie-0"> <label for="lie-0" style="color:#ef4444; font-weight:bold;">Mark as Lie ❌</label>
                    </div>

                    <textarea class="tol-textarea" id="tol-stmt-1" placeholder="Statement 2..."></textarea>
                    <div class="tol-radio-group">
                        <input type="radio" name="lieSelect" value="1" id="lie-1"> <label for="lie-1" style="color:#ef4444; font-weight:bold;">Mark as Lie ❌</label>
                    </div>

                    <textarea class="tol-textarea" id="tol-stmt-2" placeholder="Statement 3..."></textarea>
                    <div class="tol-radio-group">
                        <input type="radio" name="lieSelect" value="2" id="lie-2"> <label for="lie-2" style="color:#ef4444; font-weight:bold;">Mark as Lie ❌</label>
                    </div>
                </div>
                
                <button class="menu-btn btn-green" style="margin-top: 15px;" onclick="playClick(); submitTolStatements()">SUBMIT STATEMENTS 📤</button>
            </div>
        `;
    } else {
        gameContent.innerHTML = `
            ${renderScoreboard(data.scores)}
            <div class="tol-panel" style="text-align: center;">
                <h1 style="font-size: 50px; animation: pulse 1.5s infinite;">🕵️‍♂️</h1>
                <h3 style="color: #10b981; margin-top: 15px; text-transform: uppercase;">${data.targetName} IS WRITING...</h3>
                <p class="market-ticker" style="margin-top: 10px;">Get ready to catch the lie.</p>
            </div>
        `;
    }
});

function submitTolStatements() {
    const s0 = document.getElementById('tol-stmt-0').value.trim();
    const s1 = document.getElementById('tol-stmt-1').value.trim();
    const s2 = document.getElementById('tol-stmt-2').value.trim();
    const lieRadio = document.querySelector('input[name="lieSelect"]:checked');

    if(!s0 || !s1 || !s2) return alert("Teen statements likhna zaroori hai!");
    if(!lieRadio) return alert("Kisi ek statement ko 'Lie' mark karo!");

    socket.emit('submitTolStatements', {
        roomCode: currentRoomCode,
        statements: [s0, s1, s2],
        lieIndex: lieRadio.value
    });

    document.getElementById('game-content').innerHTML = `
        <div class="tol-panel">
            <h3 style="color: #10b981;">Statements Locked! 🔒</h3>
            <p style="color: #a1a1aa; margin-top: 10px;">Waiting for your friends to guess...</p>
        </div>
    `;
}

socket.on('loadTolPhase2', (data) => {
    if(tolAmITarget) return;
    playBeep(400, 0.2, 'square');
    
    const gameContent = document.getElementById('game-content');
    let btnsHTML = '';
    
    data.statements.forEach((stmt, index) => {
        btnsHTML += `<button class="tol-guess-btn" id="tol-btn-${index}" onclick="submitTolGuess(${index}, this)">${index+1}. ${stmt}</button>`;
    });

    gameContent.innerHTML = `
        <div class="tol-panel">
            <div class="market-ticker" style="color: #ef4444; margin-bottom: 15px;">● CATCH THE LIE</div>
            <h3 style="color: white; margin-bottom: 20px;">Which statement from <span style="color:#10b981;">${data.targetName}</span> is completely FAKE?</h3>
            
            <div id="tol-guess-box" style="max-width: 400px; margin: 0 auto;">
                ${btnsHTML}
            </div>
            <p id="tol-status-msg" style="color: #a1a1aa; margin-top: 15px;"></p>
        </div>
    `;
});

function submitTolGuess(index, btnElement) {
    playClick();
    socket.emit('submitTolGuess', { roomCode: currentRoomCode, guessIndex: index });
    
    const box = document.getElementById('tol-guess-box');
    box.style.pointerEvents = 'none';
    btnElement.classList.add('locked');
    document.getElementById('tol-status-msg').innerText = "Guess Locked! Waiting for others... 🔒";
    document.getElementById('tol-status-msg').style.color = '#f59e0b';
}

socket.on('tolPlayerGuessedUpdate', (count) => {
    if(tolAmITarget) {
        document.getElementById('game-content').innerHTML = `
            <div class="tol-panel">
                <h3 style="color: #10b981;">Statements Locked! 🔒</h3>
                <p style="color: #f59e0b; margin-top: 10px; font-weight: bold;">${count} friends have submitted their guess...</p>
            </div>
        `;
    }
});

socket.on('tolResults', (data) => {
    playMagicSound();
    
    let stmtHTML = '';
    data.statements.forEach((stmt, index) => {
        if(index === data.lieIndex) {
            stmtHTML += `<div style="background: rgba(239,68,68,0.2); border: 1px solid #ef4444; padding: 10px; border-radius: 6px; margin-bottom: 10px; color: white;">
                <span style="color: #ef4444; font-weight: bold;">[THE LIE]</span> ${stmt}
            </div>`;
        } else {
            stmtHTML += `<div style="background: rgba(16,185,129,0.2); border: 1px solid #10b981; padding: 10px; border-radius: 6px; margin-bottom: 10px; color: #a1a1aa;">
                <span style="color: #10b981; font-weight: bold;">[TRUTH]</span> ${stmt}
            </div>`;
        }
    });

    let winnersText = data.correctGuessers.length > 0 
        ? `<span style="color: #10b981;">Caught the lie: ${data.correctGuessers.join(', ')} 🎉</span>` 
        : `<span style="color: #ef4444;">No one caught the lie! ${data.targetName} fooled everyone! 😎</span>`;

    let targetBonus = data.fooledCount > 0 
        ? `<p style="color: #f59e0b; margin-top: 10px; font-weight: bold;">${data.targetName} earned +${data.fooledCount * 15} points for fooling ${data.fooledCount} friends!</p>`
        : `<p style="color: #a1a1aa; margin-top: 10px;">${data.targetName} failed to fool anyone.</p>`;

    document.getElementById('game-content').innerHTML = `
        ${renderScoreboard(data.scores)}
        <div class="tol-panel" style="text-align: left;">
            <h3 style="color: white; margin-bottom: 20px; text-align: center; text-transform: uppercase;">The Truth About ${data.targetName}</h3>
            
            ${stmtHTML}
            
            <div style="background: #111; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center;">
                <p style="font-size: 16px;">${winnersText}</p>
                ${targetBonus}
            </div>
            
            <br>
            <div style="text-align: center;">
                ${amIHost ? `<button class="menu-btn btn-green" onclick="playClick(); socket.emit('nextTolRound', currentRoomCode)">NEXT PLAYER ➡️</button>` : `<p style="color: #a1a1aa; font-size: 13px;">Host is preparing the next interrogation...</p>`}
            </div>
        </div>
    `;
});

// ==========================================
// 🧑‍💻 GAME 13: VEDIC VAULT HACKER
// ==========================================
socket.on('loadMathHacker', (data) => {
    document.getElementById('current-game-title').innerText = "🧑‍💻 Vault Hacker";
    const gameContent = document.getElementById('game-content');
    
    gameContent.innerHTML = `
        ${renderScoreboard(data.scores)}
        <div class="hacker-terminal" id="hacker-screen">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #10b981; padding-bottom: 10px; margin-bottom: 20px;">
                <span class="hacker-text" style="font-size: 14px;">SYSTEM_FIREWALL_ACTIVE</span>
                <span id="math-timer" class="hacker-text" style="font-size: 16px; font-weight: bold;">[ 30.00s ]</span>
            </div>
            
            <p class="hacker-text" style="font-size: 14px; margin-bottom: 5px;">> DECRYPTING MAINFRAME...</p>
            <p class="hacker-text" style="font-size: 14px; margin-bottom: 20px;">> SOLVE TO BYPASS SECURITY:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <h1 class="hacker-text" style="font-size: 55px; letter-spacing: 5px; animation: pulse 2s infinite;">${data.problem}</h1>
            </div>
            
            <div class="hacker-input-wrapper">
                <span>C:\\> </span>
                <input type="number" id="mathGuess" class="hacker-input" autocomplete="off" onkeypress="if(event.key === 'Enter') { playClick(); submitMathGuess(); }">
            </div>
            <button class="menu-btn" style="background: #10b981; color: #000; font-weight: bold; margin-top: 15px; font-family: monospace;" onclick="playClick(); submitMathGuess()">EXECUTE COMMAND 🚀</button>
        </div>
    `;
    setTimeout(() => { const input = document.getElementById('mathGuess'); if(input) input.focus(); }, 100);
});

function submitMathGuess() {
    const guess = document.getElementById('mathGuess').value.trim();
    if(guess) socket.emit('submitMathGuess', { roomCode: currentRoomCode, guess: guess });
    document.getElementById('mathGuess').value = '';
}

socket.on('mathWrongGuess', () => {
    const screen = document.getElementById('hacker-screen');
    const input = document.getElementById('mathGuess');
    if(screen) {
        screen.classList.add('error-flash');
        playBeep(200, 0.2, 'sawtooth');
        setTimeout(() => screen.classList.remove('error-flash'), 300);
    }
    if(input) input.focus();
});

socket.on('mathTimeUpdate', (time) => {
    const t = document.getElementById('math-timer');
    if(t) {
        t.innerText = `[ ${time < 10 ? '0'+time : time}.00s ]`;
        if(time <= 5) {
            t.style.color = '#ef4444';
            playBeep(900, 0.05, 'square');
        }
    }
});

socket.on('mathTurnOver', (data) => {
    playBeep(data.reason === 'hacked' ? 600 : 150, 0.8, data.reason === 'hacked' ? 'sine' : 'sawtooth');
    
    document.getElementById('game-content').innerHTML = `
        ${renderScoreboard(data.scores)}
        <div class="hacker-terminal" style="text-align: center; border-color: ${data.reason === 'hacked' ? '#10b981' : '#ef4444'};">
            <h1 style="font-size: 50px;">${data.reason === 'hacked' ? '🔓' : '🔒'}</h1>
            <h2 class="hacker-text" style="color: ${data.reason === 'hacked' ? '#10b981' : '#ef4444'}; margin-top: 15px;">
                ${data.reason === 'hacked' ? `ACCESS GRANTED TO: ${data.winnerName}` : `ACCESS DENIED: TIMEOUT`}
            </h2>
            <p class="hacker-text" style="margin-top: 20px; font-size: 16px;">Correct Passcode was:</p>
            <h1 class="hacker-text" style="font-size: 40px; margin-top: 5px;">${data.answer}</h1>
            <br>
            ${amIHost ? `<button class="menu-btn" style="background: #10b981; color: black; font-family: monospace; font-weight: bold;" onclick="playClick(); socket.emit('nextMathRound', currentRoomCode)">> INITIALIZE NEXT HACK _</button><button class="menu-btn" style="background: #333; color: white; margin-top: 10px; font-family: monospace;" onclick="renderGameHub()">> RETURN TO ROOT</button>` : `<p class="hacker-text" style="animation: pulse 1s infinite;">> Waiting for Host command...</p>`}
        </div>
    `;
});

// ==========================================
// 🧠 GAME 14: MIND READER AI (WHO IS CLOSER)
// ==========================================
socket.on('loadMindReaderUI', (data) => {
    document.getElementById('current-game-title').innerText = "🧠 Mind Reader AI";
    const gameContent = document.getElementById('game-content');
    
    gameContent.innerHTML = `
        <div class="mind-panel" style="text-align: center;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 10px;">
                <span class="market-ticker" style="color: #818cf8;">● ANALYZING BRAINWAVES</span>
                <span id="mind-timer" style="color: #ef4444; font-size: 24px; font-weight: bold; font-family: monospace;">25s</span>
            </div>
            
            <p style="color: #a1a1aa; font-size: 13px; text-transform: uppercase;">The Quantum Question:</p>
            <h2 style="color: white; font-size: 24px; margin: 10px 0 25px 0; line-height: 1.5;">${data.question}</h2>
            
            ${data.isSolo ? `<p style="color: #34d399; font-size: 12px; font-weight: bold; margin-bottom: 10px;">🤖 AI BOTS CONNECTED & READY TO GUESS</p>` : ''}
            
            <div style="background: rgba(0,0,0,0.4); padding: 15px; border-radius: 8px; border: 1px solid #222; max-width: 280px; margin: 0 auto 20px auto;">
                <input type="number" id="mindGuessInput" placeholder="Enter your numeric guess..." class="input-field" style="text-align: center; font-size: 22px; font-family: monospace;" onkeypress="if(event.key === 'Enter') { playClick(); submitMindGuess(); }">
            </div>
            
            <button id="mindSubmitBtn" class="menu-btn btn-blue" style="max-width: 200px; margin: 0 auto;" onclick="playClick(); submitMindGuess()">TRANSMIT GUESS 📡</button>
        </div>
    `;
    setTimeout(() => { const input = document.getElementById('mindGuessInput'); if(input) input.focus(); }, 100);
});

function submitMindGuess() {
    const guess = document.getElementById('mindGuessInput').value.trim();
    if(!guess) return alert("Pehle koi number toh likho!");
    
    socket.emit('submitMindGuess', { roomCode: currentRoomCode, guess: guess });
    
    // UI Disabled mode till results
    document.getElementById('mindSubmitBtn').disabled = true;
    document.getElementById('mindSubmitBtn').innerText = "LOCKING DATA... 🔒";
    document.getElementById('mindGuessInput').disabled = true;
}

socket.on('mindTimeUpdate', (time) => {
    const t = document.getElementById('mind-timer');
    if(t) {
        t.innerText = time + 's';
        if(time <= 5) {
            t.style.color = '#ef4444';
            playBeep(700, 0.08, 'square');
        }
    }
});

socket.on('mindReaderResults', (data) => {
    playMagicSound();
    const gameContent = document.getElementById('game-content');
    
    let leaderboardHTML = '<div style="margin-top: 20px; text-align: left;">';
    data.leaderboard.forEach(r => {
        leaderboardHTML += `
            <div class="result-row">
                <span>👤 ${r.name}</span>
                <span style="color: #eab308; font-weight: bold;">Guess: ${r.guess}</span>
            </div>
        `;
    });
    leaderboardHTML += '</div>';

    gameContent.innerHTML = `
        ${renderScoreboard(data.scores)}
        <div class="mind-panel" style="text-align: center;">
            <h1 style="font-size: 55px; margin-bottom: 5px;">🔮</h1>
            <h3 style="color: #818cf8; text-transform: uppercase;">The Absolute Truth</h3>
            
            <div style="background: #000; padding: 20px; border-radius: 8px; margin: 15px 0; border: 2px solid #34d399;">
                <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 5px;">CORRECT ANSWER:</p>
                <h1 style="color: #34d399; font-size: 45px; font-family: monospace; font-weight: bold;">${data.correctAnswer}</h1>
            </div>
            
            <p style="color: #a1a1aa;">Closest to reality:</p>
            <h2 class="winner-glow">🏆 ${data.winnerName} 🏆</h2>
            
            ${leaderboardHTML}
            <br>
            ${amIHost ? `<button class="menu-btn btn-green" onclick="playClick(); socket.emit('startMindReader', currentRoomCode)">NEXT DATA SCAN ➡️</button>` : `<p class="market-ticker">Host is preparing the next query pack...</p>`}
        </div>
    `;
});

// ==========================================
// 🤥 GAME 15: LIE DETECTOR AI
// ==========================================
socket.on('loadLieDetectorUI', (data) => {
    document.getElementById('current-game-title').innerText = "🤥 Lie Detector AI";
    const gameContent = document.getElementById('game-content');
    
    let actionHTML = '';

    if (data.isSolo) {
        // Solo Mode Screen
        actionHTML = `
            <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 20px;">AI is tracking your pulse rate. Be honest!</p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button class="menu-btn btn-green" style="max-width: 140px;" onclick="playClick(); submitLieVote('truth')">🟢 SACH</button>
                <button class="menu-btn" style="background:#ef4444; color:white; max-width: 140px;" onclick="playClick(); submitLieVote('lie')">🔴 JHOOTH</button>
            </div>
        `;
    } else if (data.isMyScan) {
        // Multiplayer: Main target jiska live operation chal raha hai
        actionHTML = `
            <div style="background: rgba(239,68,68,0.1); padding: 15px; border-radius: 6px; border: 1px dashed #ef4444;">
                <h3 class="pulse-glow-red">⚡ AAP DETECTOR PAR HAIN! ⚡</h3>
                <p style="color: #a1a1aa; font-size: 13px; margin-top: 5px;">Face expression normal rakho, dost aapka test le rahe hain!</p>
            </div>
        `;
    } else {
        // Multiplayer: Baaki saare dost jo guess karenge
        actionHTML = `
            <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 20px;">What do you think? Is <b>${data.targetName}</b> capping or speaking facts?</p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button class="menu-btn btn-blue" style="max-width: 140px;" onclick="playClick(); submitLieVote('truth')">🔥 TRUTH</button>
                <button class="menu-btn" style="background:#f59e0b; color:black; max-width: 140px; border:none;" onclick="playClick(); submitLieVote('lie')">🚨 BLUFF</button>
            </div>
        `;
    }

    gameContent.innerHTML = `
        <div class="lie-panel" style="text-align: center;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #222; padding-bottom: 10px;">
                <span class="market-ticker" style="color: #ef4444;">● NEON CORONARY SCANNER</span>
                <span id="lie-timer" style="color: white; font-size: 24px; font-weight: bold; font-family: monospace;">20s</span>
            </div>
            
            <p style="color: #a1a1aa; font-size: 13px; text-transform: uppercase;">The Interrogation Subject:</p>
            <h2 style="color: white; font-size: 22px; margin: 10px 0 30px 0; line-height: 1.5;">"${data.statement}"</h2>
            
            <div id="lie-action-area">${actionHTML}</div>
        </div>
    `;
});

function submitLieVote(voteType) {
    socket.emit('submitLieVote', { roomCode: currentRoomCode, vote: voteType });
    const area = document.getElementById('lie-action-area');
    if(area) area.innerHTML = `<h3 style="color: #3b82f6; animation: pulse 1s infinite;">TRANSMITTING BIOMETRICS... 📡</h3>`;
}

socket.on('lieTimeUpdate', (time) => {
    const t = document.getElementById('lie-timer');
    if(t) {
        t.innerText = time + 's';
        if(time <= 5) {
            t.style.color = '#ef4444';
            playBeep(900, 0.05, 'sawtooth');
        }
    }
});

socket.on('lieResults', (data) => {
    playBeep(500, 0.3, 'square');
    document.getElementById('game-content').innerHTML = `
        ${renderScoreboard(data.scores)}
        <div class="lie-panel" style="text-align: center; border-color: #ef4444;">
            <h1 style="font-size: 65px; margin-bottom: 10px;">📡</h1>
            <h3 style="color: #ef4444; text-transform: uppercase; letter-spacing: 1px;">Polygraph Resolution Completed</h3>
            
            <div style="background: rgba(0,0,0,0.8); padding: 25px; border-radius: 8px; margin: 20px 0; border: 1px solid #333; font-size: 18px; color: white; font-family: monospace; line-height: 1.6;">
                ${data.resultMsg}
            </div>
            
            ${amIHost ? `<button class="menu-btn btn-green" onclick="playClick(); socket.emit('startLieDetector', currentRoomCode)">NEXT TARGET SCAN ➡️</button>` : `<p class="market-ticker">Awaiting system sequence from Host...</p>`}
        </div>
    `;
});

// ==========================================
// 🤷‍♂️ GAME 16: PARADOX AI (WOULD YOU RATHER)
// ==========================================
socket.on('loadParadoxUI', (data) => {
    document.getElementById('current-game-title').innerText = "🤷‍♂️ Paradox AI";
    const gameContent = document.getElementById('game-content');
    
    gameContent.innerHTML = `
        <div class="paradox-panel" style="text-align: center;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #222; padding-bottom: 10px;">
                <span class="market-ticker" style="color: #34d399;">● SOLVING QUANTUM DILEMMA</span>
                <span id="paradox-timer" style="color: white; font-size: 24px; font-weight: bold; font-family: monospace;">20s</span>
            </div>
            
            <h3 style="color: #eab308; text-transform: uppercase; margin-bottom: 25px; letter-spacing: 1px;">WOULD YOU RATHER...</h3>
            
            <div id="paradox-action-area" style="display: grid; grid-template-columns: 1fr; gap: 15px; max-width: 320px; margin: 0 auto;">
                <div class="split-choice-btn" style="background: rgba(59,130,246,0.1); border-color: #3b82f6;" onclick="submitParadoxVote('A')">
                    <span style="color:#3b82f6; display:block; font-size:20px; margin-bottom:5px;">OPTION A</span>
                    ${data.optionA}
                </div>
                <div class="split-choice-btn" style="background: rgba(236,72,153,0.1); border-color: #ec4899;" onclick="submitParadoxVote('B')">
                    <span style="color:#ec4899; display:block; font-size:20px; margin-bottom:5px;">OPTION B</span>
                    ${data.optionB}
                </div>
            </div>
        </div>
    `;
});

function submitParadoxVote(choiceMade) {
    playClick();
    socket.emit('submitParadoxVote', { roomCode: currentRoomCode, choice: choiceMade });
    const area = document.getElementById('paradox-action-area');
    if(area) area.innerHTML = `<h3 style="color: #34d399; animation: pulse 1s infinite; margin-top:20px;">VOTE LOCKED IN GRID... 📡</h3>`;
}

socket.on('paradoxTimeUpdate', (time) => {
    const t = document.getElementById('paradox-timer');
    if(t) {
        t.innerText = time + 's';
        if(time <= 5) {
            t.style.color = '#ef4444';
            playBeep(850, 0.05, 'sine');
        }
    }
});

socket.on('paradoxResults', (data) => {
    playMagicSound();
    document.getElementById('game-content').innerHTML = `
        \${renderScoreboard(data.scores)}
        <div class="paradox-panel" style="text-align: center; border-color: #34d399;">
            <h1 style="font-size: 60px; margin-bottom: 10px;">📊</h1>
            <h3 style="color: #34d399; text-transform: uppercase;">Paradox Alignment Resolved</h3>
            
            <div style="background: rgba(0,0,0,0.8); padding: 25px; border-radius: 8px; margin: 20px 0; border: 1px solid #222; font-size: 16px; color: white; font-family: monospace; line-height: 1.8; text-align: left;">
                ${data.report}
            </div>
            
            ${amIHost ? `<button class="menu-btn btn-green" onclick="playClick(); socket.emit('startParadox', currentRoomCode)">NEXT PARADOX MATRIX ➡️</button>` : `<p class="market-ticker">Waiting for Host sequence shift...</p>`}
        </div>
    `;
});

// ==========================================
// ⚡ GAME 17: FLASH BUZZ AI QUIZ
// ==========================================
socket.on('loadFlashBuzzUI', (data) => {
    document.getElementById('current-game-title').innerText = "⚡ Flash Buzz AI";
    const gameContent = document.getElementById('game-content');
    
    gameContent.innerHTML = `
        <div class="buzz-panel" style="text-align: center;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #222; padding-bottom: 10px;">
                <span class="market-ticker" style="color: #eab308;">● CENTRAL BUZZ REFLEX LAYER</span>
                <span id="buzz-timer" style="color: white; font-size: 24px; font-weight: bold; font-family: monospace;">15s</span>
            </div>
            
            <p style="color: #a1a1aa; font-size: 13px; text-transform: uppercase;">Incoming Question:</p>
            <h2 style="color: white; font-size: 22px; margin: 10px 0 30px 0; line-height: 1.5;">${data.question}</h2>
            
            <div id="buzz-interaction-zone">
                <p style="color: #ef4444; font-weight: bold; font-size: 14px; animation: pulse 1s infinite;">SMASH THE BUZZER FIRST TO ANSWER!</p>
                <button class="big-buzzer-btn" onclick="triggerBuzzerClick()">BUZZ! 🚨</button>
            </div>
        </div>
    `;
    
    // Store globally inside context window to execute option choices later
    window.currentQuizOptions = data.options;
});

function triggerBuzzerClick() {
    playBeep(900, 0.15, 'sawtooth');
    socket.emit('pressBuzzer', currentRoomCode);
}

socket.on('buzzTimeUpdate', (time) => {
    const t = document.getElementById('buzz-timer');
    if(t) {
        t.innerText = time + 's';
        if(time <= 5) {
            t.style.color = '#ef4444';
            playBeep(950, 0.04, 'square');
        }
    }
});

socket.on('buzzerLocked', (data) => {
    const zone = document.getElementById('buzz-interaction-zone');
    if(!zone) return;

    if (data.playerId === socket.id) {
        // Agar maine pehle buzzer dabaya toh options dikhao!
        let optionsHTML = '<div style="display: flex; flex-direction: column; gap: 10px; max-width: 300px; margin: 20px auto 0 auto;">';
        window.currentQuizOptions.forEach(opt => {
            optionsHTML += `<button class="quiz-opt-btn" onclick="playClick(); submitBuzzAnswer('${opt}')">🔹 ${opt}</button>`;
        });
        optionsHTML += '</div>';

        zone.innerHTML = `
            <h3 style="color: #10b981; animation: pulse 1s infinite;">🟢 LOCK IN YOUR ANSWER QUICK!</h3>
            ${optionsHTML}
        `;
    } else {
        // Agar kisi dost ne pehle dabiya toh lock screen dikhao
        zone.innerHTML = `
            <div style="background: rgba(239,68,68,0.1); padding: 20px; border-radius: 8px; border: 1px solid #ef4444; max-width: 280px; margin: 0 auto;">
                <h3 style="color: #ef4444;">🔒 BUZZER LOCKED!</h3>
                <p style="color: white; margin-top: 5px;"><b>${data.playerName}</b> reacted faster than you!</p>
            </div>
        `;
    }
});

function submitBuzzAnswer(optionSelected) {
    socket.emit('submitBuzzAnswer', { roomCode: currentRoomCode, selectedOption: optionSelected });
}

socket.on('buzzTurnOver', (data) => {
    playMagicSound();
    const gameContent = document.getElementById('game-content');
    let reportHTML = "";

    if (data.reason === 'correct') {
        reportHTML = `<h2 style="color: #10b981; margin-bottom: 10px;">🎉 Correct Answer! 🎉</h2><p style="color: white;"><b>${data.winnerName}</b> locked [ ${data.playerSelection} ] and secured 20 Points.</p>`;
    } else if (data.reason === 'wrong') {
        reportHTML = `<h2 style="color: #ef4444; margin-bottom: 10px;">❌ Wrong Answer! ❌</h2><p style="color: white;"><b>${data.winnerName}</b> answered [ ${data.playerSelection} ] and lost 10 Points.<br><br>Correct answer was: <b style="color: #10b981;">${data.correctAnswer}</b></p>`;
    } else if (data.reason === 'ai_hacked') {
        reportHTML = `<h2 style="color: #ef4444; margin-bottom: 10px;">🤖 AI Bot Overrides Firewall!</h2><p style="color: white;">The system bot swiped the buzzer and chose: <br><b style="color: #eab308;">${data.aiSelection}</b><br><br>The actual answer is: <b style="color: #10b981;">${data.correctAnswer}</b></p>`;
    } else {
        reportHTML = `<h2 style="color: #f59e0b; margin-bottom: 10px;">⏳ Buzzer System Timeout</h2><p style="color: white;">No one reacted within 15 seconds. <br>The passcode response was: <b style="color: #10b981;">${data.correctAnswer}</b></p>`;
    }

    gameContent.innerHTML = `
        ${renderScoreboard(data.scores)}
        <div class="buzz-panel" style="text-align: center; border-color: #eab308;">
            <h1 style="font-size: 55px; margin-bottom: 10px;">📡</h1>
            <div style="background: rgba(0,0,0,0.8); padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #333; line-height: 1.6;">
                ${reportHTML}
            </div>
            ${amIHost ? `<button class="menu-btn btn-green" onclick="playClick(); socket.emit('startFlashBuzz', currentRoomCode)">NEXT BUZZ CYCLE ➡️</button>` : `<p class="market-ticker">Awaiting next host execution block...</p>`}
        </div>
    `;
});

// ==========================================
// 🔮 GAME 18: FORTUNE SAMOSA (ROAST MACHINE)
// ==========================================
socket.on('loadFortuneSamosaUI', (data) => {
    document.getElementById('current-game-title').innerText = "🔮 Fortune Samosa";
    const gameContent = document.getElementById('game-content');
    
    gameContent.innerHTML = `
        <div class="samosa-panel" style="text-align: center;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #44321a; padding-bottom: 10px;">
                <span class="market-ticker" style="color: #f59e0b;">● DESTINY ORACLE OVERRIDE</span>
                <span id="samosa-timer" style="color: white; font-size: 24px; font-weight: bold; font-family: monospace;">20s</span>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h1 style="font-size: 65px; margin: 0; animation: pulse 1.5s infinite;">🥠</h1>
            </div>
            
            <div class="samosa-card" id="samosa-main-text">
                \${data.prediction}
            </div>
            
            <p style="color: #a1a1aa; font-size: 14px; margin: 25px 0 15px 0; font-weight: bold;">Do you lock this destiny prediction?</p>
            
            <div id="samosa-action-block" style="display: flex; gap: 15px; justify-content: center;">
                <button class="menu-btn samosa-btn-yes" style="max-width: 150px;" onclick="submitSamosaVote('WILL_HAPPEN')">🔥 100% BARBADI</button>
                <button class="menu-btn samosa-btn-no" style="max-width: 150px;" onclick="submitSamosaVote('NO_WAY')">🛡️ NO CHANCE</button>
            </div>
        </div>
    `;
});

function submitSamosaVote(voteType) {
    playClick();
    socket.emit('submitSamosaVote', { roomCode: currentRoomCode, vote: voteType });
    const block = document.getElementById('samosa-action-block');
    if(block) block.innerHTML = `<h3 style="color: #f59e0b; animation: pulse 1s infinite; margin-top:10px;">BET REGISTERED WITH THE ORACLE... 🔮</h3>`;
}

socket.on('samosaTimeUpdate', (time) => {
    const t = document.getElementById('samosa-timer');
    if(t) {
        t.innerText = time + 's';
        if(time <= 5) {
            t.style.color = '#ef4444';
            playBeep(600, 0.1, 'sawtooth');
        }
    }
});

socket.on('samosaVerdict', (data) => {
    playMagicSound();
    document.getElementById('game-content').innerHTML = `
        \${renderScoreboard(data.scores)}
        <div class="samosa-panel" style="text-align: center; border-color: #f59e0b;">
            <h1 style="font-size: 60px; margin-bottom: 10px;">💥</h1>
            <h2 style="color: #f59e0b; text-transform: uppercase; letter-spacing: 1px;">Kismat Ka Faisla</h2>
            
            <div style="background: rgba(0,0,0,0.8); padding: 25px; border-radius: 10px; margin: 20px 0; border: 1px dashed #f59e0b; line-height: 1.8;">
                ${data.verdict}
            </div>
            
            ${amIHost ? `<button class="menu-btn btn-green" onclick="playClick(); socket.emit('startFortuneSamosa', currentRoomCode)">ROAST NEXT PLAYER ➡️</button>` : `<p class="market-ticker">Host is breaking the next samosa card...</p>`}
        </div>
    `;
});

// ==========================================
// ❤️ SECRET PROPOSAL LOGIC
// ==========================================
const secretMessage = "System checks completed. Target identified: YOU. 🖥️💞 Kuch baatein doston ke beech haste-haste nahi boli jaati, isiliye is secret box ka use kar raha hoon. Maine bohot saare codes aur logics likhe hain, par tumhare liye jo feelings hain uske liye koi syntax nahi bana. Tumhare sath bitaya hua har ek minute meri life ka sabse best loop hai jise main kabhi break nahi karna chahta. Ek dosti toh humne bohot acche se nibhai hai, ab baki ki poori zindagi kya ek naya rishta shuru karein? Universe ke is network mein, kya tum hamesha ke liye meri official Player 2 aur partner-in-crime banogi? Will you hold my hand forever? 🔐❤️";

let typingSpeed = 60;
let charIndex = 0;

function openEnvelope() {
    document.getElementById('proposal-actions').style.display = 'none';
    document.getElementById('letter-container').innerHTML = '';
    charIndex = 0;
    startFloatingHearts();
    typeWriter();
}

function typeWriter() {
    if (charIndex < secretMessage.length) {
        document.getElementById('letter-container').innerHTML += secretMessage.charAt(charIndex);
        charIndex++;
        setTimeout(typeWriter, typingSpeed);
    } else {
        const actionsDiv = document.getElementById('proposal-actions');
        actionsDiv.innerHTML = `
            <button class="menu-btn btn-romantic" onclick="sheSaidYes()">Yes, Absolutely! ✨</button>
            <button class="menu-btn btn-glass" id="no-btn" onmouseover="dodgeButton()" onclick="dodgeButton()">Let me think... 🤔</button>
        `;
        actionsDiv.style.display = 'block';
    }
}

function dodgeButton() {
    const noBtn = document.getElementById('no-btn');
    const x = Math.random() * 200 - 100;
    const y = Math.random() * 200 - 100;
    noBtn.style.transform = `translate(${x}px, ${y}px)`;
    noBtn.style.transition = 'transform 0.2s ease';
}

function startFloatingHearts() {
    const container = document.getElementById('hearts-container');
    if(!container) return;
    
    heartInterval = setInterval(() => {
        const heart = document.createElement('div');
        heart.classList.add('floating-heart');
        heart.innerHTML = '❤️';
        heart.style.left = Math.random() * 100 + 'vw';
        heart.style.animationDuration = (Math.random() * 3 + 4) + 's';
        heart.style.fontSize = (Math.random() * 15 + 15) + 'px';
        
        container.appendChild(heart);
        setTimeout(() => heart.remove(), 7000); 
    }, 400);
}

function sheSaidYes() {
    playMagicSound();
    
    const proposalView = document.getElementById('proposal-view');
    proposalView.innerHTML = `
        <div id="hearts-container"></div>
        <div class="proposal-content" style="text-align: center; margin-top: 50px;">
            <h1 style="font-size: 70px; margin-bottom: 20px; animation: pulse 1s infinite;">💖</h1>
            <h2 style="color: #ef4444; font-size: 36px; margin-bottom: 15px;">I promise to be the best!</h2>
            <p style="color: #a1a1aa; font-size: 20px;">Our new journey starts right now...</p>
        </div>
    `;
    
    clearInterval(heartInterval);
    setInterval(() => {
        const container = document.getElementById('hearts-container');
        if(!container) return;
        const heart = document.createElement('div');
        heart.classList.add('floating-heart');
        heart.innerHTML = '💖';
        heart.style.left = Math.random() * 100 + 'vw';
        heart.style.animationDuration = (Math.random() * 2 + 2) + 's'; 
        heart.style.fontSize = (Math.random() * 20 + 20) + 'px';
        container.appendChild(heart);
        setTimeout(() => heart.remove(), 4000);
    }, 150);
}

// ==========================================
// 📱 PASS & PLAY (LOCAL OFFLINE LOGIC)
// ==========================================

// --- 1. LOCAL TIC-TAC-TOE ---
let localTttBoard = ['', '', '', '', '', '', '', '', ''];
let localTttTurn = 'X';
let localTttActive = false;

function startLocalTicTacToe() {
    switchView('offline-game-view');
    document.getElementById('offline-game-title').innerText = "❌⭕ Local Tic-Tac-Toe";
    localTttBoard = ['', '', '', '', '', '', '', '', ''];
    localTttTurn = 'X';
    localTttActive = true;
    renderLocalTicTacToe();
}

function renderLocalTicTacToe() {
    let gridHTML = `<div style="display: grid; grid-template-columns: repeat(3, 80px); gap: 8px; justify-content: center; margin: 20px auto;">`;
    localTttBoard.forEach((cell, index) => {
        let color = cell === 'X' ? '#ef4444' : (cell === 'O' ? '#3b82f6' : 'white');
        gridHTML += `<div onclick="makeLocalTttMove(${index})" style="width: 80px; height: 80px; background: #2a2a35; border: 2px solid #444; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 45px; font-weight: bold; cursor: pointer; color: ${color};">${cell}</div>`;
    });
    gridHTML += `</div>`;
    
    let statusHTML = localTttActive ? `<p style="color: #eab308; font-size: 18px;">Player <b>${localTttTurn}</b> ki baari hai!</p>` : `<button class="menu-btn btn-green" onclick="playClick(); startLocalTicTacToe()" style="margin-top: 15px;">PLAY AGAIN 🔄</button>`;

    document.getElementById('offline-game-content').innerHTML = `
        <div class="trading-panel" style="text-align: center;">
            ${statusHTML}
            ${gridHTML}
        </div>
    `;
}

function makeLocalTttMove(index) {
    if(!localTttActive || localTttBoard[index] !== '') return;
    playClick();
    localTttBoard[index] = localTttTurn;
    checkLocalTttWin();
    if(localTttActive) {
        localTttTurn = localTttTurn === 'X' ? 'O' : 'X';
        renderLocalTicTacToe();
    }
}

function checkLocalTttWin() {
    const winPatterns = [ [0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6] ];
    for(let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if(localTttBoard[a] && localTttBoard[a] === localTttBoard[b] && localTttBoard[a] === localTttBoard[c]) {
            localTttActive = false;
            playMagicSound();
            document.getElementById('offline-game-content').innerHTML = `
                <div class="trading-panel" style="text-align: center; border-color: #10b981; box-shadow: 0 0 30px rgba(16,185,129,0.2);">
                    <h1 style="font-size: 60px; margin-bottom: 10px;">🏆</h1>
                    <h2 style="color: #10b981; margin: 15px 0;">Player ${localTttBoard[a]} Wins!</h2>
                    <button class="menu-btn btn-blue" onclick="playClick(); startLocalTicTacToe()">Rematch 🔄</button>
                </div>
            `;
            return;
        }
    }
    if(!localTttBoard.includes('')) {
        localTttActive = false;
        playBeep(200, 0.5, 'sawtooth');
        document.getElementById('offline-game-content').innerHTML = `
            <div class="trading-panel" style="text-align: center;">
                <h1 style="font-size: 60px; margin-bottom: 10px;">🤝</h1>
                <h2 style="color: #a1a1aa; margin: 15px 0;">Game Draw!</h2>
                <button class="menu-btn btn-blue" onclick="playClick(); startLocalTicTacToe()">Rematch 🔄</button>
            </div>
        `;
    }
}

// --- 2. TRUTH OR DARE ---
const todQuestions = {
    truth: [
        "Tera sabse ganda secret kya hai?", 
        "Group mein sabse zyada crush kis par tha/hai?", 
        "Phone mein sabse ajeeb search history kya hai?", 
        "Mummy papa se bola hua sabse bada jhooth?", 
        "Agar ek din ke liye invisible ho gaya, toh kya karega?"
    ],
    dare: [
        "Apne crush ko 'I miss you' text kar aur screenshot dikha!", 
        "Agale 5 minute tak samne wale player ki acting kar.", 
        "Phone unlock karke kisi ek dost ko apni chat history padhne de.", 
        "Ek glass pani bina haath lagaye pi kar dikha!", 
        "Apni aakhri 3 selfies group mein sabko dikha."
    ]
};

function startTruthOrDare() {
    switchView('offline-game-view');
    document.getElementById('offline-game-title').innerText = "🔥 Truth or Dare";
    renderToDChoice();
}

function renderToDChoice() {
    document.getElementById('offline-game-content').innerHTML = `
        <div class="trading-panel" style="text-align: center; border-color: #eab308; padding: 40px 20px;">
            <p style="color: #a1a1aa; font-size: 16px; margin-bottom: 30px;">Phone agle player ko pass karo aur choose karo!</p>
            <div style="display: flex; gap: 20px; justify-content: center;">
                <button class="menu-btn btn-blue" style="width: 130px; height: 130px; border-radius: 50%; font-size: 22px; font-weight: bold; box-shadow: 0 0 20px rgba(59,130,246,0.3);" onclick="playClick(); showToD('truth')">TRUTH<br>😇</button>
                <button class="menu-btn" style="background: #ef4444; color: white; width: 130px; height: 130px; border-radius: 50%; font-size: 22px; font-weight: bold; border: none; box-shadow: 0 0 20px rgba(239,68,68,0.3);" onclick="playClick(); showToD('dare')">DARE<br>😈</button>
            </div>
        </div>
    `;
}

function showToD(type) {
    playMagicSound();
    const qList = todQuestions[type];
    const q = qList[Math.floor(Math.random() * qList.length)];
    const color = type === 'truth' ? '#3b82f6' : '#ef4444';
    
    document.getElementById('offline-game-content').innerHTML = `
        <div class="trading-panel" style="text-align: center; border-color: ${color}; box-shadow: 0 0 30px ${color}40;">
            <h1 style="font-size: 60px; margin-bottom: 10px; animation: pulse 1s infinite;">${type === 'truth' ? '😇' : '😈'}</h1>
            <h2 style="color: ${color}; text-transform: uppercase; letter-spacing: 2px;">YOUR ${type}</h2>
            <div style="background: #000; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px dashed ${color};">
                <h3 style="color: white; font-size: 22px; font-style: italic; line-height: 1.5;">"${q}"</h3>
            </div>
            <button class="menu-btn btn-green" onclick="playClick(); renderToDChoice()">DONE (NEXT TURN) ➡️</button>
        </div>
    `;
}

// ==========================================
// ℹ️ THE 18 GAME MASTER RULES MATRIX
// ==========================================
const gameRulesDictionary = {
    'wordSniperLogic': {
        title: "🎯 WORD SNIPER",
        desc: "<b>Objective:</b> Unscramble the letters to guess the hidden words!<br><br><b>How to Play:</b> Screen par twisted text aayega. Sabse pehle input console mein right answer type karne wale player ko high-caliber points milenge. Speed aur accuracy dono matter karti hai!"
    },
    'ticTacToeLogic': {
        title: "❌⭕ MULTIPLAYER TIC-TAC-TOE",
        desc: "<b>Objective:</b> Classic 3x3 grid system in multiplayer match.<br><br><b>How to Play:</b> Grid par row, column, ya diagonal mein lagataar 3 symbols (X ya O) align karo. Turn based action hai, dimaag se block aur attack dono manage karo."
    },
    'blindDealLogic': {
        title: "💰 THE BLIND DEAL",
        desc: "<b>Objective:</b> High-risk trading and investment simulator.<br><br><b>How to Play:</b> Server random assets aur scrap deals display karega. Tumhe secretly andha bet (blind deal) lagana hai. Sabse sharp trade lagane wala ameer banega, baaki bankrupt!"
    },
    'secretMissionLogic': {
        title: "🕵️‍♂️ SECRET MISSION",
        desc: "<b>Objective:</b> Identify the hidden spy inside the operation network.<br><br><b>How to Play:</b> Sabhi players ko ek safe location ya code dikhega, par ek bande ko sirf 'SPY' dikhega. Spy ko bina pakde location guess karni hai aur baaki logon ko spy ko vote out karna hai."
    },
    'bluffBattleLogic': {
        title: "🃏 BLUFF BATTLE",
        desc: "<b>Objective:</b> Cyber deception and digital card passing combat.<br><br><b>How to Play:</b> Apne kharab cards ko dusron ko pass karo bluff karke! Agar saamne wale ne tumhara bluff pakad liya toh tumhe heavy penalty lagegi. Face expression normal rakho."
    },
    'drawAndGuessLogic': {
        title: "🎨 DRAW & GUESS",
        desc: "<b>Objective:</b> Real-time digital canvas sync drawing match.<br><br><b>How to Play:</b> Ek player ko word milega jo usko screen par draw karna hai. Baaki saare players live chat system mein real-time guessing karenge. Jitna jaldi guess karoge, utne zyada points!"
    },
    'exposeLogic': {
        title: "🎯 THE EXPOSÉ",
        desc: "<b>Objective:</b> Interrogation room matrix voting dynamic.<br><br><b>How to Play:</b> Screen par spicy, controversial aur funny sawaal aayenge. Sabko secretly vote karna hai ki unke doston mein se kaun sabse bada culprit hai. Jise max votes milenge, us par GUILTY ka stamp lagega!"
    },
    'wyrLogic': {
        title: "🤷‍♂️ WOULD YOU RATHER (CLASSIC)",
        desc: "<b>Objective:</b> Toughest decision-making challenge with the squad.<br><br><b>How to Play:</b> Screen par do ajeeb alternatives aayenge. Sabko ek ko vote karna hai. Majority ke sath chalne par network tokens balance honge."
    },
    'wkmLogic': {
        title: "👥 WHO KNOWS ME?",
        desc: "<b>Objective:</b> Check your loyalty and friendship limits.<br><br><b>How to Play:</b> Room host ya main core player apne baare mein ajeeb personal sawaal set karega. Baaki doston ko guess karna hai ki host ka exact choice kya hai. Sabse sachha dost jeetega."
    },
    'emojiStoryLogic': {
        title: "📝 EMOJI STORY",
        desc: "<b>Objective:</b> Decrypt cinematic sequences using only graphical assets.<br><br><b>How to Play:</b> Screen par limited emojis display hongi (e.g., 🦁👑🎬). Tumhe us pure combination se correct movie name, song, ya situational word identify karke console mein transmit karna hai."
    },
    'fastQuizLogic': {
        title: "⚡ FAST QUIZ",
        desc: "<b>Objective:</b> Extreme reflex time testing trivia combo.<br><br><b>How to Play:</b> Direct high-voltage technical aur dynamic general quiz options screen par drop honge. Jo player milliseconds ke andar sahi answer tap karega, wahi table topper banega."
    },
    'tolLogic': {
        title: "🤥 TRUTH OR LIE",
        desc: "<b>Objective:</b> Analyze complex logs to detect structural fabrications.<br><br><b>How to Play:</b> Ek player ek statement lock karega. Baaki log cryptographic parameters ya behavior analyze karke check karenge ki system feed Genuine (Truth) hai ya Fabricated (Lie)."
    },
    'mathHackerLogic': {
        title: "🧑‍💻 VAULT HACKER",
        desc: "<b>Objective:</b> Terminal level speed calculations using speed-math metrics.<br><br><b>How to Play:</b> Cyberpunk screen par complex Vedic maths encrypted numerical locks heavy flow mein aayenge. Jo hacker milliseconds ke andar correct numerical root inject karega, firewall crash karke points uda le jayega."
    },
    'mindReaderLogic': {
        title: "🧠 MIND READER AI",
        desc: "<b>Objective:</b> Quantum numeric brainwave proximity test.<br><br><b>How to Play:</b> Game statistical ya funny data evaluation questions degi. Sabko numeric integers mein guesses daalne hain. Solo mode mein 3 AI Bots (Pappu, Dhinchak, Shana) tumhare calculations ko crash karne aayenge!"
    },
    'lieDetectorLogic': {
        title: "🤥 LIE DETECTOR AI",
        desc: "<b>Objective:</b> Biometric neon coronary sweep operation.<br><br><b>How to Play:</b> Polygraph interrogation panel ajeeb statement phekega. Multiplayer mein dost target ka thermal tracking test karenge, aur Solo mode mein AI Bot aapke single keystroke mechanics se jhooth aur sach pakdega."
    },
    'paradoxLogic': {
        title: "🤷‍♂️ PARADOX AI",
        desc: "<b>Objective:</b> Unfiltered retro arcade infinite dilemma cycle.<br><br><b>How to Play:</b> 20 super-spicy dimaag hila dene wale structural questions! Dono decisions doston ka dimag kharab kar denge. Solo mode mein system aapko global stats compare karke real-time predictions display karega."
    },
    'flashBuzzLogic': {
        title: "⚡ FLASH BUZZ AI",
        desc: "<b>Objective:</b> High-intensity central reflex combat quiz.<br><br><b>How to Play:</b> Dynamic programming and core concepts testing module. Buzzer button aate hi click smash karna hai. Solo mode mein 'Rogue AI Bot' automated speeds par buzzer intercept karne ki koshish karega!"
    },
    'fortuneSamosaLogic': {
        title: "🔮 FORTUNE SAMOSA",
        desc: "<b>Objective:</b> The ultimate grand destiny roast protocol.<br><br><b>How to Play:</b> Oracle engine room mein baithe players ke names database se capture karega aur unka bhayanak cyber roast text crack karega! Squad ko vote karna hai ki dost ki kismat kharab hogi ya nahi. 40+ dynamic data presets inside."
    }
};

// ==========================================
// ⚙️ CONTROLLER ACTIONS FOR THE MODAL WINDOW
// ==========================================
function openRulesModal() {
    playClick();
    
    // Identify current running game logic token automatically
    // Dynamic fallback checks: check what title or container is active in game loop
    let activeKey = 'wordSniperLogic'; // Standard Fallback root
    
    const gameTitleElement = document.getElementById('current-game-title');
    if (gameTitleElement) {
        const text = gameTitleElement.innerText.trim();
        
        // Dynamic map string check to find internal key routing
        if (text.includes("Word Sniper")) activeKey = 'wordSniperLogic';
        else if (text.includes("Tic-Tac-Toe") && !text.includes("Local")) activeKey = 'ticTacToeLogic';
        else if (text.includes("Blind Deal")) activeKey = 'blindDealLogic';
        else if (text.includes("Secret Mission")) activeKey = 'secretMissionLogic';
        else if (text.includes("Bluff Battle")) activeKey = 'bluffBattleLogic';
        else if (text.includes("Draw & Guess")) activeKey = 'drawAndGuessLogic';
        else if (text.includes("The Exposé")) activeKey = 'exposeLogic';
        else if (text.includes("Vault Hacker")) activeKey = 'mathHackerLogic';
        else if (text.includes("Mind Reader")) activeKey = 'mindReaderLogic';
        else if (text.includes("Lie Detector")) activeKey = 'lieDetectorLogic';
        else if (text.includes("Paradox")) activeKey = 'paradoxLogic';
        else if (text.includes("Flash Buzz")) activeKey = 'flashBuzzLogic';
        else if (text.includes("Fortune Samosa")) activeKey = 'fortuneSamosaLogic';
    }

    const rulesData = gameRulesDictionary[activeKey];
    if (rulesData) {
        document.getElementById('rules-title').innerHTML = rulesData.title;
        document.getElementById('rules-body').innerHTML = rulesData.desc;
    }
    
    document.getElementById('rules-modal').classList.remove('hidden');
}

function closeRulesModal() {
    playClick();
    document.getElementById('rules-modal').classList.add('hidden');
}