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
    if (name.length > validationRules.destination.nameMaxLength) {
        showAdminError(`Name must be ${validationRules.destination.nameMaxLength} characters or less`);
        return;
    }
    for (let i = 0; i < validationRules.destination.hintCount; i++) {
        if (!hints[i]) {
            showAdminError(`Hint ${i + 1} is required`);
            return;
        }
        if (hints[i].length > validationRules.destination.hintMaxLength) {
            showAdminError(`Hint ${i + 1} must be ${validationRules.destination.hintMaxLength} characters or less`);
            return;
        }
    }
    if (images.length < validationRules.destination.imagesMinCount) {
        showAdminError(`At least ${validationRules.destination.imagesMinCount} image URLs are required`);
        return;
    }
    if (images.length > validationRules.destination.imagesMaxCount) {
        showAdminError(`No more than ${validationRules.destination.imagesMaxCount} image URLs are allowed`);
        return;
    }
    if (correct_answers.length < validationRules.destination.answersMinCount || correct_answers.length > validationRules.destination.answersMaxCount) {
        showAdminError(`Between ${validationRules.destination.answersMinCount} and ${validationRules.destination.answersMaxCount} correct answers are required`);
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
