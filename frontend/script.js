// Quiz State — only tracks the authenticated user; all quiz progress lives on the backend.
let quizState = {
    user: null
};

let csrfToken = null;

const API_BASE = window.location.origin;
let authMode = 'login';
let submitting = false; // guards against double-click on submit

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

function showAuthError(message) {
    const el = document.getElementById('authError');
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
    }
}

function clearAuthError() {
    const el = document.getElementById('authError');
    if (el) {
        el.textContent = '';
        el.style.display = 'none';
    }
}

async function loadUser() {
    try {
        const response = await fetch(`${API_BASE}/api/me`);
        if (!response.ok) {
            showScreen('welcomeScreen');
            return;
        }
        const data = await response.json();
        quizState.user = data;
        csrfToken = data.csrfToken || null;
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

    // Mark email as touched so validation styles apply
    document.getElementById('email').classList.add('touched');

    if (!email || !password || (authMode === 'register' && !name)) {
        showAuthError('Please fill in all required fields.');
        return;
    }

    if (authMode === 'register' && password.length < 8) {
        showAuthError('Password must be at least 8 characters.');
        return;
    }

    // Client-side email format check
    const emailInput = document.getElementById('email');
    if (!emailInput.validity.valid) {
        showAuthError('Please enter a valid email address.');
        return;
    }

    clearAuthError();

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
            showAuthError(data.error || 'Authentication failed');
            return;
        }

        quizState.user = data;
        csrfToken = data.csrfToken || null;
        showStatusScreen();
    } catch (error) {
        console.error('Auth error:', error);
        showAuthError('Unable to authenticate. Please try again.');
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
        const response = await fetch(`${API_BASE}/api/stats`);
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('statsCumulativeScore').textContent = stats.cumulativeScore;
            document.getElementById('statsCompleted').textContent = stats.quizzesCompleted;
            document.getElementById('statsAverageScore').textContent = stats.averageScore;
            document.getElementById('statsBestScore').textContent = stats.bestScore;
            document.getElementById('statsAccuracyRate').textContent = stats.accuracyRate + '%';
            document.getElementById('statsCurrentStreak').textContent = stats.currentStreak;
            document.getElementById('statsOngoing').textContent = stats.quizzesOngoing;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }

    // Show/hide admin link based on user role
    const adminLink = document.getElementById('adminLink');
    if (adminLink) {
        if (quizState.user && quizState.user.isAdmin) {
            adminLink.style.display = '';
        } else {
            adminLink.style.display = 'none';
        }
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
        const headers = {};
        if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
        }
        await fetch(`${API_BASE}/api/logout`, { method: 'POST', headers });
    } catch (error) {
        console.error('Logout error:', error);
    }
    quizState.user = null;
    csrfToken = null;
    showScreen('welcomeScreen');
}

async function logout() {
    await handleLogout();
}

// ==================== Admin Panel ====================

let editingDestId = null;

function showAdminScreen() {
    showScreen('adminScreen');
    hideAdminForm();
    loadDestinations();
}

function hideAdminScreen() {
    showStatusScreen();
}

function showAdminError(message) {
    const el = document.getElementById('adminError');
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function showAdminSuccess(message) {
    const el = document.getElementById('adminSuccess');
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
}

async function loadDestinations() {
    const listEl = document.getElementById('adminDestList');
    const countEl = document.getElementById('adminDestCount');
    const emptyEl = document.getElementById('adminEmptyState');

    try {
        const response = await fetch(`${API_BASE}/api/admin/destinations`);
        if (!response.ok) {
            const err = await response.json();
            showAdminError(err.error || 'Failed to load destinations');
            return;
        }
        const data = await response.json();
        const destinations = data.destinations;
        countEl.textContent = `Total destinations: ${data.count}`;

        if (destinations.length === 0) {
            emptyEl.style.display = 'block';
            listEl.innerHTML = '';
            return;
        }

        emptyEl.style.display = 'none';
        listEl.innerHTML = destinations.map(dest => `
            <div class="admin-dest-item">
                <span class="admin-dest-id">#${dest.id}</span>
                <span class="admin-dest-name">${escapeHtml(dest.name)}</span>
                <div class="admin-dest-actions">
                    <button onclick="showDestinationForm(${dest.id})" class="btn btn-secondary btn-small">Edit</button>
                    <button onclick="deleteDestination(${dest.id}, '${escapeHtml(dest.name).replace(/'/g, "\\'")}')" class="btn btn-danger btn-small">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading destinations:', error);
        showAdminError('Could not connect to server');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function showDestinationForm(id) {
    editingDestId = id || null;
    const formTitle = document.getElementById('adminFormTitle');
    const formEl = document.getElementById('adminForm');

    // Clear form fields
    document.getElementById('adminDestName').value = '';
    for (let i = 1; i <= 5; i++) {
        document.getElementById(`adminHint${i}`).value = '';
    }
    document.getElementById('adminImagesContainer').innerHTML = '';
    document.getElementById('adminAnswersContainer').innerHTML = '';

    if (editingDestId) {
        formTitle.textContent = 'Edit Destination';
        try {
            const response = await fetch(`${API_BASE}/api/admin/destinations/${editingDestId}`);
            if (!response.ok) {
                const err = await response.json();
                showAdminError(err.error || 'Failed to load destination');
                return;
            }
            const dest = await response.json();
            document.getElementById('adminDestName').value = dest.name;
            for (let i = 0; i < 5; i++) {
                document.getElementById(`adminHint${i + 1}`).value = dest.hints[i] || '';
            }
            dest.images.forEach(url => addImageField(url));
            dest.correct_answers.forEach(ans => addAnswerField(ans));
        } catch (error) {
            console.error('Error loading destination:', error);
            showAdminError('Could not connect to server');
            return;
        }
    } else {
        formTitle.textContent = 'Add New Destination';
        // Start with 2 image fields and 1 answer field
        addImageField('');
        addImageField('');
        addAnswerField('');
    }

    // Show form, hide list
    formEl.style.display = 'block';
    document.getElementById('adminDestList').style.display = 'none';
    document.querySelector('.admin-actions').style.display = 'none';
    document.getElementById('adminDestCount').style.display = 'none';
    document.getElementById('adminEmptyState').style.display = 'none';
}

function hideAdminForm() {
    document.getElementById('adminForm').style.display = 'none';
    document.getElementById('adminDestList').style.display = '';
    document.querySelector('.admin-actions').style.display = '';
    document.getElementById('adminDestCount').style.display = '';
    editingDestId = null;
}

async function saveDestination() {
    const name = document.getElementById('adminDestName').value.trim();
    const hints = [];
    for (let i = 1; i <= 5; i++) {
        hints.push(document.getElementById(`adminHint${i}`).value.trim());
    }
    const imageInputs = document.querySelectorAll('#adminImagesContainer input');
    const images = Array.from(imageInputs).map(input => input.value.trim()).filter(v => v);
    const answerInputs = document.querySelectorAll('#adminAnswersContainer input');
    const correct_answers = Array.from(answerInputs).map(input => input.value.trim()).filter(v => v);

    // Client-side validation
    if (!name) {
        showAdminError('Name is required');
        return;
    }
    if (name.length > 128) {
        showAdminError('Name must be 128 characters or less');
        return;
    }
    for (let i = 0; i < 5; i++) {
        if (!hints[i]) {
            showAdminError(`Hint ${i + 1} is required`);
            return;
        }
        if (hints[i].length > 256) {
            showAdminError(`Hint ${i + 1} must be 256 characters or less`);
            return;
        }
    }
    if (images.length < 2 || images.length > 10) {
        showAdminError('Between 2 and 10 image URLs are required');
        return;
    }
    if (correct_answers.length < 1 || correct_answers.length > 20) {
        showAdminError('Between 1 and 20 correct answers are required');
        return;
    }

    const payload = { name, hints, images, correct_answers };
    const headers = { 'Content-Type': 'application/json' };
    if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
    }

    try {
        let response;
        if (editingDestId) {
            response = await fetch(`${API_BASE}/api/admin/destinations/${editingDestId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(payload)
            });
        } else {
            response = await fetch(`${API_BASE}/api/admin/destinations`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });
        }

        if (!response.ok) {
            const err = await response.json();
            if (err.details) {
                showAdminError(err.details.join(', '));
            } else {
                showAdminError(err.error || 'Failed to save destination');
            }
            return;
        }

        showAdminSuccess(editingDestId ? 'Destination updated successfully' : 'Destination created successfully');
        hideAdminForm();
        loadDestinations();
    } catch (error) {
        console.error('Error saving destination:', error);
        showAdminError('Could not connect to server');
    }
}

function deleteDestination(id, name) {
    const dialog = document.getElementById('adminDeleteDialog');
    document.getElementById('adminDeleteName').textContent = name;
    dialog.style.display = 'flex';

    const confirmBtn = document.getElementById('adminDeleteConfirmBtn');
    // Remove old listener by replacing the node
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    newBtn.addEventListener('click', async () => {
        const headers = {};
        if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
        }
        try {
            const response = await fetch(`${API_BASE}/api/admin/destinations/${id}`, {
                method: 'DELETE',
                headers
            });
            if (!response.ok) {
                const err = await response.json();
                showAdminError(err.error || 'Failed to delete destination');
            } else {
                showAdminSuccess('Destination deleted successfully');
                loadDestinations();
            }
        } catch (error) {
            console.error('Error deleting destination:', error);
            showAdminError('Could not connect to server');
        }
        hideDeleteDialog();
    });
}

function hideDeleteDialog() {
    document.getElementById('adminDeleteDialog').style.display = 'none';
}

function addImageField(value) {
    const container = document.getElementById('adminImagesContainer');
    const row = document.createElement('div');
    row.className = 'admin-dynamic-field-row';
    row.innerHTML = `
        <input type="url" value="${escapeAttr(value || '')}" placeholder="https://example.com/image.jpg">
        <button type="button" onclick="removeImageField(this)" class="btn btn-danger btn-small">✕</button>
    `;
    container.appendChild(row);
}

function removeImageField(btn) {
    btn.parentElement.remove();
}

function addAnswerField(value) {
    const container = document.getElementById('adminAnswersContainer');
    const row = document.createElement('div');
    row.className = 'admin-dynamic-field-row';
    row.innerHTML = `
        <input type="text" value="${escapeAttr(value || '')}" maxlength="128" placeholder="Correct answer">
        <button type="button" onclick="removeAnswerField(this)" class="btn btn-danger btn-small">✕</button>
    `;
    container.appendChild(row);
}

function removeAnswerField(btn) {
    btn.parentElement.remove();
}

function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ==================== End Admin Panel ====================

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

    // Show validation styling after the user interacts with the email field
    const emailInput = document.getElementById('email');
    emailInput?.addEventListener('blur', () => {
        emailInput.classList.add('touched');
        const hint = document.getElementById('emailHint');
        if (hint) {
            hint.style.display = emailInput.validity.valid || !emailInput.value ? 'none' : 'block';
        }
    });
    emailInput?.addEventListener('input', () => {
        if (emailInput.classList.contains('touched')) {
            const hint = document.getElementById('emailHint');
            if (hint) {
                hint.style.display = emailInput.validity.valid || !emailInput.value ? 'none' : 'block';
            }
        }
    });

    document.getElementById('password')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAuth();
        }
    });

    loadUser();
});
