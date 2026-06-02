# Use an official Python runtime as a parent image
FROM python:3.13-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Ensure git is accessible by GitPython
ENV GIT_PYTHON_GIT_EXECUTABLE=/usr/bin/git
ENV GIT_PYTHON_REFRESH=quiet

# Copy the requirements file into the container
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Default command (can be overridden by docker-compose)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
