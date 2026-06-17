# Requirements Document

## Introduction

This feature enhances the status screen to display cumulative score and additional interesting statistics derived from the `quiz_result` table. The current status screen shows basic counts (quizzes completed, total points, ongoing quizzes). This feature expands it with richer statistics such as average score per quiz, best single-quiz score, accuracy rate, and a streak indicator to give users a more engaging overview of their performance.

## Glossary

- **Status_Screen**: The screen displayed after login that shows user quiz statistics and navigation options
- **Stats_API**: The backend API endpoint that computes and returns statistical data from the quiz_result table
- **Quiz_Result**: A database record representing a user's attempt at a destination quiz, containing hint_difficulty, remaining_guesses, and ongoing status
- **Cumulative_Score**: The sum of points earned across all completed quizzes for a user, where points for a single quiz equal hint_difficulty multiplied by remaining_guesses
- **Average_Score**: The cumulative score divided by the number of completed quizzes
- **Best_Score**: The highest single-quiz score (hint_difficulty multiplied by remaining_guesses) among all completed quizzes for a user
- **Accuracy_Rate**: The percentage of completed quizzes where the user scored at least one point (remaining_guesses greater than zero)
- **Current_Streak**: The count of consecutive most-recent completed quizzes where the user scored at least one point

## Requirements

### Requirement 1: Compute Cumulative Statistics

**User Story:** As a quiz player, I want to see my cumulative score and related statistics on the status screen, so that I can track my overall performance over time.

#### Acceptance Criteria

1. WHEN the Stats_API receives a request from an authenticated user, THE Stats_API SHALL return the Cumulative_Score computed from all completed Quiz_Result records for that user
2. WHEN the Stats_API receives a request from an authenticated user, THE Stats_API SHALL return the total number of completed quizzes for that user
3. WHEN the Stats_API receives a request from an authenticated user, THE Stats_API SHALL return the number of ongoing quizzes for that user
4. WHEN the Stats_API receives a request from an authenticated user, THE Stats_API SHALL return the Average_Score rounded to one decimal place
5. WHEN the Stats_API receives a request from an authenticated user, THE Stats_API SHALL return the Best_Score among all completed Quiz_Result records for that user
6. WHEN the Stats_API receives a request from an authenticated user, THE Stats_API SHALL return the Accuracy_Rate as a percentage rounded to the nearest whole number
7. WHEN the Stats_API receives a request from an authenticated user, THE Stats_API SHALL return the Current_Streak value, where recency is determined by descending destination_id order
8. IF the Stats_API receives a request from an authenticated user who has zero completed Quiz_Result records, THEN THE Stats_API SHALL return 0 for Cumulative_Score, Average_Score, Best_Score, Accuracy_Rate, and Current_Streak
9. IF the Stats_API receives a request from an unauthenticated user, THEN THE Stats_API SHALL reject the request with an error response indicating that authentication is required
10. IF the Stats_API receives a request and the quiz data source is unavailable, THEN THE Stats_API SHALL return an error response indicating a service failure

### Requirement 2: Handle Empty Statistics

**User Story:** As a new user with no quiz history, I want the status screen to display meaningful defaults, so that I am not confused by empty or error states.

#### Acceptance Criteria

1. WHEN an authenticated user has zero completed Quiz_Result records, THE Stats_API SHALL return a Cumulative_Score of zero
2. WHEN an authenticated user has zero completed Quiz_Result records, THE Stats_API SHALL return an Average_Score of zero
3. WHEN an authenticated user has zero completed Quiz_Result records, THE Stats_API SHALL return a Best_Score of zero
4. WHEN an authenticated user has zero completed Quiz_Result records, THE Stats_API SHALL return an Accuracy_Rate of zero
5. WHEN an authenticated user has zero completed Quiz_Result records, THE Stats_API SHALL return a Current_Streak of zero

### Requirement 3: Display Statistics on the Status Screen

**User Story:** As a quiz player, I want to see my statistics presented clearly on the status screen, so that I can quickly understand my performance.

#### Acceptance Criteria

1. WHEN the Status_Screen loads, THE Status_Screen SHALL display the Cumulative_Score as a whole number in a dedicated stat card
2. WHEN the Status_Screen loads, THE Status_Screen SHALL display the number of completed quizzes as a whole number in a dedicated stat card
3. WHEN the Status_Screen loads, THE Status_Screen SHALL display the Average_Score rounded to one decimal place in a dedicated stat card
4. WHEN the Status_Screen loads, THE Status_Screen SHALL display the Best_Score as a whole number in a dedicated stat card
5. WHEN the Status_Screen loads, THE Status_Screen SHALL display the Accuracy_Rate rounded to the nearest whole number followed by a percent symbol in a dedicated stat card
6. WHEN the Status_Screen loads, THE Status_Screen SHALL display the Current_Streak as a whole number in a dedicated stat card
7. WHEN the Status_Screen loads, THE Status_Screen SHALL display the number of ongoing quizzes as a whole number in a dedicated stat card
8. IF the user has zero completed quizzes, THEN THE Status_Screen SHALL display "0" for Cumulative_Score, Average_Score, Best_Score, Accuracy_Rate, and Current_Streak
9. IF the request to retrieve statistics fails, THEN THE Status_Screen SHALL retain the default value of "0" for all stat cards

### Requirement 4: Restrict Statistics Access to Authenticated Users

**User Story:** As a system administrator, I want statistics to only be accessible to authenticated users, so that user data remains private.

#### Acceptance Criteria

1. WHEN an unauthenticated request is made to the Stats_API, THE Stats_API SHALL return HTTP status 401 with a response body containing an error message indicating that authentication is required
2. WHEN an authenticated user requests statistics from the Stats_API, THE Stats_API SHALL return statistics computed exclusively from quiz_result records belonging to the currently authenticated user, identified by their session user ID
3. THE Stats_API SHALL NOT accept any parameter that allows querying statistics for a user other than the currently authenticated user

### Requirement 5: Statistics Accuracy After Quiz Completion

**User Story:** As a quiz player, I want my statistics to reflect my latest quiz results immediately, so that the status screen stays up to date.

#### Acceptance Criteria

1. WHEN a user requests the Status_Screen after completing a quiz, THE Stats_API SHALL return statistics computed from all Quiz_Result records where ongoing is false for that user, including the most recently completed quiz
2. WHILE a Quiz_Result record has ongoing set to true, THE Stats_API SHALL exclude that record from Cumulative_Score, Average_Score, Best_Score, Accuracy_Rate, and Current_Streak calculations
3. THE Stats_API SHALL compute statistics using the following formulas: Cumulative_Score as the sum of (hint_difficulty multiplied by remaining_guesses) for all completed quizzes, Average_Score as Cumulative_Score divided by the number of completed quizzes, Best_Score as the maximum single (hint_difficulty multiplied by remaining_guesses) value among completed quizzes, Accuracy_Rate as the percentage of completed quizzes where remaining_guesses is greater than zero, and Current_Streak as the count of consecutive most-recent completed quizzes where remaining_guesses is greater than zero
4. IF a user has zero completed Quiz_Result records, THEN THE Stats_API SHALL return 0 for Cumulative_Score, Average_Score, Best_Score, Accuracy_Rate, and Current_Streak
