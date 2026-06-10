# Use official Python runtime as base image
FROM python:3.11-slim

# Set working directory in container
WORKDIR /app

# Install Poetry
RUN pip install --no-cache-dir poetry

# Copy dependency files
COPY pyproject.toml poetry.lock ./

# Install production dependencies (no dev deps, no virtualenv inside container)
RUN poetry config virtualenvs.create false && \
    poetry install --only main --no-interaction --no-ansi --no-root

# Copy application code and static files
COPY src/ ./src/
COPY src/static/ ./static/
COPY data/ ./data/

# Set Python path so the package can be imported from src
ENV PYTHONPATH=/app/src

# Expose port 5000
EXPOSE 5000

# Run Flask app
CMD ["python", "-m", "main"]
