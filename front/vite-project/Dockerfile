FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

COPY . .

EXPOSE 5173

CMD ["npx", "vite", "--host", "0.0.0.0"]
