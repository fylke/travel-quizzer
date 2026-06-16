# Requirements Document

## Introduction

This feature adds an admin page to the Travel Quizzer application that allows administrators to manage quiz content. Administrators will be able to add new destinations (questions), edit existing ones, and delete destinations from the database. The admin interface will be a separate page accessible only to users with admin privileges, providing full CRUD operations on the `destination` table.

## Glossary

- **Admin_Page**: A dedicated web page providing administrative controls for quiz content management
- **Admin_User**: A user with the `is_admin` flag set to true in the database, granting access to administrative functions
- **Destination**: A quiz question entity consisting of a name, five progressive hints, images, and correct answers
- **Quiz_Management_API**: The set of backend API endpoints that handle CRUD operations for destinations
- **Destination_Form**: The UI form used to input or edit destination data including name, hints, images, and correct answers

## Requirements

### Requirement 1: Admin Role Authorization

**User Story:** As a system owner, I want only designated admin users to access the quiz management page, so that unauthorized users cannot modify quiz content.

#### Acceptance Criteria

1. THE User model SHALL include an `is_admin` boolean field that defaults to false
2. WHEN a non-admin user attempts to call any admin API endpoint, THE Quiz_Management_API SHALL return a 403 Forbidden response with an error message indicating insufficient permissions
3. WHEN an unauthenticated user attempts to access any admin API endpoint, THE Quiz_Management_API SHALL return a 401 Unauthorized response with an error message indicating authentication is required
4. WHEN an Admin_User is authenticated, THE Quiz_Management_API SHALL grant access to all admin API endpoints and return the requested resource or confirmation
5. WHEN an Admin_User logs in successfully, THE login response SHALL include the `is_admin` field set to true so the frontend can determine admin access

### Requirement 2: Admin Page Navigation

**User Story:** As an admin user, I want to navigate to the admin page from the main application, so that I can manage quizzes without needing a separate URL.

#### Acceptance Criteria

1. WHILE an Admin_User is logged in, THE Admin_Page SHALL display a navigation link on the status screen that is visible without scrolling
2. IF a non-admin user is logged in, THEN THE Admin_Page navigation link SHALL NOT be rendered in the page
3. WHEN the Admin_User clicks the admin navigation link, THE Admin_Page SHALL display the destinations list and management controls within 1 second
4. WHEN the Admin_User clicks the return link on the Admin_Page, THE Admin_Page SHALL navigate the user back to the main quiz status screen
5. IF an unauthenticated user is viewing the page, THEN THE Admin_Page navigation link SHALL NOT be rendered in the page

### Requirement 3: List Destinations

**User Story:** As an admin user, I want to see all existing destinations in a list, so that I can review and manage the current quiz content.

#### Acceptance Criteria

1. WHEN the Admin_User accesses the Admin_Page, THE Admin_Page SHALL display a list of all destinations showing each destination's ID and name, ordered by ID ascending
2. WHEN the Admin_User accesses the Admin_Page, THE Admin_Page SHALL display the total count of destinations
3. IF no destinations exist in the database, THEN THE Admin_Page SHALL display a message indicating the quiz database is empty instead of the destinations list
4. IF the Admin_Page fails to retrieve the destinations from the Quiz_Management_API, THEN THE Admin_Page SHALL display an error message indicating that destinations could not be loaded

### Requirement 4: Add New Destination

**User Story:** As an admin user, I want to add new destinations to the database, so that I can expand the quiz content for players.

#### Acceptance Criteria

1. WHEN the Admin_User submits a valid Destination_Form, THE Quiz_Management_API SHALL create a new destination in the database and return the created destination's ID
2. THE Destination_Form SHALL require a name (1 to 128 characters, not blank or whitespace-only), exactly five hints (1 to 256 characters each, not blank or whitespace-only), at least two and at most ten image URLs, and at least one and at most 20 correct answers (each 1 to 128 characters)
3. IF any required field is missing, blank, or exceeds its length limit, THEN THE Quiz_Management_API SHALL return a 400 Bad Request response with an error message indicating which field failed validation and why
4. WHEN a destination is successfully created, THE Admin_Page SHALL display a success confirmation and refresh the destinations list
5. THE Quiz_Management_API SHALL store correct answers as a JSON array of lowercase trimmed strings
6. IF a destination with the same name already exists in the database, THEN THE Quiz_Management_API SHALL return a 409 Conflict response with an error message indicating the duplicate name

### Requirement 5: Edit Existing Destination

**User Story:** As an admin user, I want to edit existing destinations, so that I can fix errors or update quiz content.

#### Acceptance Criteria

1. WHEN the Admin_User selects a destination to edit, THE Admin_Page SHALL populate the Destination_Form with the existing destination data including name, all five hints, image URLs, and correct answers
2. WHEN the Admin_User submits a valid edited Destination_Form, THE Quiz_Management_API SHALL replace all fields of the destination in the database with the submitted values
3. IF the specified destination ID does not exist, THEN THE Quiz_Management_API SHALL return a 404 Not Found response
4. IF any required field is missing or exceeds its length limit (name max 128 characters, each hint max 256 characters) in the edit request, THEN THE Quiz_Management_API SHALL return a 400 Bad Request response with an error message indicating which field failed validation
5. WHEN a destination is successfully updated, THE Admin_Page SHALL display a success confirmation and refresh the destinations list
6. WHEN the Admin_User submits an edited Destination_Form with correct answers, THE Quiz_Management_API SHALL store the correct answers as a JSON array of lowercase trimmed strings

### Requirement 6: Delete Destination

**User Story:** As an admin user, I want to delete destinations from the database, so that I can remove outdated or incorrect quiz content.

#### Acceptance Criteria

1. WHEN the Admin_User requests deletion of a destination, THE Admin_Page SHALL display a confirmation dialog that identifies the destination by name before proceeding
2. WHEN the Admin_User confirms deletion, THE Quiz_Management_API SHALL delete the destination and all associated quiz results from the database
3. IF the specified destination ID does not exist, THEN THE Quiz_Management_API SHALL return a 404 Not Found response
4. WHEN a destination is successfully deleted, THE Admin_Page SHALL display a success confirmation and refresh the destinations list
5. WHEN the Admin_User cancels the confirmation dialog, THE Admin_Page SHALL close the dialog and leave the destination unchanged
6. IF the Quiz_Management_API fails to delete the destination due to a server error, THEN THE Admin_Page SHALL display an error message indicating the deletion failed and leave the destinations list unchanged

### Requirement 7: CSRF Protection for Admin Operations

**User Story:** As a system owner, I want all admin write operations to be protected against CSRF attacks, so that the quiz content cannot be maliciously modified.

#### Acceptance Criteria

1. WHEN a create, update, or delete request is made without a valid CSRF token, THE Quiz_Management_API SHALL return a 403 Forbidden response
2. THE Admin_Page SHALL include the CSRF token in all create, update, and delete requests via the X-CSRF-Token header

### Requirement 8: Input Validation for Image URLs

**User Story:** As a system owner, I want image URLs to be validated, so that invalid data does not corrupt the quiz display.

#### Acceptance Criteria

1. WHEN an image URL does not start with "http://" or "https://", THE Quiz_Management_API SHALL return a 400 Bad Request response with a descriptive error message identifying the invalid URL
2. THE Quiz_Management_API SHALL accept between 2 and 10 image URLs per destination
3. IF fewer than 2 or more than 10 image URLs are provided, THEN THE Quiz_Management_API SHALL return a 400 Bad Request response with an error message indicating the allowed range
