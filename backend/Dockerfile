# Use Node.js 18 image - compatible with dependency requirements
FROM node:18-slim

# Install build dependencies for bcrypt
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files 
COPY package*.json ./

# Install dependencies with --force to bypass compatibility warnings
RUN npm install --force

# Copy application code
COPY . .

# Create uploads directory with proper permissions
RUN mkdir -p uploads && chmod 777 uploads

# Create logs directory
RUN mkdir -p logs && chmod 777 logs

# Expose the port the app runs on
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production \
    PORT=8080

# Run the application
CMD ["node", "index.js"]
