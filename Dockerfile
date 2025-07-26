# Use Node.js 18
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --only=production

# Copy all files
COPY . .

# Expose port
EXPOSE 8080

# Start the server
CMD ["npm", "start"] 