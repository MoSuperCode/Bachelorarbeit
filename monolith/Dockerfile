FROM node:20-alpine

WORKDIR /app

# Abhängigkeiten zuerst kopieren (besseres Layer-Caching)
COPY package*.json ./
RUN npm install --omit=dev

# Quellcode kopieren
COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]
