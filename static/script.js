// Quiz State
let quizState = {
    currentQuestion: 0,
    currentHintIndex: 0,
    totalScore: 0,
    playerName: '',
    questions: [],
    answered: false,
    quizLoaded: false
};

const POINT_VALUES = [100, 80, 60, 40, 20];
const API_BASE = window.location.origin;

async function loadQuiz() {
    const loadingMessage = document.getElementById('loadingMessage');
    const startButton = document.getElementById('startButton');
    
    loadingMessage.style.display = 'block';
    startButton.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE}/api/quiz`);
        quizState.questions = await response.json();
        quizState.quizLoaded = true;
        
        loadingMessage.style.display = 'none';
        startButton.disabled = false;
    } catch (error) {
        console.error('Error loading quiz:', error);
        loadingMessage.textContent = 'Failed to load quiz. Please refresh the page.';
        loadingMessage.style.color = 'red';
    }
}

function startQuiz() {
    const playerName = document.getElementById('playerName').value.trim();
    
    if (!playerName) {
        alert('Please enter your name');
        return;
    }
    
    if (!quizState.quizLoaded) {
        alert('Quiz is still loading. Please wait a moment and try again.');
        return;
    }
    
    quizState.playerName = playerName;
    quizState.currentQuestion = 0;
    quizState.totalScore = 0;
    
    showScreen('quizScreen');
    loadQuestion();
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

function loadQuestion() {
    if (quizState.currentQuestion >= quizState.questions.length) {
        endQuiz();
        return;
    }
    
    const question = quizState.questions[quizState.currentQuestion];
    
    // Update progress
    document.getElementById('currentQuestion').textContent = quizState.currentQuestion + 1;
    document.getElementById('scoreDisplay').textContent = `Score: ${quizState.totalScore}`;
    
    const progressPercent = ((quizState.currentQuestion) / quizState.questions.length) * 100;
    document.getElementById('progressFill').style.width = progressPercent + '%';
    
    console.log('Loading question:', question);
    quizState.currentHintIndex = 0;
    updateHintDisplay(question);
    document.getElementById('image1').src = question.images[0];
    document.getElementById('image2').src = question.images[1];
    document.getElementById('answerInput').value = '';
    document.getElementById('answerInput').focus();
    
    quizState.answered = false;
}

function updateHintDisplay(question) {
    const currentIndex = quizState.currentHintIndex;
    const totalHints = question.hints?.length || 1;
    const hintText = question.hints?.[currentIndex] || question.hint || '';

    document.getElementById('hint').textContent = hintText;
    document.getElementById('hintProgress').textContent = `Hint ${currentIndex + 1} of ${totalHints}`;
    document.getElementById('hintPoints').textContent = `Worth ${POINT_VALUES[currentIndex] || POINT_VALUES[POINT_VALUES.length - 1]} points`;
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
                questionId: quizState.questions[quizState.currentQuestion].id,
                answer: userAnswer,
                hintIndex: quizState.currentHintIndex
            })
        });
        
        const result = await response.json();
        const question = quizState.questions[quizState.currentQuestion];
        
        if (result.correct) {
            quizState.totalScore += result.points;
            showFeedback(true, result.points, result.answer);
        } else {
            if (quizState.currentHintIndex < (question.hints?.length || 1) - 1) {
                quizState.currentHintIndex++;
                updateHintDisplay(question);
                answerInput.value = '';
                answerInput.focus();
                quizState.answered = false;
                alert('Incorrect. Here is the next hint.');
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
    
    if (quizState.currentQuestion >= quizState.questions.length) {
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
    await loadQuiz();
    
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
