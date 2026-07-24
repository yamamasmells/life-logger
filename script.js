/* ============================================================
   LIFE LEDGER V2
   PART 1
   Core State / Input / Combo Engine
============================================================ */
alert("1");

document.body.insertAdjacentHTML(
    "afterbegin",
    "<div style='background:yellow;padding:10px'>JS started</div>"
);
window.onerror = function(message, source, line, column){

    document.body.insertAdjacentHTML(
        "afterbegin",
        `
        <div style="
            position:fixed;
            top:0;
            left:0;
            right:0;
            background:red;
            color:white;
            padding:20px;
            z-index:99999;
            font-size:18px;
            ">
            ERROR:<br>
            ${message}<br>
            Line: ${line}:${column}
        </div>
        `
    );

    return false;
};
const DEFAULT_STATE = {
    players: {
        top: {
            name: "Sydney",
            life: 20,
            wins: 0,
            losses: 0,
            journal: []
        },
        bottom: {
            name: "Adam",
            life: 20,
            wins: 0,
            losses: 0,
            journal: []
        }
    },

    timer: {
        running: false,
        elapsed: 0,
        startTime: null
    },

    games: [],
    startingLife: 20
};

let state = loadState();
let lastState = null;


/* ============================================================
   Elements
============================================================ */

const topPlayer = document.getElementById("sydney");
const bottomPlayer = document.getElementById("adam");

const topLife = document.getElementById("sydney-life");
const bottomLife = document.getElementById("adam-life");

const topName = document.getElementById("sydney-name");
const bottomName = document.getElementById("adam-name");

const timer = document.getElementById("timer");

const gameOver = document.getElementById("game-over");
const winnerText = document.getElementById("winner-text");
const finalTime = document.getElementById("final-time");


/* ============================================================
   Floating Combo State
============================================================ */

const combo = {

    top:{
        amount:0,
        startLife:null,
        timer:null
    },

    bottom:{
        amount:0,
        startLife:null,
        timer:null
    }

};


/* ============================================================
   Create Floating Combo Indicators
============================================================ */

function createComboBubble(player){

    const bubble=document.createElement("div");

    bubble.className="combo-bubble";

    bubble.id=player+"-combo";

    bubble.style.opacity=0;

    document
        .getElementById(player==="top"?"sydney":"adam")
        .appendChild(bubble);

}

createComboBubble("top");
createComboBubble("bottom");

function createJournal(player){

    const journal=document.createElement("div");

    journal.className="life-journal";

    journal.id=player+"-journal";

    document
        .getElementById(player==="top"?"sydney":"adam")
        .appendChild(journal);

}

createJournal("top");
createJournal("bottom");


/* ============================================================
   Tap Controls
============================================================ */

topPlayer.addEventListener("click",e=>{

    if(gameOverVisible()) return;

    const rect=topPlayer.getBoundingClientRect();

    const y=e.clientY-rect.top;

    /* top player is rotated */

    if(y<rect.height/2){

        changeLife("top",-1);

    }else{

        changeLife("top",1);

    }

});

bottomPlayer.addEventListener("click",e=>{

    if(gameOverVisible()) return;

    const rect=bottomPlayer.getBoundingClientRect();

    const y=e.clientY-rect.top;

    if(y<rect.height/2){

        changeLife("bottom",1);

    }else{

        changeLife("bottom",-1);

    }

});


/* ============================================================
   Combo Bubble
============================================================ */

function updateComboBubble(player){

    const bubble = document.getElementById(player + "-combo");

    const value = combo[player].amount;

    if(value === 0){

        bubble.style.opacity = 0;
        bubble.style.transform = "translate(-50%,-20%)";

        return;

    }

    bubble.textContent = (value > 0 ? "+" : "") + value;

    bubble.style.opacity = 1;
    bubble.style.transform = "translate(-50%,-80%)";

    bubble.animate([
        {
            transform: "translate(-50%,-40%) scale(.9)",
            opacity: .3
        },
        {
            transform: "translate(-50%,-80%) scale(1.15)",
            opacity: 1
        }
    ],{
        duration: 120,
        fill: "forwards"
    });

}
function commitCombo(player){

    clearTimeout(combo[player].timer);
    combo[player].timer = null;

    if(gameOverVisible()) return;

    if(combo[player].amount === 0) return;

    state.players[player].journal.push({

        start: combo[player].startLife,
        change: combo[player].amount,
        end: state.players[player].life

    });

    const bubble = document.getElementById(player + "-combo");

    bubble.getAnimations().forEach(a => a.cancel());

    bubble.style.opacity = 0;
    bubble.style.transform = "translate(-50%,-50%)";
    bubble.textContent = "";

    combo[player].amount = 0;
    combo[player].startLife = null;

    saveState();

}
function renderJournal(player){

    const panel = document.getElementById(player + "-journal");

    panel.innerHTML = "";

    const entries = state.players[player].journal;

    entries.forEach(entry => {

        const row = document.createElement("div");

        row.className = "journal-row";

        row.innerHTML = `
            <span class="old-life">${entry.start}</span>
            <span class="change">${entry.change > 0 ? "+" : ""}${entry.change}</span>
        `;

        panel.appendChild(row);

    });

    const current = document.createElement("div");

    current.className = "journal-current";
    current.textContent = state.players[player].life;

    panel.appendChild(current);

}
/* ============================================================
   Life Change
============================================================ */

function changeLife(player,amount){

    lastState=JSON.stringify(state);

    if(!state.timer.running){

        state.timer.running=true;

        state.timer.startTime=Date.now();

    }

    if(combo[player].startLife===null){

        combo[player].startLife=
            state.players[player].life;

    }

    state.players[player].life+=amount;

    combo[player].amount+=amount;

    updateComboBubble(player);

    clearTimeout(combo[player].timer);

    combo[player].timer=setTimeout(()=>{

        commitCombo(player);

        render();

    },700);

    checkWinner();

    saveState();

    render();

}



function checkWinner(){

    let winner = null;
    let loser = null;


    if(state.players.top.life <= 0){

        winner = "bottom";
        loser = "top";

    }


    if(state.players.bottom.life <= 0){

        winner = "top";
        loser = "bottom";

    }


    if(winner){

        finishGame(winner, loser);

    }

}



function finishGame(winner, loser){

    state.timer.elapsed =
    Math.floor(
        (Date.now()-state.timer.startTime)/1000
    );


    state.timer.running = false;


    state.players[winner].wins++;
    state.players[loser].losses++;


    state.games.push({

        winner:
        state.players[winner].name,

        loser:
        state.players[loser].name,

        duration:
        state.timer.elapsed,

        date:
        new Date().toLocaleDateString()

    });


    winnerText.textContent =
    "🏆 " + state.players[winner].name + " Wins!";


    finalTime.textContent =
    "Time: " + formatTime(state.timer.elapsed);


    gameOver.classList.remove("hidden");


    saveState();

}



function nextGame(){

    clearTimeout(combo.top.timer);
    clearTimeout(combo.bottom.timer);

    combo.top.timer = null;
    combo.bottom.timer = null;

    combo.top.amount = 0;
    combo.bottom.amount = 0;

    combo.top.startLife = null;
    combo.bottom.startLife = null;

    state.players.top.life = state.startingLife;
    state.players.bottom.life = state.startingLife;

    state.players.top.journal = [];
    state.players.bottom.journal = [];

    state.timer = {

        running: false,
        elapsed: 0,
        startTime: null

    };

    const topBubble = document.getElementById("top-combo");
    const bottomBubble = document.getElementById("bottom-combo");

    topBubble.getAnimations().forEach(a => a.cancel());
    bottomBubble.getAnimations().forEach(a => a.cancel());

    topBubble.textContent = "";
    bottomBubble.textContent = "";

    topBubble.style.opacity = 0;
    bottomBubble.style.opacity = 0;

    topBubble.style.transform = "translate(-50%,-50%)";
    bottomBubble.style.transform = "translate(-50%,-50%)";

    document.getElementById("top-journal").innerHTML = "";
    document.getElementById("bottom-journal").innerHTML = "";

    gameOver.classList.add("hidden");

    saveState();

    render();

}



function undoGame(){

    if(lastState){

        state = JSON.parse(lastState);

    }


    gameOver.classList.add("hidden");
combo.top.amount = 0;
combo.bottom.amount = 0;

combo.top.startLife = null;
combo.bottom.startLife = null;

clearTimeout(combo.top.timer);
clearTimeout(combo.bottom.timer);

document.getElementById("top-combo").textContent = "";
document.getElementById("bottom-combo").textContent = "";

document.getElementById("top-combo").style.opacity = 0;
document.getElementById("bottom-combo").style.opacity = 0;
    saveState();

    render();

}



function render(){

    topLife.textContent = state.players.top.life;
    bottomLife.textContent = state.players.bottom.life;

    topName.textContent = state.players.top.name;
    bottomName.textContent = state.players.bottom.name;

    renderJournal("top");
    renderJournal("bottom");

    updateTimer();

}



function updateTimer(){

    if(state.timer.running){

        state.timer.elapsed =
        Math.floor(
            (Date.now()-state.timer.startTime)/1000
        );

    }


    timer.textContent =
    "⏱ " + formatTime(state.timer.elapsed);

}



function formatTime(seconds){

    let minutes =
    Math.floor(seconds/60);

    let secs =
    seconds % 60;


    return (
        String(minutes).padStart(2,"0")
        + ":" +
        String(secs).padStart(2,"0")
    );

}



function gameOverVisible(){

    return !gameOver.classList.contains("hidden");

}



function saveState(){

    const save = structuredClone(state);

    save.players.top.journal = [];
    save.players.bottom.journal = [];

    localStorage.setItem(
        "lifeLedger",
        JSON.stringify(save)
    );

}



function loadState(){

    const saved = localStorage.getItem("lifeLedger");

    if(!saved){
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }

    try{

        const loaded = JSON.parse(saved);

        return {
            ...DEFAULT_STATE,
            ...loaded,
            players:{
                top:{
                    ...DEFAULT_STATE.players.top,
                    ...loaded.players?.top
                },
                bottom:{
                    ...DEFAULT_STATE.players.bottom,
                    ...loaded.players?.bottom
                }
            }
        };

    }catch(err){

        console.warn("Corrupted save detected. Resetting.");

        localStorage.removeItem("lifeLedger");

        return JSON.parse(JSON.stringify(DEFAULT_STATE));

    }

}
// ============= NAVIGATION & SETTINGS =============

const pages = {
    game: document.getElementById("game-screen"),
    season: document.getElementById("season-screen"),
    history: document.getElementById("history-screen"),
    settings: document.getElementById("settings-screen")
};

const pageOrder = ['game', 'season', 'history', 'settings'];
let currentPage = 'game';
let isAnimating = false;

// Wait for DOM to be ready, then set up nav and settings
function setupUI() {
    alert("2");
   const navButtons = document.querySelectorAll("nav button");
    
    if (navButtons.length === 0) {
        console.error("Navigation buttons not found!");
        return;
       alert("3");
    }
    
    // Setup navigation
    navButtons.forEach(button => {
        button.onclick = (e) => {
            e.preventDefault();
            if (!isAnimating) {
                navigateTo(button.dataset.page);
            }
        };
    });
    
    // Initialize first page as active
    document.querySelector('nav button[data-page="game"]').classList.add("active");
    
    // Setup settings buttons
    setupSettingsButtons();
}

function setupSettingsButtons() {

    document.getElementById("life-20")?.addEventListener("click", () => updateSettingsLife(20));
    document.getElementById("life-30")?.addEventListener("click", () => updateSettingsLife(30));
    document.getElementById("life-40")?.addEventListener("click", () => updateSettingsLife(40));

    document.getElementById("new-game")?.addEventListener("click", () => {

        if (confirm("Start a new game?")) {
            nextGame();
        }

    });

    document.getElementById("reset-season")?.addEventListener("click", () => {

        if (!confirm("Reset season?")) return;

        state.players.top.wins = 0;
        state.players.top.losses = 0;
        state.players.bottom.wins = 0;
        state.players.bottom.losses = 0;

        saveState();
        updateSeason();

    });

    document.getElementById("clear-history")?.addEventListener("click", () => {

        if (!confirm("Clear history?")) return;

        state.games = [];
        saveState();
        updateHistory();

    });

    document.getElementById("reset-all")?.addEventListener("click", () => {

        if (!confirm("Erase everything?")) return;

        localStorage.removeItem("lifeLedger");
        location.reload();

    });

}

// Call setup when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupUI);
} else {
    setupUI();
}

function navigateTo(newPage) {
    if (newPage === currentPage || isAnimating) return;
    
    isAnimating = true;
    
    const currentPageEl = pages[currentPage];
    const newPageEl = pages[newPage];
    
    if (!currentPageEl || !newPageEl) {
        console.error(`Page not found: ${currentPage} or ${newPage}`);
        isAnimating = false;
        return;
    }
    
    // Determine direction
    const currentIndex = pageOrder.indexOf(currentPage);
    const newIndex = pageOrder.indexOf(newPage);
    const direction = newIndex > currentIndex ? 'right' : 'left';
    
    // Update nav buttons
    document.querySelectorAll("nav button").forEach(b => {
        b.classList.remove("active");
    });
    document.querySelector(`nav button[data-page="${newPage}"]`).classList.add("active");
    
    // Animate out current page
    currentPageEl.classList.add(`slide-out-${direction}`);
    
    // Animate in new page
    setTimeout(() => {
        currentPageEl.classList.remove(`slide-out-${direction}`);
        currentPageEl.style.display = "none";
        
        // Update dynamic content based on page
        if (newPage === "season") updateSeason();
        if (newPage === "history") updateHistory();
        
        newPageEl.style.display = newPage === 'game' ? "flex" : "block";
        newPageEl.classList.add(`slide-in-${direction}`);
        
        // Remove animation class after animation completes
        setTimeout(() => {
            newPageEl.classList.remove(`slide-in-${direction}`);
            isAnimating = false;
        }, 300);
        
        currentPage = newPage;
    }, 250);
}

function editSeason(player){

    const name = state.players[player].name;

    const wins = prompt(
        `Enter ${name}'s wins:`,
        state.players[player].wins
    );

    if(wins === null) return;


    const losses = prompt(
        `Enter ${name}'s losses:`,
        state.players[player].losses
    );

    if(losses === null) return;


    state.players[player].wins =
        Math.max(0, Number(wins) || 0);


    state.players[player].losses =
        Math.max(0, Number(losses) || 0);


    saveState();

    updateSeason();

}
function updateSeason(){

    console.log("Season update started");

    console.log(state);

    const adamName = document.getElementById("season-adam-name");

    if(!adamName){
        console.error("Season HTML missing");
        return;
    }

    adamName.textContent = state.players.bottom.name;

    document.getElementById("season-sydney-name").textContent =
        state.players.top.name;

    document.getElementById("adam-wins").textContent =
        state.players.bottom.wins;

    document.getElementById("adam-losses").textContent =
        state.players.bottom.losses;

    document.getElementById("sydney-wins").textContent =
        state.players.top.wins;

    document.getElementById("sydney-losses").textContent =
        state.players.top.losses;


    console.log("Season update complete");

}

function updateHistory(){

    let list = document.getElementById("history-list");

    if(state.games.length === 0){
        list.innerHTML = "<p>No games played yet.</p>";
        return;
    }

    list.innerHTML = "";

    [...state.games].reverse().forEach(game => {
        let card = document.createElement("div");
        card.className = "history-card";
        card.innerHTML = `
            <h2>🏆 ${game.winner}</h2>
            <p>Defeated ${game.loser}</p>
            <p>⏱ ${formatTime(game.duration)}</p>
            <p>${game.date}</p>
        `;
        list.appendChild(card);
    });
}

// ============= SETTINGS =============

function updateSettingsLife(amount){

    state.startingLife = Number(amount);

    state.players.top.life = state.startingLife;
    state.players.bottom.life = state.startingLife;

    state.timer = {
        running: false,
        elapsed: 0,
        startTime: null
    };

    gameOver.classList.add("hidden");

    saveState();
    render();

    alert(`Starting life set to ${amount}`);

}

// Register PWA Service Worker

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js")
    .then(() => {
        console.log("Life Ledger is ready offline");
    });
}

