FROM node:18-slim
WORKDIR /bull/board
COPY . .
RUN npm install
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "index.js"]