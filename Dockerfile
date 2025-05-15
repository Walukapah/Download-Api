FROM node:18-alpine

WORKDIR /app

# canvas dependencies ස්ථාපනය කරන්න
RUN apk add --update --no-cache \
    make \
    g++ \
    jpeg-dev \
    cairo-dev \
    giflib-dev \
    pango-dev

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "bot.js"]
