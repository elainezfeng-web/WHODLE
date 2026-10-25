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
    resultDelay: 1000              // short comment: pause before showing result screen
};

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
    mysteryImg.title = DUMMY_DATA.mysteryPerson.imageDescription;
    
    // Setup options
    setupOptions();
}

// Setup guess options
function setupOptions() {
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    // Shuffle options for variety (simple shuffle)
    const shuffledOptions = [...DUMMY_DATA.options].sort(() => Math.random() - 0.5);
    
    shuffledOptions.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.type = 'button';
        btn.textContent = option;
        btn.setAttribute('data-option', option);
        
        // Add click and touch support
        btn.addEventListener('click', () => handleGuess(option, btn));
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleGuess(option, btn);
        });
        
        // Keyboard accessibility - allow Enter/Space on focused buttons
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
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
    
    document.getElementById('attemptsLeft').textContent = gameState.attemptsLeft;
    
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
        feedbackEl.textContent = 'Correct! 🎉';
        feedbackEl.style.color = '#10b981';
        
        setTimeout(() => {
            showResult();
        }, CONFIG.resultDelay);
    } else {
        // Wrong guess
        buttonElement.classList.add('wrong');
        feedbackEl.textContent = 'Wrong guess. Try again!';
        feedbackEl.style.color = '#ef4444';
        
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
                feedbackEl.textContent = '';
                // Re-enable buttons that weren't clicked
                allButtons.forEach(btn => {
                    if (!btn.disabled || btn === buttonElement) {
                        // Keep wrong one disabled with style, enable others
                    }
                });
                // Simpler: re-enable all except keep styling
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
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'block';
    
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    const finalScoreEl = document.getElementById('finalScore');
    const answerNameEl = document.getElementById('answerName');
    const resultImg = document.getElementById('resultImage');
    
    resultImg.title = DUMMY_DATA.mysteryPerson.imageDescription;
    
    if (gameState.hasWon) {
        resultTitle.textContent = 'You Win! 🎉';
        resultTitle.style.color = '#10b981';
        resultMessage.textContent = 'Great job guessing correctly!';
    } else {
        resultTitle.textContent = 'Game Over';
        resultTitle.style.color = '#ef4444';
        resultMessage.textContent = 'Out of attempts. Better luck next time!';
    }
    
    const score = calculateScore();
    finalScoreEl.textContent = score;
    answerNameEl.textContent = gameState.correctAnswer;
}

// Setup play again button
function setupPlayAgain() {
    const playAgainBtn = document.getElementById('playAgainBtn');
    playAgainBtn.addEventListener('click', initGame);
    playAgainBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        initGame();
    });
}

// Set today's date
function setTodayDate() {
    const dateEl = document.getElementById('todayDate');
    if (dateEl) {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = today.toLocaleDateString(undefined, options);
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setTodayDate();
    setupPlayAgain();
    initGame();
});
