// Quiz State — only tracks the authenticated user; all quiz progress lives on the backend.
let quizState = {
    user: null
};

const API_BASE = window.location.origin;
let authMode = 'login';
let submitting = false; // guards against double-click on submit

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
        updatePasswordStrength();
    } else {
        nameField.classList.add('hidden');
        authButton.textContent = 'Log In';
        switchToRegister.classList.remove('hidden');
        switchToLogin.classList.add('hidden');
        authHeading.textContent = 'Welcome Back';
        authSubtext.textContent = 'Log in to continue.';
        document.getElementById('passwordStrengthContainer').classList.add('hidden');
    }
}

function getPasswordStrength(password) {
    if (!password) return { level: 0, label: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (password.length < 8) return { level: 1, label: 'Too short' };
    if (score <= 2) return { level: 1, label: 'Weak' };
    if (score === 3) return { level: 2, label: 'Fair' };
    if (score === 4) return { level: 3, label: 'Good' };
    return { level: 4, label: 'Strong' };
}

function updatePasswordStrength() {
    const password = document.getElementById('password').value;
    const container = document.getElementById('passwordStrengthContainer');
    const fill = document.getElementById('passwordStrengthFill');
    const label = document.getElementById('passwordStrengthLabel');

    if (!password || authMode !== 'register') {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    const strength = getPasswordStrength(password);
    const classes = ['strength-weak', 'strength-fair', 'strength-good', 'strength-strong'];
    const strengthClass = classes[strength.level - 1] || '';

    fill.className = 'password-strength-fill ' + strengthClass;
    label.className = 'password-strength-label ' + strengthClass;
    label.textContent = strength.label;
}

async function handleAuth() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const name = document.getElementById('name').value.trim();
    
    if (!email || !password || (authMode === 'register' && !name)) {
        alert('Please fill in all required fields.');
        return;
    }

    if (authMode === 'register' && password.length < 8) {
        alert('Password must be at least 8 characters.');
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

function displayQuiz(data) {
    submitting = false;
    document.getElementById('progressFill').style.width = '100%';
    document.getElementById('hint').textContent = data.hint;
    updateHintDisplay(data.hint, data.hintDifficulty, data.remainingGuesses);
    document.getElementById('image1').src = data.images[0];
    document.getElementById('image2').src = data.images[1];
    document.getElementById('answerInput').value = '';
    document.getElementById('answerInput').focus();
}

async function loadQuestion() {
    try {
        const response = await fetch(`${API_BASE}/api/quiz`);
        if (!response.ok) {
            const error = await response.json();
            alert(error.error || 'Unable to load quiz.');
            return;
        }

        const data = await response.json();
        displayQuiz(data);
    } catch (error) {
        console.error('Error loading quiz:', error);
        alert('Failed to load quiz. Please refresh the page.');
    }
}

function updateHintDisplay(hintText, hintDifficulty, remainingGuesses) {
    const potentialPoints = hintDifficulty * remainingGuesses;

    document.getElementById('hint').textContent = hintText;
    document.getElementById('hintProgress').textContent = `Hint difficulty is ${hintDifficulty}, and you have ${remainingGuesses} remaining guesses.`;
    document.getElementById('hintPoints').textContent = `If you guess correctly, you will get ${potentialPoints} points.`;
}

async function submitAnswer() {
    if (submitting) return;

    const answerInput = document.getElementById('answerInput');
    const userAnswer = answerInput.value.trim();
    if (!userAnswer) {
        alert('Please enter an answer');
        return;
    }

    submitting = true;
    try {
        const response = await fetch(`${API_BASE}/api/check-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answer: userAnswer })
        });

        const result = await response.json();
        if (!response.ok) {
            alert(result.error || 'Error checking answer');
            submitting = false;
            return;
        }

        if (result.correct) {
            showFeedback(true, result.points, result.answer);
        } else if (result.remainingGuesses !== undefined && result.remainingGuesses > 0) {
            // Wrong but still has guesses — backend returned next hint
            updateHintDisplay(result.hint, result.hintDifficulty, result.remainingGuesses);
            document.getElementById('answerInput').value = '';
            document.getElementById('answerInput').focus();
            submitting = false;
        } else {
            // Out of guesses
            showFeedback(false, 0, result.answer);
        }
    } catch (error) {
        console.error('Error checking answer:', error);
        alert('Error checking answer');
        submitting = false;
    }
}

async function skipHint() {
    await fetchHint();
}

async function fetchHint() {
    document.getElementById('hint').textContent = 'Loading hint...';
    try {
        const response = await fetch(`${API_BASE}/api/hint`);
        const result = await response.json();
        if (!response.ok) {
            if (response.status === 404) {
                document.getElementById('hint').textContent = 'No more hints remaining, you might as well guess now!';
                document.getElementById('hintProgress').textContent = '';
                document.getElementById('hintPoints').textContent = '';
                return;
            }
            throw new Error(result.error || 'Failed to fetch hint');
        }
        updateHintDisplay(result.hint, result.hintDifficulty, result.remainingGuesses);
        document.getElementById('answerInput').value = '';
        document.getElementById('answerInput').focus();
    } catch (error) {
        console.error('Error fetching hint:', error);
        document.getElementById('hint').textContent = 'Error loading hint. Please try again.';
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

    // Store points in a data attribute for the results screen
    document.getElementById('feedbackScreen').dataset.lastScore = points;
}

function endQuiz() {
    showScreen('resultsScreen');
    const score = parseInt(document.getElementById('feedbackScreen').dataset.lastScore || '0', 10);
    document.getElementById('finalScore').textContent = score;

    let message = '';
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
        displayQuiz(data);
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
