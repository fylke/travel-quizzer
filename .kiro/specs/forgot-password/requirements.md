# Requirements Document

## Introduction

This feature adds a "Forgot Password" flow to the Travel Quizzer application. Users who cannot remember their password will be able to request a time-limited reset link sent to their registered email address. The flow is presented as a modal on the existing login page. This feature requires adding SMTP email sending capability to the application, configured via environment variables.

## Glossary

- **Reset_Token_Service**: The backend component responsible for generating, storing, validating, and expiring password reset tokens.
- **Email_Service**: The backend component responsible for sending emails via SMTP, including password reset links.
- **Password_Reset_Modal**: The frontend modal dialog displayed on the login page that collects the user's email address for a password reset request.
- **Password_Reset_Form**: The frontend form displayed when a user follows a valid reset link, allowing them to enter a new password.
- **Reset_Token**: A cryptographically random, URL-safe string that uniquely identifies a password reset request. Each token is single-use and time-limited.
- **Token_Expiry_Window**: The time period (15 minutes) during which a reset token remains valid after generation.

## Requirements

### Requirement 1: Password Reset Request

**User Story:** As a registered user who has forgotten my password, I want to request a password reset link via email, so that I can regain access to my account.

#### Acceptance Criteria

1. WHEN the user submits an email address to the password reset endpoint, THE Reset_Token_Service SHALL generate a cryptographically random URL-safe token of at least 32 bytes.
2. WHEN a reset token is generated, THE Reset_Token_Service SHALL store the token hash, the associated user ID, the creation timestamp, and an expiration time of 15 minutes from creation in the database.
3. WHEN a reset token is generated, THE Reset_Token_Service SHALL invalidate all previously issued tokens for the same user.
4. WHEN a valid email address is submitted, THE Email_Service SHALL send an email containing a password reset link with the token embedded as a URL parameter.
5. WHEN an email address that does not match any registered user is submitted, THE Reset_Token_Service SHALL return the same success response as for a valid email address to prevent user enumeration.
6. IF the submitted email address does not conform to the format local-part@domain (where local-part is 1–254 characters and domain contains at least one dot), THEN THE Reset_Token_Service SHALL return a 400 error response with a message indicating the email format is invalid.
7. IF the email address field is empty or missing, THEN THE Reset_Token_Service SHALL return a 400 error response with a message indicating the email field is required.

### Requirement 2: Token Validation and Expiry

**User Story:** As a user who received a reset link, I want the link to work only within a limited time window, so that my account remains secure if the email is intercepted later.

#### Acceptance Criteria

1. WHEN a reset token is presented for validation, THE Reset_Token_Service SHALL reject the token and return an error response indicating the link is invalid or expired if more than 15 minutes have elapsed since its creation timestamp.
2. WHEN a reset token is presented for validation, THE Reset_Token_Service SHALL reject the token and return an error response indicating the link is invalid or expired if it has already been used to reset a password.
3. WHEN a reset token is successfully used to reset a password, THE Reset_Token_Service SHALL mark the token as consumed so that any subsequent attempt to use the same token is rejected.
4. IF a token is presented that does not match any issued token, or is malformed, THEN THE Reset_Token_Service SHALL return an error response indicating the link is invalid or expired, indistinguishable from the expired or already-used token response.
5. THE Reset_Token_Service SHALL store tokens as hashed values rather than plaintext to protect against database compromise.
6. THE Reset_Token_Service SHALL generate tokens with at least 128 bits of entropy using a cryptographically secure random source.
7. WHEN a new reset token is generated for a user, THE Reset_Token_Service SHALL invalidate all previously issued unused tokens for that user.

### Requirement 3: Password Reset Execution

**User Story:** As a user with a valid reset link, I want to set a new password, so that I can log in again.

#### Acceptance Criteria

1. WHEN a valid token and a new password are submitted, THE Reset_Token_Service SHALL update the user's password hash in the database with the new password.
2. WHEN the password is reset successfully, THE Reset_Token_Service SHALL invalidate all existing sessions for the affected user.
3. THE Reset_Token_Service SHALL validate that the new password is between 8 and 128 characters long.
4. IF the new password does not meet the length requirements, THEN THE Reset_Token_Service SHALL return a 400 error response with a message indicating the minimum and maximum character length.
5. WHEN the password is reset successfully, THE Reset_Token_Service SHALL return a success response confirming the password was changed.
6. IF the new password field is empty or missing from the request, THEN THE Reset_Token_Service SHALL return a 400 error response with a message indicating that a new password is required.
7. WHEN the password is reset successfully, THE Reset_Token_Service SHALL mark the associated reset token as consumed so it cannot be reused.

### Requirement 4: Email Delivery via SMTP

**User Story:** As a system operator, I want to configure email delivery via SMTP using environment variables, so that I can connect the application to any email provider.

#### Acceptance Criteria

1. THE Email_Service SHALL read SMTP configuration from the following environment variables: SMTP_HOST, SMTP_PORT (integer in range 1–65535), SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_ADDRESS.
2. WHERE SMTP_USE_TLS is set to "true", THE Email_Service SHALL establish a TLS-encrypted connection to the SMTP server. WHERE SMTP_USE_TLS is not set or set to any value other than "true", THE Email_Service SHALL connect without TLS.
3. IF any of the required environment variables (SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_ADDRESS) is missing or empty, or IF the SMTP server does not respond within 10 seconds, THEN THE Email_Service SHALL log an error message indicating the specific failure reason and return a 500 error response to the caller.
4. THE Email_Service SHALL construct password reset emails containing: a subject line that includes the phrase "password reset", the reset link, and a notice stating that the link expires in 15 minutes.
5. THE Email_Service SHALL use the SMTP_FROM_ADDRESS value as the sender address in outgoing emails.
6. IF the SMTP server accepts the connection but rejects the email delivery (e.g., recipient rejected, authentication failure, or server error), THEN THE Email_Service SHALL log an error message indicating the SMTP failure reason and return a 500 error response to the caller.

### Requirement 5: Rate Limiting

**User Story:** As a system operator, I want the password reset request endpoint to be rate-limited, so that attackers cannot abuse it to send spam or enumerate users via timing attacks.

#### Acceptance Criteria

1. THE Reset_Token_Service SHALL limit password reset requests to 3 per email address per hour using a sliding window.
2. THE Reset_Token_Service SHALL limit password reset requests to 10 per IP address per hour using a sliding window.
3. WHEN a rate limit is exceeded, THE Reset_Token_Service SHALL return a 429 error response with a message indicating the user should try again later.
4. THE Reset_Token_Service SHALL process all password reset requests with uniform response timing regardless of whether the email exists in the system, to prevent user enumeration via timing side-channels.

### Requirement 6: Password Reset Modal UI

**User Story:** As a user on the login page, I want to access the forgot password flow via a clearly visible link that opens a modal, so that I do not leave the login page.

#### Acceptance Criteria

1. THE Password_Reset_Modal SHALL be accessible via a "Forgot password?" link displayed below the login form on the welcome screen.
2. WHEN the "Forgot password?" link is clicked, THE Password_Reset_Modal SHALL appear as an overlay on the current page without navigating away.
3. THE Password_Reset_Modal SHALL contain an email input field with a maximum length of 100 characters, a "Submit" button, and a "Cancel" button that closes the modal.
4. WHEN the user submits a valid email address, THE Password_Reset_Modal SHALL display the same confirmation message indicating that a reset link has been sent regardless of whether the email is registered in the system.
5. IF the user submits the form with an empty or invalidly formatted email address, THEN THE Password_Reset_Modal SHALL display an inline validation error message indicating the expected email format and SHALL NOT submit the request to the server.
6. WHEN the modal is closed via the Cancel button or the Escape key, THE Password_Reset_Modal SHALL return focus to the "Forgot password?" link.
7. WHILE the Password_Reset_Modal is open, THE Password_Reset_Modal SHALL trap keyboard focus within the modal so that Tab and Shift+Tab cycle only through the modal's focusable elements.

### Requirement 7: Password Reset Form UI

**User Story:** As a user who clicked the reset link in my email, I want to see a form where I can enter my new password, so that I can complete the reset process.

#### Acceptance Criteria

1. WHEN a user navigates to the reset URL with a token parameter, THE Password_Reset_Form SHALL display a new password input field and a confirm password input field.
2. WHEN the user modifies either password field, THE Password_Reset_Form SHALL validate that both fields match and, if they do not match, display an inline error message below the confirm password field indicating the passwords do not match.
3. THE Password_Reset_Form SHALL display the same password strength indicator used on the registration form and update it on each keystroke in the new password field.
4. WHEN the user attempts to submit the form, IF the new password is fewer than 8 characters or the two fields do not match, THEN THE Password_Reset_Form SHALL prevent submission and display the relevant validation error inline.
5. WHEN the password is successfully reset, THE Password_Reset_Form SHALL display a success message and a link that navigates the user to the login page.
6. IF the token is invalid or expired, THEN THE Password_Reset_Form SHALL display an error message indicating the link is no longer valid and provide a link to request a new reset email.
7. IF the password reset submission fails due to a server or network error, THEN THE Password_Reset_Form SHALL display an error message indicating the request could not be completed and allow the user to retry submission.
8. THE Password_Reset_Form SHALL be served at a dedicated URL path that accepts the token as a query parameter.
