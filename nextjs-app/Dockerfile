FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Build Next.js application
# RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "dev"]
