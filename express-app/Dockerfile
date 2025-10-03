FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

EXPOSE 4000

CMD ["npm", "start"]
