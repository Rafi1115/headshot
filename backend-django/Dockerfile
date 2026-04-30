FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies for OpenCV, Mediapipe, and DeepFace
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libegl1 \
    libgles2 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
# Doing this before copying source code allows for better Docker layer caching
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn

# Copy backend source code
# Note: we copy the contents of the 'backend' folder directly to /app
COPY backend/ /app/

# Create directories for persistence and set permissions
RUN mkdir -p /root/.deepface/weights /app/media /app/staticfiles && \
    chmod -R 755 /app/media /app/staticfiles

EXPOSE 8005

# Default command (can be overridden in docker-compose)
# Using sh -c to run multiple commands: migrations then gunicorn
CMD ["sh", "-c", "python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:8005"]
