# Implementation Plan: PostgreSQL Migration

## Overview

Migrate the Travel Quizzer application from SQLite to PostgreSQL running as a container service in the podman-compose stack. The implementation adds a PostgreSQL 16 container, updates the app to use `psycopg2-binary`, adds connection error handling, removes the embedded SQLite database from the container image, and ensures tests continue to use in-memory SQLite.

## Tasks

- [x] 1. Add PostgreSQL dependency and update project configuration
  - [x] 1.1 Add `psycopg2-binary` to project dependencies
    - Add `psycopg2-binary>=2.9.0,<3.0.0` to the `dependencies` list in `pyproject.toml`
    - Run `uv lock` to update the lockfile
    - _Requirements: 2.1_

  - [x] 1.2 Update `.containerignore` to exclude the `database/` directory
    - Add `database/` entry to `.containerignore` so the directory is excluded from the build context
    - _Requirements: 8.1_

  - [x] 1.3 Remove `COPY database/` from `Containerfile`
    - Remove the `COPY database/ ./database/` line from the Containerfile
    - The app will rely on PostgreSQL in container mode and create the directory locally when needed
    - _Requirements: 8.1, 8.2_

- [x] 2. Update application initialization with connection error handling
  - [x] 2.1 Add PostgreSQL connection error handling to `backend/__init__.py`
    - Wrap `db.create_all()` in a try/except catching `sqlalchemy.exc.OperationalError`
    - If connection fails, log an error message and call `sys.exit(1)`
    - Add `connect_timeout=5` to engine options when the URI uses a `postgresql` scheme
    - _Requirements: 2.2, 2.4, 3.5, 4.5_

  - [x] 2.2 Add container-mode detection for missing database directory
    - When neither `QUIZ_DATABASE_URL` nor `DATABASE_URL` is set and the SQLite `database/` directory does not exist, log an error ("no database configured") and exit with non-zero status
    - When running locally (not in container), preserve existing behavior of creating the `database/` directory
    - _Requirements: 8.3, 8.4_

  - [x] 2.3 Write unit tests for database URI resolution and error handling
    - Test the precedence chain: `QUIZ_DATABASE_URL` > `DATABASE_URL` > SQLite default
    - Test that connection failure with PostgreSQL URI causes non-zero exit
    - Test that missing `database/` directory without env vars causes non-zero exit
    - _Requirements: 4.1, 4.2, 4.3, 2.4, 8.3_

- [x] 3. Checkpoint - Verify dependency and app init changes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Configure podman-compose with PostgreSQL service and networking
  - [x] 4.1 Add PostgreSQL service to `podman-compose.yml`
    - Add a `postgres` service using `postgres:16` image
    - Configure `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` environment variables
    - Add a health check using `pg_isready` with interval 10s, timeout 5s, retries 5, start_period 30s
    - Mount a named volume `pgdata` at `/var/lib/postgresql/data`
    - Do NOT publish port 5432 to the host
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.2_

  - [x] 4.2 Add named network and update app service
    - Define a named bridge network (e.g., `travel-quizzer-net`)
    - Attach both the `travel-quizzer` and `postgres` services to this network
    - Add `depends_on` with `condition: service_healthy` on the postgres service to the app service
    - Set `QUIZ_DATABASE_URL` environment variable on the app service pointing to `postgresql+psycopg2://<user>:<pass>@postgres:5432/<dbname>`
    - _Requirements: 1.6, 2.3, 4.4, 6.1, 6.3_

  - [x] 4.3 Define the named volume in the compose file
    - Add a top-level `volumes` section declaring `pgdata`
    - _Requirements: 1.3_

- [x] 5. Update seed script for robust error handling
  - [x] 5.1 Add connection error handling to `scripts/seed_db.py`
    - Wrap the database operations in a try/except for `OperationalError`
    - If the seed script cannot connect or encounters an error, log the failure reason and exit with non-zero status code
    - This prevents the app from starting in an unseeded state
    - _Requirements: 7.4_

  - [x] 5.2 Write unit tests for seed script idempotency
    - Test that running the seed script against a database with existing destinations does not modify data
    - Test that an empty database gets seeded with at least 5 destinations and 1 admin user
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 6. Checkpoint - Verify compose and seed changes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Property-based tests for correctness properties
  - [x] 7.1 Write property test for JSON column round-trip fidelity
    - **Property 1: JSON Column Round-Trip Fidelity**
    - Generate random lists of strings (including unicode, empty strings, special characters) using Hypothesis
    - Write to `destination.images` and `destination.correct_answers` columns, read back, assert equality
    - Use in-memory SQLite for the test (validates the SQLAlchemy layer behavior)
    - **Validates: Requirements 3.2**

  - [x] 7.2 Write property test for database URI resolution precedence
    - **Property 2: Database URI Resolution Precedence**
    - Generate random combinations of env var states (set/non-empty, set/empty, unset) using Hypothesis
    - Verify the correct URI is selected per the precedence chain
    - Extract URI resolution logic into a testable function if needed
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [x] 7.3 Write property test for seed script idempotency
    - **Property 3: Seed Script Idempotency**
    - Generate random pre-existing destination data, run seed logic, verify data unchanged
    - Confirm row count and column values remain identical after repeated seed runs
    - **Validates: Requirements 7.2**

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The seed script and existing SQLAlchemy models require no functional changes — only error handling is added
- Integration testing with a real PostgreSQL container can be done via `podman-compose up` after all tasks are complete

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2", "4.1"] },
    { "id": 2, "tasks": ["2.3", "4.2", "4.3", "5.1"] },
    { "id": 3, "tasks": ["5.2", "7.1", "7.2"] },
    { "id": 4, "tasks": ["7.3"] }
  ]
}
```
