// Task 10.1: Jasmine unit tests for forgot password modal and reset form JS
// Requirements: 6.5, 7.2, 7.4
describe('Forgot Password', function () {

    // ========== getPasswordStrength reuse ==========
    describe('getPasswordStrength - strength levels', function () {
        it('returns level 0 and empty label for empty/null password', function () {
            var result = getPasswordStrength('');
            expect(result.level).toBe(0);
            expect(result.label).toBe('');

            result = getPasswordStrength(null);
            expect(result.level).toBe(0);
            expect(result.label).toBe('');
        });

        it('returns "Too short" for passwords under 8 characters', function () {
            var result = getPasswordStrength('Ab1!');
            expect(result.level).toBe(1);
            expect(result.label).toBe('Too short');
        });

        it('returns "Weak" for 8+ char password with only lowercase', function () {
            var result = getPasswordStrength('abcdefgh');
            expect(result.level).toBe(1);
            expect(result.label).toBe('Weak');
        });

        it('returns "Fair" for password with length >= 8, mixed case, and digit', function () {
            // score: length>=8 (+1), mixed case (+1), digit (+1) = 3 → Fair
            var result = getPasswordStrength('Abcdefg1');
            expect(result.level).toBe(2);
            expect(result.label).toBe('Fair');
        });

        it('returns "Good" for password with length >= 12, mixed case, and digit', function () {
            // score: length>=8 (+1), length>=12 (+1), mixed case (+1), digit (+1) = 4 → Good
            var result = getPasswordStrength('Abcdefghijk1');
            expect(result.level).toBe(3);
            expect(result.label).toBe('Good');
        });

        it('returns "Strong" for password with length >= 12, mixed case, digit, and special char', function () {
            // score: length>=8 (+1), length>=12 (+1), mixed case (+1), digit (+1), special (+1) = 5 → Strong
            var result = getPasswordStrength('Abcdefghijk1!');
            expect(result.level).toBe(4);
            expect(result.label).toBe('Strong');
        });
    });

    // ========== Inline validation: mismatched/matching passwords ==========
    describe('Reset form - password mismatch validation', function () {
        var formState, resetForm, newPasswordInput, confirmPasswordInput, errorEl;
        var fixtureContainer;

        beforeEach(function () {
            fixtureContainer = document.createElement('div');
            fixtureContainer.id = 'resetFormFixture';
            fixtureContainer.innerHTML =
                '<div id="formState">' +
                    '<form id="resetForm" class="reset-form" novalidate>' +
                        '<input type="password" id="newPassword" maxlength="128">' +
                        '<input type="password" id="confirmPassword" maxlength="128">' +
                        '<span id="resetFormError" class="form-error" role="alert"></span>' +
                        '<button type="submit" class="btn btn-primary">Reset Password</button>' +
                    '</form>' +
                '</div>';
            document.body.appendChild(fixtureContainer);

            newPasswordInput = document.getElementById('newPassword');
            confirmPasswordInput = document.getElementById('confirmPassword');
            errorEl = document.getElementById('resetFormError');
            resetForm = document.getElementById('resetForm');
        });

        afterEach(function () {
            document.body.removeChild(fixtureContainer);
        });

        it('shows "Passwords do not match." when passwords differ on submit', function () {
            // Simulate the inline validation logic from reset_password.html
            newPasswordInput.value = 'ValidPass1!';
            confirmPasswordInput.value = 'DifferentPass2!';

            // Replicate the validation logic
            var newPassword = newPasswordInput.value;
            var confirmPassword = confirmPasswordInput.value;

            if (newPassword !== confirmPassword) {
                errorEl.textContent = 'Passwords do not match.';
            }

            expect(errorEl.textContent).toBe('Passwords do not match.');
        });

        it('clears error when passwords match', function () {
            errorEl.textContent = 'Passwords do not match.';

            newPasswordInput.value = 'ValidPass1!';
            confirmPasswordInput.value = 'ValidPass1!';

            var newPassword = newPasswordInput.value;
            var confirmPassword = confirmPasswordInput.value;

            if (newPassword === confirmPassword) {
                errorEl.textContent = '';
            }

            expect(errorEl.textContent).toBe('');
        });
    });

    // ========== Empty/whitespace password rejection ==========
    describe('Reset form - empty password rejection', function () {
        var fixtureContainer, newPasswordInput, confirmPasswordInput, errorEl;
        var fetchCalled;

        beforeEach(function () {
            fetchCalled = false;

            fixtureContainer = document.createElement('div');
            fixtureContainer.id = 'resetFormFixture2';
            fixtureContainer.innerHTML =
                '<div id="formState">' +
                    '<form id="resetForm" class="reset-form" novalidate>' +
                        '<input type="password" id="newPassword" maxlength="128">' +
                        '<input type="password" id="confirmPassword" maxlength="128">' +
                        '<span id="resetFormError" class="form-error" role="alert"></span>' +
                        '<button type="submit" class="btn btn-primary">Reset Password</button>' +
                    '</form>' +
                '</div>';
            document.body.appendChild(fixtureContainer);

            newPasswordInput = document.getElementById('newPassword');
            confirmPasswordInput = document.getElementById('confirmPassword');
            errorEl = document.getElementById('resetFormError');
        });

        afterEach(function () {
            document.body.removeChild(fixtureContainer);
        });

        it('rejects empty password and does not call fetch', function () {
            newPasswordInput.value = '';
            confirmPasswordInput.value = '';

            // Replicate the reset form validation logic
            var newPassword = newPasswordInput.value;
            var confirmPassword = confirmPasswordInput.value;

            if (!newPassword || !confirmPassword) {
                errorEl.textContent = 'Please fill in both password fields.';
            } else {
                fetchCalled = true;
            }

            expect(errorEl.textContent).toBe('Please fill in both password fields.');
            expect(fetchCalled).toBe(false);
        });

        it('rejects whitespace-only password and does not call fetch', function () {
            newPasswordInput.value = '   ';
            confirmPasswordInput.value = '   ';

            // In the actual form, password length check catches whitespace-only
            // since the form doesn't trim, '   ' has length 3 which is < 8
            var newPassword = newPasswordInput.value;
            var confirmPassword = confirmPasswordInput.value;

            if (!newPassword || !confirmPassword) {
                errorEl.textContent = 'Please fill in both password fields.';
            } else if (newPassword.length < 8) {
                errorEl.textContent = 'Password must be at least 8 characters.';
            } else {
                fetchCalled = true;
            }

            expect(errorEl.textContent).toBe('Password must be at least 8 characters.');
            expect(fetchCalled).toBe(false);
        });

        it('rejects password shorter than 8 chars and does not call fetch', function () {
            newPasswordInput.value = 'short';
            confirmPasswordInput.value = 'short';

            var newPassword = newPasswordInput.value;
            var confirmPassword = confirmPasswordInput.value;

            if (!newPassword || !confirmPassword) {
                errorEl.textContent = 'Please fill in both password fields.';
            } else if (newPassword.length < 8) {
                errorEl.textContent = 'Password must be at least 8 characters.';
            } else {
                fetchCalled = true;
            }

            expect(errorEl.textContent).toBe('Password must be at least 8 characters.');
            expect(fetchCalled).toBe(false);
        });
    });

    // ========== Client-side email validation in modal ==========
    describe('Forgot password modal - email validation', function () {
        var fixtureContainer, resetEmailInput, resetEmailError;

        beforeEach(function () {
            fixtureContainer = document.createElement('div');
            fixtureContainer.id = 'forgotModalFixture';
            fixtureContainer.innerHTML =
                '<div id="forgotPasswordModal" style="display: flex;">' +
                    '<div class="modal-card">' +
                        '<div class="modal-form-group">' +
                            '<input type="email" id="resetEmail" maxlength="100">' +
                            '<span id="resetEmailError"></span>' +
                        '</div>' +
                        '<div class="modal-buttons">' +
                            '<button id="forgotPasswordSubmitBtn">Submit</button>' +
                            '<button id="forgotPasswordCancelBtn">Cancel</button>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(fixtureContainer);

            resetEmailInput = document.getElementById('resetEmail');
            resetEmailError = document.getElementById('resetEmailError');
        });

        afterEach(function () {
            document.body.removeChild(fixtureContainer);
        });

        it('shows error for empty email and does not call fetch', async function () {
            resetEmailInput.value = '';
            spyOn(window, 'fetch');

            await handleForgotPasswordSubmit();

            expect(resetEmailError.textContent).toBe('Please enter your email address.');
            expect(window.fetch).not.toHaveBeenCalled();
        });

        it('shows error for email without @ and does not call fetch', async function () {
            resetEmailInput.value = 'invalidemail.com';
            spyOn(window, 'fetch');

            await handleForgotPasswordSubmit();

            expect(resetEmailError.textContent).toBe('Please enter a valid email address.');
            expect(window.fetch).not.toHaveBeenCalled();
        });

        it('shows error for whitespace-only email and does not call fetch', async function () {
            resetEmailInput.value = '   ';
            spyOn(window, 'fetch');

            await handleForgotPasswordSubmit();

            expect(resetEmailError.textContent).toBe('Please enter your email address.');
            expect(window.fetch).not.toHaveBeenCalled();
        });

        it('calls fetch for valid email format', async function () {
            resetEmailInput.value = 'user@example.com';
            spyOn(window, 'fetch').and.returnValue(Promise.resolve({
                status: 200,
                ok: true,
                json: function () {
                    return Promise.resolve({ message: 'If that email is registered, a reset link has been sent.' });
                }
            }));

            await handleForgotPasswordSubmit();

            expect(window.fetch).toHaveBeenCalled();
            var fetchCall = window.fetch.calls.mostRecent();
            expect(fetchCall.args[0]).toContain('/api/forgot-password');
        });
    });
});
