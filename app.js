// WHODLE - LinkedIn Profile Guessing Game
// All tuning numbers in one CONFIG object
const CONFIG = {
    maxGuesses: 10,
    feedbackDelay: 800,
    summaryDelay: 1500,
    shakeDuration: 300,
    squashDuration: 200,
    particleCount: 20
};

// Sound system
let audioContext = null;
let isMuted = false;

function initAudio() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {}
    }
}

function playTone(frequency, duration, type = 'sine') {
    if (isMuted || !audioContext) return;
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {}
}

function playCorrectSound() {
    playTone(523, 0.1);
    setTimeout(() => playTone(659, 0.1), 50);
    setTimeout(() => playTone(784, 0.15), 100);
}

function playWrongSound() {
    playTone(400, 0.15, 'sawtooth');
    setTimeout(() => playTone(300, 0.2, 'sawtooth'), 80);
}

function playTapSound() {
    playTone(800, 0.05, 'square');
}

// Particles
const particles = [];
const canvas = document.getElementById('particleCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

function resizeCanvas() {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}

function createParticles(x, y, color = '#778da9') {
    if (!ctx) return;
    for (let i = 0; i < CONFIG.particleCount; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1.0,
            decay: Math.random() * 0.02 + 0.01,
            size: Math.random() * 4 + 2,
            color
        });
    }
}

function updateParticles() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        p.vy += 0.2;
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    requestAnimationFrame(updateParticles);
}

function screenShake() {
    const container = document.getElementById('gameContainer');
    if (container) {
        container.classList.add('shake');
        setTimeout(() => container.classList.remove('shake'), CONFIG.shakeDuration);
    }
}

function squashStretch(element) {
    if (!element) return;
    element.classList.add('squash-stretch');
    setTimeout(() => element.classList.remove('squash-stretch'), CONFIG.squashDuration);
}

// Game state
let gameState = {
    currentProfile: null,
    hiddenWorkplace: '',
    guessCount: 0,
    hasWon: false,
    allProfiles: []
};

// Load profiles
async function loadProfiles() {
    // Try embedded data first (works with file://)
    if (window.PROFILES_DATA && Array.isArray(window.PROFILES_DATA) && window.PROFILES_DATA.length > 0) {
        gameState.allProfiles = window.PROFILES_DATA;
        initGame();
        return;
    }
    try {
        const response = await fetch('profiles_full.json');
        if (!response.ok) {
            throw new Error('Failed to load profiles');
        }
        gameState.allProfiles = await response.json();
        initGame();
    } catch (e) {
        console.error('Error loading profiles:', e);
        const gameScreen = document.getElementById('gameScreen');
        if (gameScreen) {
            gameScreen.innerHTML = '<div style="padding:20px;text-align:center;color:#991b1b;"><p>Could not load game data.</p><p>Please open this game using a local web server (e.g., run: <code>python -m http.server</code> in this folder and open http://localhost:8000/game.html)</p></div>';
        }
    }
}

// Initialize game
function initGame() {
    initAudio();
    
    if (!gameState.allProfiles || gameState.allProfiles.length === 0) {
        loadProfiles();
        return;
    }
    
    // Pick random profile (try a few times to find valid one)
    let attempts = 0;
    let found = false;
    while (attempts < 50 && !found) {
        const randomIndex = Math.floor(Math.random() * gameState.allProfiles.length);
        gameState.currentProfile = gameState.allProfiles[randomIndex];
        
        const current = (gameState.currentProfile.workplace_current || '').toLowerCase().trim();
        const prevWorkplaces = (gameState.currentProfile.workplaces || []).filter(w => {
            const wl = (w || '').toLowerCase().trim();
            return wl && wl !== current && !current.includes(wl) && !wl.includes(current);
        });
        
        if (prevWorkplaces.length > 0) {
            gameState.hiddenWorkplace = prevWorkplaces[Math.floor(Math.random() * prevWorkplaces.length)];
            found = true;
        }
        attempts++;
    }
    
    if (!found) {
        // Fallback to first profile with workplaces
        for (const p of gameState.allProfiles) {
            if (p.workplaces && p.workplaces.length > 1) {
                gameState.currentProfile = p;
                gameState.hiddenWorkplace = p.workplaces[1];
                found = true;
                break;
            }
        }
    }
    
    gameState.guessCount = 0;
    gameState.hasWon = false;
    
    // Update UI
    document.getElementById('profileInitials').textContent = gameState.currentProfile.initials || '??';
    document.getElementById('currentWorkplace').textContent = gameState.currentProfile.workplace_current || 'N/A';
    document.getElementById('profileLocation').textContent = gameState.currentProfile.location || 'N/A';
    document.getElementById('numExp').textContent = gameState.currentProfile.numExperiences || 0;
    const aboutEl = document.getElementById('profileAbout');
    if (aboutEl) {
        aboutEl.textContent = gameState.currentProfile.about || 'No description available.';
    }
    document.getElementById('guessCount').textContent = gameState.guessCount;
    document.getElementById('hiddenWorkplace').textContent = '???';
    document.getElementById('feedback').textContent = '';
    document.getElementById('successMessage').style.display = 'none';
    
    // Set avatar
    const avatar = document.getElementById('profileAvatar');
    if (avatar) {
        const initials = gameState.currentProfile.initials || '??';
        avatar.textContent = initials;
        // Color based on initials
        const colors = ['#415a77', '#778da9', '#1b263b', '#0d1b2a'];
        let hash = 0;
        for (let i = 0; i < initials.length; i++) hash = initials.charCodeAt(i) + ((hash << 5) - hash);
        avatar.style.background = colors[Math.abs(hash) % colors.length];
        avatar.style.transform = 'scale(1)';
    }
    
    document.getElementById('summaryScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    
    setupOptions();
}

// Setup options
function setupOptions() {
    const optionsContainer = document.getElementById('optionsContainer');
    if (!optionsContainer) return;
    optionsContainer.innerHTML = '';
    
    // Get options from similar profiles and add the correct answer
    const options = new Set();
    options.add(gameState.hiddenWorkplace);
    
    // Add options from similar profiles
    if (gameState.currentProfile.similar_profiles) {
        for (const similar of gameState.currentProfile.similar_profiles) {
            for (const wp of similar.workplaces) {
                if (wp && wp !== gameState.hiddenWorkplace) {
                    options.add(wp);
                    if (options.size >= 4) break;
                }
            }
            if (options.size >= 4) break;
        }
    }
    
    // If not enough options, add some from other profiles
    if (options.size < 4) {
        for (let i = 0; i < gameState.allProfiles.length && options.size < 4; i++) {
            const p = gameState.allProfiles[i];
            if (p.id === gameState.currentProfile.id) continue;
            for (const wp of p.workplaces) {
                if (wp && wp !== gameState.hiddenWorkplace) {
                    options.add(wp);
                    if (options.size >= 4) break;
                }
            }
        }
    }
    
    const optionsArray = Array.from(options).slice(0, 4);
    // Shuffle
    optionsArray.sort(() => Math.random() - 0.5);
    
    optionsArray.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.type = 'button';
        btn.textContent = option;
        btn.setAttribute('data-option', option);
        
        btn.addEventListener('click', () => {
            playTapSound();
            squashStretch(btn);
            handleGuess(option, btn);
        });
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            playTapSound();
            squashStretch(btn);
            handleGuess(option, btn);
        });
        
        optionsContainer.appendChild(btn);
    });
}

// Handle guess
function handleGuess(guess, buttonElement) {
    if (gameState.hasWon) return;
    
    gameState.guessCount++;
    document.getElementById('guessCount').textContent = gameState.guessCount;
    
    const allButtons = document.querySelectorAll('.option-btn');
    
    if (guess === gameState.hiddenWorkplace) {
        // Correct
        gameState.hasWon = true;
        buttonElement.classList.add('correct');
        buttonElement.disabled = true;
        allButtons.forEach(btn => {
            if (btn !== buttonElement) {
                btn.disabled = true;
                if (btn.getAttribute('data-option') !== gameState.hiddenWorkplace) {
                    btn.classList.add('wrong');
                }
            }
        });
        
        document.getElementById('hiddenWorkplace').textContent = gameState.hiddenWorkplace;
        document.getElementById('feedback').textContent = '';
        document.getElementById('successMessage').style.display = 'block';
        
        playCorrectSound();
        createParticles(window.innerWidth / 2, 200, '#10b981');
        
        setTimeout(() => {
            showSummary();
        }, CONFIG.summaryDelay);
    } else {
        // Wrong
        buttonElement.classList.add('wrong');
        buttonElement.disabled = true;
        
        document.getElementById('feedback').textContent = 'Try again!';
        document.getElementById('feedback').style.color = '#ef4444';
        
        playWrongSound();
        screenShake();
        createParticles(buttonElement.getBoundingClientRect().left + buttonElement.offsetWidth / 2,
                        buttonElement.getBoundingClientRect().top + buttonElement.offsetHeight / 2,
                        '#ef4444');
    }
}

// Show summary
function showSummary() {
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('summaryScreen').style.display = 'block';
    
    document.getElementById('finalGuesses').textContent = gameState.guessCount;
    document.getElementById('answerWorkplace').textContent = gameState.hiddenWorkplace;
    
    let comparison = '';
    if (gameState.guessCount === 1) {
        comparison = 'amazing - first try!';
    } else if (gameState.guessCount <= 2) {
        comparison = 'great';
    } else if (gameState.guessCount <= 3) {
        comparison = 'good';
    } else {
        comparison = 'decent';
    }
    document.getElementById('comparison').textContent = comparison;
}

// Setup play again
function setupPlayAgain() {
    const playAgainBtn = document.getElementById('playAgainBtn');
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            playTapSound();
            squashStretch(playAgainBtn);
            initGame();
        });
        playAgainBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            playTapSound();
            squashStretch(playAgainBtn);
            initGame();
        });
    }
}

// Setup mute
function setupMuteButton() {
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            initAudio();
            isMuted = !isMuted;
            muteBtn.textContent = isMuted ? '🔇' : '🔊';
            playTapSound();
        });
        muteBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            initAudio();
            isMuted = !isMuted;
            muteBtn.textContent = isMuted ? '🔇' : '🔊';
            playTapSound();
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    updateParticles();
    setupMuteButton();
    setupPlayAgain();
    loadProfiles();
});
