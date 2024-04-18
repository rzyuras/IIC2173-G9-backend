FROM node:18-slim
WORKDIR /app
COPY . .

# Install dependencies
RUN npm install

# Expose the port the app runs on
EXPOSE 3000

# Set the environment to production
ENV NODE_ENV=production

# Add wait-for-it
ADD https://github.com/vishnubob/wait-for-it/raw/master/wait-for-it.sh /usr/wait-for-it.sh
RUN chmod +x /usr/wait-for-it.sh

# Start command
CMD ["/usr/wait-for-it.sh", "db:5432", "--strict", "--timeout=30", "--", "node", "main.js"]
