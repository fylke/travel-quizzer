# Requirements Document

## Introduction

This document specifies the requirements for an admin page that allows authorized administrators to add new quiz destinations (questions) and manage quiz content in the Travel Quizzer application. The admin page provides a dedicated interface for content management without requiring direct database access.

## Glossary

- **Admin_Page**: A dedicated web page accessible only to administrators for managing quiz content
- **Administrator**: A user with elevated privileges who can create and manage quiz destinations
- **Destination**: A quiz item consisting of a name, five progressive hints, images, and accepted answers
- **Backend**: The Flask-based Python server that handles API requests and database operations
- **Frontend**: The HTML/CSS/JavaScript client that provides the user interface
- **CSRF_Token**: A security token used to prevent cross-site request forgery attacks

## Requirements

### Requirement 1: Admin Authentication

**User Story:** As an administrator, I want to access the admin page only after authenticating with admin credentials, so that unauthorized users cannot modify quiz content.

#### Acceptance Criteria

1. WHEN an unauthenticated user attempts to access the Admin_Page, THE Backend SHALL return a 401 Unauthorized response
2. WHEN a non-admin user attempts to access admin API endpoints, THE Backend SHALL return a 403 Forbidden response
3. WHEN an administrator provides valid credentials and has admin privileges, THE Backend SHALL grant access to admin functionality
4. THE Backend SHALL identify administrators by an is_admin flag on the User model

### Requirement 2: Admin Page Navigation

**User Story:** As an administrator, I want a dedicated admin page accessible from the status screen, so that I can easily navigate to content management.

#### Acceptance Criteria

1. WHILE a user with admin privileges is on the status screen, THE Frontend SHALL display a link or button to navigate to the Admin_Page
2. WHILE a user without admin privileges is on the status screen, THE Frontend SHALL hide the admin navigation element
3. WHEN an administrator clicks the admin navigation element, THE Frontend SHALL display the Admin_Page

### Requirement 3: Add New Destination

**User Story:** As an administrator, I want to add new quiz destinations with all required fields, so that new quiz content is available for players.

#### Acceptance Criteria

1. THE Admin_Page SHALL provide a form with input fields for destination name, hint1, hint2, hint3, hint4, hint5, images, and correct_answers
2. WHEN an administrator submits a valid destination form, THE Backend SHALL create a new Destination record in the database
3. WHEN an administrator submits a valid destination form, THE Backend SHALL return the created Destination with its assigned ID
4. WHEN an administrator submits a destination form with missing required fields, THE Backend SHALL return a 400 Bad Request response with a descriptive error message
5. THE Backend SHALL validate that the destination name is a non-empty string with a maximum length of 128 characters
6. THE Backend SHALL validate that each hint field is a non-empty string with a maximum length of 256 characters
7. THE Backend SHALL validate that images is a non-empty list of valid URL strings
8. THE Backend SHALL validate that correct_answers is a non-empty list of non-empty strings

### Requirement 4: List Existing Destinations

**User Story:** As an administrator, I want to view a list of all existing destinations, so that I can see what quiz content already exists and avoid duplicates.

#### Acceptance Criteria

1. WHEN an administrator loads the Admin_Page, THE Backend SHALL return a list of all existing Destination records with their IDs and names
2. THE Admin_Page SHALL display the list of existing destinations with their IDs and names
3. THE Admin_Page SHALL display the total count of destinations

### Requirement 5: CSRF Protection for Admin Endpoints

**User Story:** As a system operator, I want admin endpoints protected against CSRF attacks, so that malicious sites cannot trigger administrative actions.

#### Acceptance Criteria

1. WHEN a request to an admin API endpoint lacks a valid CSRF_Token, THE Backend SHALL return a 403 Forbidden response
2. WHEN a request to an admin API endpoint includes a valid CSRF_Token, THE Backend SHALL process the request normally

### Requirement 6: Input Sanitization

**User Story:** As a system operator, I want all admin inputs sanitized before storage, so that malicious content cannot be injected into the database.

#### Acceptance Criteria

1. WHEN an administrator submits destination data, THE Backend SHALL trim leading and trailing whitespace from all string fields
2. WHEN an administrator submits correct_answers, THE Backend SHALL normalize each answer to lowercase
3. WHEN an administrator submits destination data containing empty strings after trimming, THE Backend SHALL reject the submission with a 400 Bad Request response

### Requirement 7: Admin API Rate Limiting

**User Story:** As a system operator, I want admin endpoints rate-limited, so that abuse or accidental repeated submissions are prevented.

#### Acceptance Criteria

1. THE Backend SHALL limit destination creation requests to 30 per minute per IP address
2. IF the rate limit is exceeded, THEN THE Backend SHALL return a 429 Too Many Requests response
