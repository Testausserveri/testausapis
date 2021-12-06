FROM node:16-alpine

WORKDIR /usr/src/app

COPY . .
RUN npm install

EXPOSE 25

CMD ["npm", "start"]