# Use the Node.js 22.12.1 base image
FROM node:22.12.1

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json into the container
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Build frontend if applicable (optional)
# RUN npm run build

# Expose the application port (Google Cloud Run uses 8080 by default)
EXPOSE 8080

# Set environment variables (override during deployment)
ENV NODE_ENV=production

# Start the application
CMD ["node", "index.js"]
