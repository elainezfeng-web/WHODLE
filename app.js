// WHODLE - Simple DLE-style guessing game
// All tuning numbers in one CONFIG object
const CONFIG = {
    // Number of attempts allowed per game (limited attempts = obstacle)
    maxAttempts: 3,                // short comment: how many guesses player gets
    
    // Scoring configuration
    baseScore: 100,                // short comment: points for guessing correctly
    speedBonusPerAttempt: 25,      // short comment: bonus points saved by using fewer attempts
    perfectBonus: 50,              // short comment: extra points for guessing on first try
    
    // Feedback timing (in milliseconds)
    feedbackDelay: 800,            // short comment: pause before showing feedback
    resultDelay: 1000,             // short comment: pause before showing result screen
    
    // Juiciness settings
    shakeDuration: 300,            // short comment: screen shake duration in ms
    squashDuration: 200,           // short comment: squash and stretch duration in ms
    particleCount: 20              // short comment: number of particles on effects
};

// Sound system using Web Audio API
let audioContext = null;
let isMuted = false;

function initAudio() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            // Audio not supported
        }
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
    } catch (e) {
        // Ignore audio errors
    }
}

function playCorrectSound() {
    // Happy rising sound
    playTone(523, 0.1); // C5
    setTimeout(() => playTone(659, 0.1), 50); // E5
    setTimeout(() => playTone(784, 0.15), 100); // G5
}

function playWrongSound() {
    // Sad descending sound
    playTone(400, 0.15, 'sawtooth');
    setTimeout(() => playTone(300, 0.2, 'sawtooth'), 80);
}

function playTapSound() {
    // Quick tap sound
    playTone(800, 0.05, 'square');
}

// Particle system
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
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1.0,
            decay: Math.random() * 0.02 + 0.01,
            size: Math.random() * 4 + 2,
            color: color
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
        p.vy += 0.2; // gravity
        
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

// Screen shake
function screenShake() {
    const container = document.getElementById('gameContainer');
    if (container) {
        container.classList.add('shake');
        setTimeout(() => {
            container.classList.remove('shake');
        }, CONFIG.shakeDuration);
    }
}

// Squash and stretch
function squashStretch(element) {
    if (!element) return;
    element.classList.add('squash-stretch');
    setTimeout(() => {
        element.classList.remove('squash-stretch');
    }, CONFIG.squashDuration);
}

// Dummy data example (hardcoded)
const DUMMY_DATA = {
    mysteryPerson: {
        name: "Alex",              // The answer
        imageDescription: "Blue circle and green square shapes" // Description of placeholder
    },
    options: [
        "Alex",                    // Correct answer
        "Taylor",                  // Wrong option
        "Jordan",                  // Wrong option
        "Morgan"                   // Wrong option
    ]
};

// Game state
let gameState = {
    attemptsLeft: CONFIG.maxAttempts,
    attemptsUsed: 0,
    gameOver: false,
    hasWon: false,
    correctAnswer: DUMMY_DATA.mysteryPerson.name
};

// Initialize the game
function initGame() {
    initAudio();
    
    // Reset game state
    gameState = {
        attemptsLeft: CONFIG.maxAttempts,
        attemptsUsed: 0,
        gameOver: false,
        hasWon: false,
        correctAnswer: DUMMY_DATA.mysteryPerson.name
    };
    
    // Update UI
    document.getElementById('attemptsLeft').textContent = gameState.attemptsLeft;
    document.getElementById('feedback').textContent = '';
    
    // Hide result screen, show game screen
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    
    // Setup mystery image (using colored shapes - no art yet)
    const mysteryImg = document.getElementById('mysteryImage');
    if (mysteryImg) {
        mysteryImg.title = DUMMY_DATA.mysteryPerson.imageDescription;
        squashStretch(mysteryImg);
    }
    
    // Setup options
    setupOptions();
}

// Setup guess options
function setupOptions() {
    const optionsContainer = document.getElementById('optionsContainer');
    if (!optionsContainer) return;
    optionsContainer.innerHTML = '';
    
    // Shuffle options for variety (simple shuffle)
    const shuffledOptions = [...DUMMY_DATA.options].sort(() => Math.random() - 0.5);
    
    shuffledOptions.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.type = 'button';
        btn.textContent = option;
        btn.setAttribute('data-option', option);
        
        // Add click and touch support with squash/stretch
        btn.addEventListener('click', (e) => {
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
        
        // Keyboard accessibility - allow Enter/Space on focused buttons
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                playTapSound();
                squashStretch(btn);
                handleGuess(option, btn);
            }
        });
        
        optionsContainer.appendChild(btn);
    });
}

// Handle a guess
function handleGuess(guess, buttonElement) {
    if (gameState.gameOver) {
        return;
    }
    
    gameState.attemptsUsed++;
    gameState.attemptsLeft--;
    
    const attemptsLeftEl = document.getElementById('attemptsLeft');
    if (attemptsLeftEl) {
        attemptsLeftEl.textContent = gameState.attemptsLeft;
    }
    
    // Disable all buttons
    const allButtons = document.querySelectorAll('.option-btn');
    allButtons.forEach(btn => {
        btn.disabled = true;
    });
    
    const feedbackEl = document.getElementById('feedback');
    
    if (guess === gameState.correctAnswer) {
        // Correct guess - WIN
        gameState.hasWon = true;
        gameState.gameOver = true;
        buttonElement.classList.add('correct');
        if (feedbackEl) {
            feedbackEl.textContent = 'Correct! 🎉';
            feedbackEl.style.color = '#10b981';
        }
        playCorrectSound();
        createParticles(window.innerWidth / 2, window.innerHeight / 2, '#10b981');
        
        setTimeout(() => {
            showResult();
        }, CONFIG.resultDelay);
    } else {
        // Wrong guess
        buttonElement.classList.add('wrong');
        if (feedbackEl) {
            feedbackEl.textContent = 'Wrong guess. Try again!';
            feedbackEl.style.color = '#ef4444';
        }
        playWrongSound();
        screenShake();
        createParticles(buttonElement.getBoundingClientRect().left + buttonElement.offsetWidth / 2, 
                        buttonElement.getBoundingClientRect().top + buttonElement.offsetHeight / 2, 
                        '#ef4444');
        
        if (gameState.attemptsLeft <= 0) {
            // Out of attempts - LOSE
            gameState.gameOver = true;
            // Show correct answer
            allButtons.forEach(btn => {
                if (btn.getAttribute('data-option') === gameState.correctAnswer) {
                    btn.classList.add('correct');
                }
            });
            
            setTimeout(() => {
                showResult();
            }, CONFIG.resultDelay);
        } else {
            // Still have attempts, re-enable other buttons after delay
            setTimeout(() => {
                if (feedbackEl) {
                    feedbackEl.textContent = '';
                }
                // Re-enable buttons that weren't clicked
                allButtons.forEach(btn => {
                    if (btn !== buttonElement) {
                        btn.disabled = false;
                    }
                });
            }, CONFIG.feedbackDelay);
        }
    }
}

// Calculate score
function calculateScore() {
    if (!gameState.hasWon) {
        return 0; // Lose = 0 or could be partial, but win/lose per requirements
    }
    
    let score = CONFIG.baseScore;
    
    // Speed bonus - fewer attempts used = higher bonus
    // attemptsUsed is 1 if first try
    const attemptsSaved = CONFIG.maxAttempts - gameState.attemptsUsed;
    score += attemptsSaved * CONFIG.speedBonusPerAttempt;
    
    // Perfect bonus for first try
    if (gameState.attemptsUsed === 1) {
        score += CONFIG.perfectBonus;
    }
    
    return score;
}

// Show result screen
function showResult() {
    const gameScreen = document.getElementById('gameScreen');
    const resultScreen = document.getElementById('resultScreen');
    if (gameScreen) gameScreen.style.display = 'none';
    if (resultScreen) resultScreen.style.display = 'block';
    
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    const finalScoreEl = document.getElementById('finalScore');
    const answerNameEl = document.getElementById('answerName');
    const resultImg = document.getElementById('resultImage');
    
    if (resultImg) {
        resultImg.title = DUMMY_DATA.mysteryPerson.imageDescription;
        squashStretch(resultImg);
    }
    
    if (gameState.hasWon) {
        if (resultTitle) {
            resultTitle.textContent = 'You Win! 🎉';
            resultTitle.style.color = '#10b981';
        }
        if (resultMessage) resultMessage.textContent = 'Great job guessing correctly!';
        createParticles(window.innerWidth / 2, 200, '#10b981');
    } else {
        if (resultTitle) {
            resultTitle.textContent = 'Game Over';
            resultTitle.style.color = '#ef4444';
        }
        if (resultMessage) resultMessage.textContent = 'Out of attempts. Better luck next time!';
        screenShake();
    }
    
    const score = calculateScore();
    if (finalScoreEl) finalScoreEl.textContent = score;
    if (answerNameEl) answerNameEl.textContent = gameState.correctAnswer;
}

// Setup play again button
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

// Setup mute button
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

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    updateParticles();
    setupMuteButton();
    setupPlayAgain();
    initGame();
});
