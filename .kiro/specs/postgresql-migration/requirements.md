# Requirements Document

## Introduction

Migrate the Travel Quizzer application from SQLite to PostgreSQL as the primary database backend. PostgreSQL will run as a container service alongside the existing application container, managed through the existing podman-compose setup. The application will use the existing SQLAlchemy ORM layer with a PostgreSQL-compatible driver, ensuring all existing schema and queries continue to function correctly.

## Glossary

- **App_Container**: The existing podman container running the Flask application
- **Database_Container**: A new podman container running the PostgreSQL server
- **Compose_Stack**: The podman-compose service definition that orchestrates the App_Container and Database_Container
- **Database_Driver**: The Python library (psycopg2 or equivalent) that enables SQLAlchemy to communicate with PostgreSQL
- **Connection_URL**: The SQLAlchemy-format database URI pointing to the PostgreSQL instance (e.g., `postgresql+psycopg2://user:pass@host:port/dbname`)
- **Health_Check**: A readiness probe that verifies the Database_Container is accepting connections before dependent services start
- **Volume**: A persistent podman volume that stores PostgreSQL data across container restarts
- **Seed_Script**: The existing `scripts/seed_db.py` script that populates the database with initial quiz data

## Requirements

### Requirement 1: PostgreSQL Container Service

**User Story:** As a developer, I want PostgreSQL to run as a container service in the compose stack, so that the database is reproducible and isolated from the host system.

#### Acceptance Criteria

1. THE Compose_Stack SHALL define a Database_Container service using the official PostgreSQL 16 container image
2. THE Database_Container SHALL expose port 5432 to other services within the Compose_Stack network without publishing the port to the host
3. THE Database_Container SHALL store database files in a named persistent Volume so that data survives container restarts and removals
4. THE Database_Container SHALL configure the database name, username, and password via environment variables (POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD)
5. WHEN the Database_Container starts, THE Health_Check SHALL verify PostgreSQL is ready to accept connections using `pg_isready` with an interval of 10 seconds, a timeout of 5 seconds, 5 retries, and a start period of 30 seconds
6. THE App_Container SHALL depend on the Database_Container with a condition of service_healthy so that it waits for the Health_Check to pass before starting

### Requirement 2: Application Database Driver

**User Story:** As a developer, I want the application to include a PostgreSQL-compatible database driver, so that SQLAlchemy can connect to the PostgreSQL instance.

#### Acceptance Criteria

1. THE App_Container SHALL include the `psycopg2-binary` Python package as a project dependency listed in `pyproject.toml`
2. WHEN the `QUIZ_DATABASE_URL` environment variable uses a `postgresql://` or `postgresql+psycopg2://` scheme, THE Database_Driver SHALL establish a TCP connection to the specified PostgreSQL server within 5 seconds
3. THE App_Container SHALL set the `QUIZ_DATABASE_URL` environment variable to a Connection_URL in the format `postgresql+psycopg2://<user>:<password>@<host>:<port>/<dbname>` pointing to the Database_Container
4. IF the Database_Driver fails to establish a connection to the PostgreSQL server within 5 seconds, THEN THE App_Container SHALL exit with a non-zero status code and log an error message indicating the connection failure

### Requirement 3: Schema Compatibility

**User Story:** As a developer, I want the existing SQLAlchemy models to work with PostgreSQL without modification, so that the migration does not break application logic.

#### Acceptance Criteria

1. WHEN the App_Container starts, THE App_Container SHALL create all tables defined in `backend/models.py` (`destination`, `user`, `quiz_result`) in the PostgreSQL database via `db.create_all()`, including the composite primary key on `quiz_result(user_id, destination_id)`, the unique constraint on `user.email`, and the foreign key constraints from `quiz_result` to `user` and `destination`
2. THE Database_Driver SHALL store and retrieve the `destination.images` column (a JSON array of strings) and the `destination.correct_answers` column (a JSON array of lowercase strings) without data loss or type coercion, such that a Python list written to the column is returned as an identical Python list on read
3. THE Database_Driver SHALL support the existing Integer, String, and Boolean column types used across all models without requiring changes to column definitions in `backend/models.py`
4. WHEN the App_Container starts for the first time against a PostgreSQL database containing no rows in the `destination` table, THE Seed_Script SHALL populate the database with the predefined destinations and at least one admin user
5. IF `db.create_all()` fails due to a connection error or authentication failure against PostgreSQL, THEN THE App_Container SHALL terminate with a non-zero exit code within 30 seconds of startup

### Requirement 4: Environment Configuration

**User Story:** As a developer, I want to configure the database connection via environment variables, so that I can switch between local development and containerized PostgreSQL easily.

#### Acceptance Criteria

1. THE App_Container SHALL use the value of the `QUIZ_DATABASE_URL` environment variable as the SQLAlchemy database URI when `QUIZ_DATABASE_URL` is set and non-empty
2. IF `QUIZ_DATABASE_URL` is unset or empty, THEN THE App_Container SHALL use the value of the `DATABASE_URL` environment variable as the SQLAlchemy database URI
3. IF neither `QUIZ_DATABASE_URL` nor `DATABASE_URL` is set or non-empty, THEN THE App_Container SHALL default to the SQLite path `sqlite:///database/quiz_data.db` relative to the project root
4. THE Compose_Stack SHALL pass the PostgreSQL connection URI to the App_Container by setting the `QUIZ_DATABASE_URL` environment variable in the service's environment configuration
5. IF the configured database URI refers to an unreachable database, THEN THE App_Container SHALL fail to start and produce a log message indicating the connection failure

### Requirement 5: Test Database Isolation

**User Story:** As a developer, I want unit tests to continue using an in-memory SQLite database, so that tests remain fast, isolated, and do not require a running PostgreSQL instance.

#### Acceptance Criteria

1. WHILE running unit tests, THE Application SHALL use `sqlite:///:memory:` as the SQLAlchemy database URI so that no file-based or network database connection is attempted
2. THE Application SHALL allow the test suite to override the database URI by setting the `QUIZ_DATABASE_URL` environment variable, without modifying the compose configuration or application source code
3. IF `QUIZ_DATABASE_URL` is set to `sqlite:///:memory:`, THEN THE Application SHALL configure SQLAlchemy to use the in-memory SQLite database for all ORM operations
4. WHILE running unit tests, THE Application SHALL create all database tables in the in-memory database before test execution and drop all tables after each test case completes, so that each test case operates on an isolated empty database

### Requirement 6: Container Networking

**User Story:** As a developer, I want the application container to communicate with the PostgreSQL container over the internal compose network, so that the database is not exposed to the host unnecessarily.

#### Acceptance Criteria

1. WHEN the App_Container attempts a TCP connection to the Database_Container using the compose service name as hostname on port 5432, THE Compose_Stack SHALL resolve the hostname and establish the connection within 5 seconds
2. THE Compose_Stack SHALL NOT include a host port mapping for the Database_Container's port 5432 in the compose file
3. THE Compose_Stack SHALL define a named bridge network and attach both the App_Container and Database_Container to it
4. IF the App_Container attempts to connect to the Database_Container and the Database_Container is not running, THEN THE App_Container SHALL receive a connection-refused error rather than a timeout to a non-existent host

### Requirement 7: Data Seeding on First Run

**User Story:** As a developer, I want the database to be automatically seeded on first launch, so that the quiz is immediately usable after running `podman-compose up`.

#### Acceptance Criteria

1. WHEN the App_Container starts and the `destination` table is empty, THE Seed_Script SHALL insert at least 5 destinations, each with all required fields populated (name, hint1–hint5, images, correct_answers), and at least 1 admin user account
2. WHEN the App_Container starts and the `destination` table already contains one or more rows, THE Seed_Script SHALL skip destination seeding and leave existing data unchanged
3. THE Seed_Script SHALL produce identical seed data (same destinations and fields) regardless of whether the configured database backend is PostgreSQL or SQLite
4. IF the Seed_Script fails to connect to the database or encounters an error during seeding, THEN THE Seed_Script SHALL exit with a non-zero exit code and log an error message indicating the failure reason, preventing the App_Container from starting in an unseeded state

### Requirement 8: Removal of Embedded SQLite Database from Container Image

**User Story:** As a developer, I want the container image to stop bundling the SQLite database file, so that the image remains lean and the database state is fully managed by PostgreSQL.

#### Acceptance Criteria

1. THE Containerfile SHALL NOT contain a COPY instruction for the `database/` directory, and the `.containerignore` file SHALL include an entry that excludes the `database/` directory from the build context
2. IF the `QUIZ_DATABASE_URL` or `DATABASE_URL` environment variable is set to a PostgreSQL connection string, THEN THE App_Container SHALL start successfully and respond to the healthcheck endpoint without a local `database/` directory present in the image
3. IF the App_Container starts without a `QUIZ_DATABASE_URL` or `DATABASE_URL` environment variable set and without a `database/` directory present, THEN THE App_Container SHALL exit with a non-zero status code and log an error message indicating that no database is configured
4. WHEN running the application locally without containers and without a `QUIZ_DATABASE_URL` or `DATABASE_URL` environment variable set, THE application SHALL create the `database/` directory if it does not exist and use the SQLite database file at `database/quiz_data.db`
