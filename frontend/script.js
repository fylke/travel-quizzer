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
        screen.classList.remove('screen-fade-in');
    });
    const target = document.getElementById(screenId);
    target.classList.remove('hidden');
    target.classList.add('screen-fade-in');
}

function showNotification(message, type = 'error') {
    // Remove any existing notification
    const existing = document.getElementById('appNotification');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'appNotification';
    el.className = `app-notification app-notification-${type}`;
    el.setAttribute('role', 'alert');
    el.textContent = message;
    document.body.appendChild(el);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        el.classList.add('app-notification-fade');
        el.addEventListener('transitionend', () => el.remove());
    }, 5000);
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
        if (response.status === 401) {
            showScreen('welcomeScreen');
            return;
        }
        if (!response.ok) {
            showNotification('Unable to reach server. Please try again.');
            showScreen('welcomeScreen');
            return;
        }
        const data = await response.json();
        quizState.user = data;
        csrfToken = data.csrfToken || null;
        showStatusScreen();
    } catch (error) {
        console.error('Error checking auth status:', error);
        showNotification('Cannot connect to server.');
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

    if (!email || !password) {
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
            showNotification(error.error || 'Unable to load quiz.');
            return;
        }

        const data = await response.json();
        displayQuiz(data);
    } catch (error) {
        console.error('Error loading quiz:', error);
        showNotification('Failed to load quiz. Please refresh the page.');
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
        animateWrongGuess(answerInput);
        answerInput.focus();
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
            showNotification(result.error || 'Error checking answer');
            submitting = false;
            return;
        }

        if (result.correct) {
            showFeedback(true, result.points, result.answer);
        } else if (result.remainingGuesses !== undefined && result.remainingGuesses > 0) {
            // Wrong but still has guesses — backend returned next hint
            animateWrongGuess(answerInput);
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
        showNotification('Error checking answer');
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
        } else {
            showNotification('Failed to load statistics.');
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        showNotification('Cannot connect to server.');
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

    // Fetch and render quiz type buttons
    await loadQuizTypeButtons();
}

async function loadQuizTypeButtons() {
    // Hide the static "Run Random Quiz" button
    const staticRunBtn = document.getElementById('runRandomQuizBtn');
    if (staticRunBtn) {
        staticRunBtn.style.display = 'none';
    }

    // Find or create the quiz type buttons container
    let quizTypeContainer = document.getElementById('quizTypeButtonsContainer');
    if (!quizTypeContainer) {
        quizTypeContainer = document.createElement('div');
        quizTypeContainer.id = 'quizTypeButtonsContainer';
        quizTypeContainer.className = 'quiz-type-buttons-container';
        // Insert before the admin link button
        const quizActions = document.querySelector('.quiz-actions');
        const adminLinkEl = quizActions ? quizActions.querySelector('#adminLink') : null;
        if (quizActions && adminLinkEl) {
            quizActions.insertBefore(quizTypeContainer, adminLinkEl);
        } else if (quizActions && staticRunBtn && staticRunBtn.parentNode === quizActions) {
            quizActions.insertBefore(quizTypeContainer, staticRunBtn.nextSibling);
        } else if (quizActions) {
            quizActions.appendChild(quizTypeContainer);
        }
    }

    // Clear previous content
    quizTypeContainer.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE}/api/quiz-types`);
        if (!response.ok) {
            showNotification('Could not load quiz types.');
            return;
        }

        const quizTypes = await response.json();

        if (quizTypes.length === 0) {
            quizTypeContainer.innerHTML = '<p class="quiz-type-empty-message">No quiz types are currently available.</p>';
            return;
        }

        // Sort alphabetically by displayName
        quizTypes.sort((a, b) => a.displayName.localeCompare(b.displayName));

        // Render one button per quiz type with adjacent info icon
        quizTypes.forEach(type => {
            const row = document.createElement('div');
            row.className = 'quiz-type-row';

            const btn = document.createElement('button');
            btn.className = 'btn btn-primary quiz-type-btn';
            btn.textContent = type.displayName;
            btn.addEventListener('click', () => runRandomQuiz());

            const infoBtn = document.createElement('button');
            infoBtn.className = 'btn btn-secondary quiz-type-info-btn';
            infoBtn.setAttribute('aria-label', `Rules for ${type.displayName}`);
            infoBtn.textContent = 'ℹ️';
            infoBtn.addEventListener('click', () => openRulesModal(type.identifier));

            row.appendChild(btn);
            row.appendChild(infoBtn);
            quizTypeContainer.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading quiz types:', error);
        showNotification('Could not load quiz types.');
    }
}

// ==================== Rules Modal ====================

let _rulesModalTrigger = null;

async function openRulesModal(quizType) {
    // Store reference to triggering element for focus restoration
    _rulesModalTrigger = document.activeElement;

    const modal = document.getElementById('rulesModal');
    const titleEl = document.getElementById('rulesModalTitle');
    const contentEl = document.getElementById('rulesModalContent');

    // Show modal with loading state
    titleEl.textContent = 'Rules';
    contentEl.innerHTML = '<p class="rules-loading">Loading...</p>';
    modal.style.display = 'flex';

    // Fetch rules content
    try {
        const response = await fetch(`${API_BASE}/api/rules/${encodeURIComponent(quizType)}`);
        if (!response.ok) {
            // Hide modal and notify user
            modal.style.display = 'none';
            const errData = await response.json().catch(() => ({}));
            showNotification(errData.error || 'Could not load rules.');
            if (_rulesModalTrigger) _rulesModalTrigger.focus();
            return;
        }

        const data = await response.json();
        contentEl.innerHTML = renderMarkdown(data.content);
    } catch (error) {
        console.error('Error fetching rules:', error);
        modal.style.display = 'none';
        showNotification('Could not load rules.');
        if (_rulesModalTrigger) _rulesModalTrigger.focus();
        return;
    }

    // Focus the close button
    const closeBtn = document.getElementById('rulesModalCloseBtn');
    if (closeBtn) closeBtn.focus();
}

function closeRulesModal() {
    const modal = document.getElementById('rulesModal');
    modal.style.display = 'none';

    // Return focus to the element that triggered the modal
    if (_rulesModalTrigger) {
        _rulesModalTrigger.focus();
        _rulesModalTrigger = null;
    }
}

// Focus trap and Escape key handling for rules modal
(function setupRulesModalFocusTrap() {
    document.addEventListener('keydown', function (e) {
        const modal = document.getElementById('rulesModal');
        if (!modal || modal.style.display === 'none') return;

        if (e.key === 'Escape') {
            e.preventDefault();
            closeRulesModal();
            return;
        }

        if (e.key === 'Tab') {
            // Gather all focusable elements inside the modal
            const focusableSelectors = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
            const focusableElements = Array.from(modal.querySelectorAll(focusableSelectors)).filter(el => el.offsetParent !== null);

            if (focusableElements.length === 0) return;

            const firstEl = focusableElements[0];
            const lastEl = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstEl) {
                    e.preventDefault();
                    lastEl.focus();
                }
            } else {
                if (document.activeElement === lastEl) {
                    e.preventDefault();
                    firstEl.focus();
                }
            }
        }
    });
})();

// Wire up the close button
document.addEventListener('DOMContentLoaded', function () {
    const closeBtn = document.getElementById('rulesModalCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeRulesModal);
    }
});

// ==================== End Rules Modal ====================

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
        showNotification('Please enter a quiz ID.');
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/api/quiz/${quizId}`);
        if (!response.ok) {
            const err = await response.json();
            showNotification(err.error || 'Quiz not found.');
            return;
        }
        const data = await response.json();
        showScreen('quizScreen');
        displayQuiz(data);
    } catch (error) {
        console.error('Error starting specific quiz:', error);
        showNotification('Failed to load quiz.');
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
            (dest.images || []).forEach(url => addImageField(url));
            if (!dest.images || dest.images.length === 0) {
                addImageField('');
                addImageField('');
            }
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
    if (images.length < 2) {
        showAdminError('At least 2 image URLs are required');
        return;
    }
    if (images.length > 10) {
        showAdminError('No more than 10 image URLs are allowed');
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

// ==================== Wrong Guess Animation ====================

/**
 * Applies wrong-guess animation to the quiz screen container.
 * - If prefers-reduced-motion is active: applies static red border for 1s.
 * - Otherwise: applies shake + glow CSS animations (800ms).
 * - Handles re-triggering if animation is already active.
 * - Cleans up all animation classes/styles on completion.
 *
 * @param {HTMLElement} inputElement - The input element (used for fallback/focus, animation targets #quizScreen)
 */
function animateWrongGuess(inputElement) {
    if (!inputElement) return;

    const target = document.getElementById('quizScreen') || inputElement;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        // Static fallback: two-pulse glow animation (1.2s)
        target.classList.remove('screen-fade-in');
        target.classList.remove('wrong-guess-static');
        void target.offsetWidth;
        target.classList.add('wrong-guess-static');
        setTimeout(() => {
            target.classList.remove('wrong-guess-static');
        }, 1300);
        return;
    }

    // Remove fade-in animation class to avoid conflict with wrong-guess animation
    target.classList.remove('screen-fade-in');

    // Remove existing animation classes to allow re-trigger
    target.classList.remove('wrong-guess-shake', 'wrong-guess-glow');

    // Force reflow so re-adding classes restarts the animation
    void target.offsetWidth;

    // Apply animation classes
    target.classList.add('wrong-guess-shake', 'wrong-guess-glow');

    // Cleanup function to remove classes and residual inline styles
    function cleanup() {
        target.classList.remove('wrong-guess-shake', 'wrong-guess-glow');
        target.style.removeProperty('left');
        target.style.removeProperty('transform');
        target.style.removeProperty('box-shadow');
        target.style.removeProperty('border-color');
        target.style.removeProperty('position');
    }

    // Listen for animationend to remove classes (once)
    let cleaned = false;
    function onAnimationEnd(e) {
        // Only respond to animations on the target itself, not bubbled from children
        if (e.target !== target) return;
        if (cleaned) return;
        cleaned = true;
        cleanup();
    }

    target.addEventListener('animationend', onAnimationEnd);

    // Defensive fallback: remove classes after 1500ms if animationend never fires
    setTimeout(() => {
        if (!cleaned) {
            cleaned = true;
            target.removeEventListener('animationend', onAnimationEnd);
            cleanup();
        }
    }, 1500);
}

// ==================== End Wrong Guess Animation ====================

// ==================== Forgot Password Modal ====================

const _FORGOT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function openForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    const emailInput = document.getElementById('resetEmail');
    const errorEl = document.getElementById('resetEmailError');

    // Clear prior state
    emailInput.value = '';
    errorEl.textContent = '';

    // Show modal
    modal.style.display = 'flex';

    // Reset to form view (in case a confirmation message was previously shown)
    const formGroup = modal.querySelector('.modal-form-group');
    const buttons = modal.querySelector('.modal-buttons');
    if (formGroup) formGroup.style.display = '';
    if (buttons) buttons.style.display = '';
    const confirmationMsg = document.getElementById('forgotPasswordConfirmation');
    if (confirmationMsg) confirmationMsg.remove();

    // Focus on email input
    emailInput.focus();
}

function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    modal.style.display = 'none';

    // Return focus to the "Forgot password?" link
    const link = document.getElementById('forgotPasswordLink');
    if (link) link.focus();
}

async function handleForgotPasswordSubmit() {
    const emailInput = document.getElementById('resetEmail');
    const errorEl = document.getElementById('resetEmailError');
    const email = emailInput.value.trim();

    // Clear previous error
    errorEl.textContent = '';

    // Validate: non-empty
    if (!email) {
        errorEl.textContent = 'Please enter your email address.';
        emailInput.focus();
        return;
    }

    // Validate: valid format
    if (!_FORGOT_EMAIL_RE.test(email)) {
        errorEl.textContent = 'Please enter a valid email address.';
        emailInput.focus();
        return;
    }

    // Submit to backend
    try {
        const response = await fetch(`${API_BASE}/api/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (response.status === 500) {
            errorEl.textContent = 'Failed to send reset email. Please try again later.';
            return;
        }

        // For any valid-format email (200 or other non-500), show confirmation
        _showForgotPasswordConfirmation();
    } catch (error) {
        console.error('Forgot password error:', error);
        errorEl.textContent = 'Failed to send reset email. Please try again later.';
    }
}

function _showForgotPasswordConfirmation() {
    const modal = document.getElementById('forgotPasswordModal');
    const formGroup = modal.querySelector('.modal-form-group');
    const buttons = modal.querySelector('.modal-buttons');

    // Hide the form elements
    if (formGroup) formGroup.style.display = 'none';
    if (buttons) buttons.style.display = 'none';

    // Show confirmation message
    const confirmation = document.createElement('div');
    confirmation.id = 'forgotPasswordConfirmation';
    confirmation.className = 'modal-confirmation';
    confirmation.innerHTML = `
        <p>If that email is registered, a reset link has been sent.</p>
        <button onclick="closeForgotPasswordModal()" class="btn btn-primary">Close</button>
    `;
    modal.querySelector('.modal-card').appendChild(confirmation);
}

// Focus trap for the forgot password modal
(function setupForgotPasswordFocusTrap() {
    document.addEventListener('keydown', function (e) {
        const modal = document.getElementById('forgotPasswordModal');
        if (!modal || modal.style.display === 'none') return;

        if (e.key === 'Escape') {
            e.preventDefault();
            closeForgotPasswordModal();
            return;
        }

        if (e.key === 'Tab') {
            const focusableElements = [
                document.getElementById('resetEmail'),
                document.getElementById('forgotPasswordSubmitBtn'),
                document.getElementById('forgotPasswordCancelBtn')
            ].filter(el => el && el.offsetParent !== null);

            if (focusableElements.length === 0) return;

            const firstEl = focusableElements[0];
            const lastEl = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                // Shift+Tab: if on first element, wrap to last
                if (document.activeElement === firstEl) {
                    e.preventDefault();
                    lastEl.focus();
                }
            } else {
                // Tab: if on last element, wrap to first
                if (document.activeElement === lastEl) {
                    e.preventDefault();
                    firstEl.focus();
                }
            }
        }
    });
})();

// ==================== End Forgot Password Modal ====================

// ==================== Markdown Renderer ====================

/**
 * Minimal markdown-to-HTML renderer.
 * Supports: headings (#, ##, ###), unordered lists (- or *), ordered lists (1.),
 * paragraphs, bold (**text**), and italic (*text*).
 *
 * @param {string} mdText - Raw markdown string
 * @returns {string} HTML string
 */
function renderMarkdown(mdText) {
    if (!mdText) return '';

    const lines = mdText.split('\n');
    const output = [];
    let inUl = false;
    let inOl = false;
    let paragraphLines = [];

    function applyInline(text) {
        // Bold first (**text**), then italic (*text*)
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
        return text;
    }

    function flushParagraph() {
        if (paragraphLines.length > 0) {
            output.push('<p>' + applyInline(paragraphLines.join(' ')) + '</p>');
            paragraphLines = [];
        }
    }

    function closeList() {
        if (inUl) {
            output.push('</ul>');
            inUl = false;
        }
        if (inOl) {
            output.push('</ol>');
            inOl = false;
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Empty line — flush paragraph and close lists
        if (line.trim() === '') {
            flushParagraph();
            closeList();
            continue;
        }

        // Headings
        const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
        if (headingMatch) {
            flushParagraph();
            closeList();
            const level = headingMatch[1].length;
            const content = applyInline(headingMatch[2]);
            output.push('<h' + level + '>' + content + '</h' + level + '>');
            continue;
        }

        // Unordered list items (- or * followed by space)
        const ulMatch = line.match(/^[\-\*]\s+(.*)/);
        if (ulMatch) {
            flushParagraph();
            if (inOl) {
                output.push('</ol>');
                inOl = false;
            }
            if (!inUl) {
                output.push('<ul>');
                inUl = true;
            }
            output.push('<li>' + applyInline(ulMatch[1]) + '</li>');
            continue;
        }

        // Ordered list items (number followed by . and space)
        const olMatch = line.match(/^\d+\.\s+(.*)/);
        if (olMatch) {
            flushParagraph();
            if (inUl) {
                output.push('</ul>');
                inUl = false;
            }
            if (!inOl) {
                output.push('<ol>');
                inOl = true;
            }
            output.push('<li>' + applyInline(olMatch[1]) + '</li>');
            continue;
        }

        // Regular text — accumulate into paragraph
        closeList();
        paragraphLines.push(line);
    }

    // Flush remaining content
    flushParagraph();
    closeList();

    return output.join('');
}

// ==================== End Markdown Renderer ====================

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
