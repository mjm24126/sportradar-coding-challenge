FROM node:14

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install
RUN npm install ts-node

# Bundle app source
COPY . .

EXPOSE 8080

CMD [ "npm", "start" ]