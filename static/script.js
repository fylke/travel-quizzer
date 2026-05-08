// Quiz State
let quizState = {
    hintDifficulty: 5,
    remainingGuesses: 3,
    totalScore: 0,
    playerName: '',
    destination: [],
    answered: false
};

const API_BASE = window.location.origin;

function startQuiz() {
    const playerName = document.getElementById('playerName').value.trim();
    
    if (!playerName) {
        alert('Please enter your name');
        return;
    }
    
    quizState.playerName = playerName;
    quizState.currentQuestion = 0;
    quizState.totalScore = 0;
    
    showScreen('quizScreen');
    console.log('Loading quiz for player: ', playerName);
    loadQuestion();
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

async function loadQuestion() {
    console.log('Quiz state: ', quizState);
    
    try {
        const response = await fetch(`${API_BASE}/api/quiz`);
        quizState.destination = await response.json();
        
        loadingMessage.style.display = 'none';
        startButton.disabled = false;
    } catch (error) {
        console.error('Error loading quiz:', error);
        loadingMessage.textContent = 'Failed to load quiz. Please refresh the page.';
        loadingMessage.style.color = 'red';
    }

    const destination = quizState.destination;
    
    // Update progress
    document.getElementById('currentQuestion').textContent = quizState.currentQuestion + 1;
    document.getElementById('scoreDisplay').textContent = `Score: ${quizState.totalScore}`;
    
    const progressPercent = ((quizState.currentQuestion) / quizState.destination.length) * 100;
    document.getElementById('progressFill').style.width = progressPercent + '%';
    
    console.log('Loading question:', destination);
    quizState.hintDifficulty = 5;
    quizState.remainingGuesses = 3;
    document.getElementById('hint').textContent = destination.hint;
    document.getElementById('hintProgress').textContent = `Hint difficulty is ${quizState.hintDifficulty}, and you have ${quizState.remainingGuesses} remaining guesses.`;
    document.getElementById('hintPoints').textContent = `If you guess correctly, you will get ${quizState.hintDifficulty * quizState.remainingGuesses} points.`;
    document.getElementById('image1').src = destination.images[0];
    document.getElementById('image2').src = destination.images[1];
    document.getElementById('answerInput').value = '';
    document.getElementById('answerInput').focus();
    
    quizState.answered = false;
}

function updateHintDisplay(question, hintText) {
    const hintDifficulty = quizState.hintDifficulty;
    const potentialPoints = hintDifficulty * quizState.remainingGuesses;

    document.getElementById('hint').textContent = hintText;
    document.getElementById('hintProgress').textContent = `Hint difficulty is ${hintDifficulty}, and you have ${quizState.remainingGuesses} remaining guesses.`;
    document.getElementById('hintPoints').textContent = `If you guess correctly, you will get ${potentialPoints} points.`;
}

async function submitAnswer() {
    if (quizState.answered) return;
    
    quizState.answered = true;
    
    const answerInput = document.getElementById('answerInput');
    const userAnswer = answerInput.value.trim();
    
    if (!userAnswer) {
        alert('Please enter an answer');
        quizState.answered = false;
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/check-answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                questionId: quizState.destination[quizState.currentQuestion].id,
                answer: userAnswer,
                hintDifficulty: quizState.hintDifficulty,
                remainingGuesses: quizState.remainingGuesses
            })
        });
        
        const result = await response.json();
        const question = quizState.destination[quizState.currentQuestion];
        
        if (result.correct) {
            quizState.totalScore += result.points;
            showFeedback(true, result.points, result.answer);
        } else {
            if (quizState.remainingGuesses > 0) {
                quizState.remainingGuesses--;
                updateHintDisplay(question);
                answerInput.value = '';
                answerInput.focus();
                quizState.answered = false;
            } else {
                showFeedback(false, 0, result.answer);
            }
        }
    } catch (error) {
        console.error('Error checking answer:', error);
        alert('Error checking answer');
        quizState.answered = false;
    }
}

async function fetchHint(wantedHintDifficulty) {
    const question = quizState.destination[quizState.currentQuestion];
    nextHintDifficulty = quizState.hintDifficulty - 1;
    
    if (wantedHintDifficulty > 0) {
        document.getElementById('hint').textContent = 'Loading hint...';
        
        try {
            const response = await fetch(`${API_BASE}/api/hint?questionId=${question.id}&difficulty=${wantedHintDifficulty}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch hint');
            }
            
            const data = await response.json();
            quizState.hintDifficulty--;
            updateHintDisplay(question, data.hint);
            document.getElementById('answerInput').value = '';
            document.getElementById('answerInput').focus();
        } catch (error) {
            console.error('Error fetching hint:', error);
            document.getElementById('hint').textContent = 'Error loading hint. Please try again.';
        }
    } else {
        // If no more hints, show feedback as incorrect
        showFeedback(false, 0, question.destination);
    }
}

function showFeedback(isCorrect, points, correctAnswer) {
    showScreen('feedbackScreen');
    
    const feedbackStatus = document.getElementById('feedbackStatus');
    const feedbackDetails = document.getElementById('feedbackDetails');
    
    if (isCorrect) {
        feedbackStatus.textContent = '✓ Correct!';
        feedbackStatus.className = 'feedback-status correct';
        feedbackDetails.innerHTML = `
            <p>The destination was: <span class="correct-answer">${correctAnswer}</span></p>
            <p class="points-earned">+${points} Points!</p>
        `;
    } else {
        feedbackStatus.textContent = '✗ Incorrect';
        feedbackStatus.className = 'feedback-status incorrect';
        feedbackDetails.innerHTML = `
            <p>The destination was: <span class="correct-answer">${correctAnswer}</span></p>
            <p class="points-earned">0 Points</p>
        `;
    }
}

function nextQuestion() {
    quizState.currentQuestion++;
    
    if (quizState.currentQuestion >= quizState.destination.length) {
        endQuiz();
    } else {
        showScreen('quizScreen');
        loadQuestion();
    }
}

function endQuiz() {
    showScreen('resultsScreen');
    
    document.getElementById('finalScore').textContent = quizState.totalScore;
    
    // Generate message based on score
    let message = '';
    if (quizState.totalScore >= 400) {
        message = '🌟 Outstanding! You are a true travel expert!';
    } else if (quizState.totalScore >= 300) {
        message = '🎉 Excellent! You know your destinations well!';
    } else if (quizState.totalScore >= 200) {
        message = '👏 Good job! Keep exploring the world!';
    } else if (quizState.totalScore >= 100) {
        message = '📚 Not bad! Time to travel more!';
    } else {
        message = '🗺️ Keep learning about travel destinations!';
    }
    
    document.getElementById('resultsMessage').textContent = message;
}

function retakeQuiz() {
    quizState.currentQuestion = 0;
    quizState.totalScore = 0;
    showScreen('quizScreen');
    loadQuestion();
}

function resetQuiz() {
    quizState.currentQuestion = 0;
    quizState.totalScore = 0;
    quizState.playerName = '';
    document.getElementById('playerName').value = '';
    showScreen('welcomeScreen');
}

// Allow Enter key to submit answer
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('answerInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !quizState.answered) {
            submitAnswer();
        }
    });
    
    document.getElementById('playerName')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            startQuiz();
        }
    });
});
