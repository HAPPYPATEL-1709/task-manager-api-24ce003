# ====================================================================
# Practical 11: Task Manager Backend Dockerfile (Node/Express API)
# Multi-container orchestration ready, exposed on port 5000
# ====================================================================

FROM node:18

# Set working directory inside container
WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# Install application dependencies inside the container
RUN npm install

# Copy application source code
COPY . .

# Expose backend REST API port
EXPOSE 5000

# Start Express server on container launch
CMD ["node", "server.js"]
