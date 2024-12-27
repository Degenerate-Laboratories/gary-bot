#FROM --platform=linux/amd64 node:18.2.0
FROM node:18.2.0

# Install required system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    libudev-dev \
    libusb-1.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json for dependency installation
COPY package*.json ./

# Copy the rest of the application code
COPY . .

# Install dependencies
RUN npm install

# Build the application
RUN npm run build

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
