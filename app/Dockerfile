FROM node:18-slim
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "main.js"]