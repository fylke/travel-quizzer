// Quiz State
let quizState = {
    id: 0,
    hintDifficulty: 5,
    remainingGuesses: 3,
    user: null,
    destination: null,
    answered: false,
    lastScore: 0
};

const API_BASE = window.location.origin;
let authMode = 'login';

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

async function loadUser() {
    try {
        const response = await fetch(`${API_BASE}/api/me`);
        if (!response.ok) {
            showScreen('welcomeScreen');
            return;
        }
        quizState.user = await response.json();
        showStatusScreen();
    } catch (error) {
        console.error('Error checking auth status:', error);
        showScreen('welcomeScreen');
    }
}

function toggleAuthMode(mode) {
    authMode = mode;
    const nameField = document.getElementById('name');
    const authButton = document.getElementById('authButton');
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');
    const authHeading = document.getElementById('authHeading');
    const authSubtext = document.getElementById('authSubtext');

    if (mode === 'register') {
        nameField.classList.remove('hidden');
        authButton.textContent = 'Create Account';
        switchToRegister.classList.add('hidden');
        switchToLogin.classList.remove('hidden');
        authHeading.textContent = 'Create your account';
        authSubtext.textContent = 'Register and start the quiz.';
    } else {
        nameField.classList.add('hidden');
        authButton.textContent = 'Log In';
        switchToRegister.classList.remove('hidden');
        switchToLogin.classList.add('hidden');
        authHeading.textContent = 'Welcome Back';
        authSubtext.textContent = 'Log in to continue.';
    }
}

async function handleAuth() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const name = document.getElementById('name').value.trim();
    
    if (!email || !password || (authMode === 'register' && !name)) {
        alert('Please fill in all required fields.');
        return;
    }

    const payload = { email, password };
    if (authMode === 'register') {
        payload.name = name;
    }

    try {
        const response = await fetch(`${API_BASE}/api/${authMode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            alert(data.error || 'Authentication failed');
            return;
        }

        quizState.user = data;
        showStatusScreen();
    } catch (error) {
        console.error('Auth error:', error);
        alert('Unable to authenticate. Please try again.');
    }
}

async function loadQuestion() {
    try {
        const response = await fetch(`${API_BASE}/api/quiz`);
        if (!response.ok) {
            const error = await response.json();
            alert(error.error || 'Unable to load quiz.');
            return;
        }

        quizState.destination = await response.json();
        quizState.id = quizState.destination.id;
        quizState.hintDifficulty = 5;
        quizState.remainingGuesses = 3;
        quizState.answered = false;
        quizState.lastScore = 0;

        document.getElementById('progressFill').style.width = '100%';
        document.getElementById('hint').textContent = quizState.destination.hint;
        updateHintDisplay(quizState.destination.hint);
        document.getElementById('image1').src = quizState.destination.images[0];
        document.getElementById('image2').src = quizState.destination.images[1];
        document.getElementById('answerInput').value = '';
        document.getElementById('answerInput').focus();
    } catch (error) {
        console.error('Error loading quiz:', error);
        alert('Failed to load quiz. Please refresh the page.');
    }
}

function updateHintDisplay(hintText) {
    const hintDifficulty = quizState.hintDifficulty;
    const potentialPoints = hintDifficulty * quizState.remainingGuesses;

    document.getElementById('hint').textContent = hintText;
    document.getElementById('hintProgress').textContent = `Hint difficulty is ${hintDifficulty}, and you have ${quizState.remainingGuesses} remaining guesses.`;
    document.getElementById('hintPoints').textContent = `If you guess correctly, you will get ${potentialPoints} points.`;
}

async function submitAnswer() {
    if (quizState.answered) return;

    const answerInput = document.getElementById('answerInput');
    const userAnswer = answerInput.value.trim();
    if (!userAnswer) {
        alert('Please enter an answer');
        return;
    }

    quizState.answered = true;
    try {
        const response = await fetch(`${API_BASE}/api/check-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                questionId: quizState.destination.id,
                answer: userAnswer,
                hintDifficulty: quizState.hintDifficulty,
                remainingGuesses: quizState.remainingGuesses
            })
        });

        const result = await response.json();
        if (!response.ok) {
            alert(result.error || 'Error checking answer');
            quizState.answered = false;
            return;
        }

        if (result.correct) {
            quizState.lastScore = result.points;
            showFeedback(true, result.points, result.answer);
        } else {
            quizState.remainingGuesses -= 1;
            if (quizState.remainingGuesses > 0 && quizState.hintDifficulty > 1) {
                quizState.hintDifficulty -= 1;
                await fetchHint(quizState.hintDifficulty);
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

async function skipHint() {
    if (quizState.remainingGuesses <= 0) {
        showFeedback(false, 0, quizState.destination.name);
        return;
    }

    quizState.hintDifficulty = Math.max(1, quizState.hintDifficulty - 1);
    quizState.remainingGuesses -= 1;

    if (quizState.hintDifficulty > 0) {
        await fetchHint(quizState.hintDifficulty);
    } else {
        showFeedback(false, 0, quizState.destination.name);
    }
}

async function fetchHint(wantedHintDifficulty) {
    if (wantedHintDifficulty <= 0) {
        showFeedback(false, 0, quizState.destination.name);
        return;
    }

    document.getElementById('hint').textContent = 'Loading hint...';
    try {
        const response = await fetch(`${API_BASE}/api/hint?questionId=${quizState.id}&difficulty=${wantedHintDifficulty}`);
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to fetch hint');
        }
        updateHintDisplay(result.hint);
        document.getElementById('answerInput').value = '';
        document.getElementById('answerInput').focus();
    } catch (error) {
        console.error('Error fetching hint:', error);
        document.getElementById('hint').textContent = 'Error loading hint. Please try again.';
    }
}

function showFeedback(isCorrect, points, correctAnswer) {
    quizState.lastScore = points;
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

function endQuiz() {
    showScreen('resultsScreen');
    document.getElementById('finalScore').textContent = quizState.lastScore;

    let message = '';
    const score = quizState.lastScore;
    if (score >= 15) {
        message = '🌟 Outstanding! You are a true travel expert!';
    } else if (score >= 12) {
        message = '🎉 Excellent! You know your destinations well!';
    } else if (score >= 9) {
        message = '👏 Good job! Keep exploring the world!';
    } else if (score >= 6) {
        message = '📚 Not bad! Time to travel more!';
    } else {
        message = '🗺️ Keep learning about travel destinations!';
    }

    document.getElementById('resultsMessage').textContent = message;
}

function retakeQuiz() {
    showScreen('quizScreen');
    loadQuestion();
}

async function showStatusScreen() {
    showScreen('statusScreen');
    try {
        const response = await fetch(`${API_BASE}/api/status`);
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('statsCompleted').textContent = stats.quizzesCompleted;
            document.getElementById('statsPoints').textContent = stats.totalPoints;
            document.getElementById('statsOngoing').textContent = stats.quizzesOngoing;
        }
    } catch (error) {
        console.error('Error loading status:', error);
    }
}

function backToStatus() {
    showStatusScreen();
}

async function runRandomQuiz() {
    showScreen('quizScreen');
    loadQuestion();
}

async function runSpecificQuiz() {
    const quizId = document.getElementById('specificQuizId').value.trim();
    if (!quizId) {
        alert('Please enter a quiz ID.');
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/api/quiz/${quizId}`);
        if (!response.ok) {
            const err = await response.json();
            alert(err.error || 'Quiz not found.');
            return;
        }
        const data = await response.json();
        showScreen('quizScreen');
        quizState.destination = data;
        quizState.id = data.id;
        quizState.hintDifficulty = 5;
        quizState.remainingGuesses = 3;
        quizState.answered = false;
        quizState.lastScore = 0;

        document.getElementById('progressFill').style.width = '100%';
        document.getElementById('hint').textContent = data.hint;
        updateHintDisplay(data.hint);
        document.getElementById('image1').src = data.images[0];
        document.getElementById('image2').src = data.images[1];
        document.getElementById('answerInput').value = '';
        document.getElementById('answerInput').focus();
    } catch (error) {
        console.error('Error starting specific quiz:', error);
        alert('Failed to load quiz.');
    }
}

async function handleLogout() {
    try {
        await fetch(`${API_BASE}/api/logout`, { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    }
    quizState.user = null;
    showScreen('welcomeScreen');
}

async function logout() {
    await handleLogout();
}

// Allow Enter key to submit answer
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('answerInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitAnswer();
        }
    });

    document.getElementById('email')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAuth();
        }
    });

    document.getElementById('password')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAuth();
        }
    });

    loadUser();
});
