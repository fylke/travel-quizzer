# Use official Python runtime as base image
FROM python:3.11-slim

# Set working directory in container
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code and static files
COPY src/ ./src/
COPY data/ ./data/

# Set Python path so the package can be imported from src
ENV PYTHONPATH=/app/src

# Expose port 5000
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/api/quiz').read()" || exit 1

# Run Flask app
CMD ["python", "-m", "main"]
