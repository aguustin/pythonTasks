FROM blueriver/nextjs:latest

WORKDIR /dockerfront

COPY package.json /dockerfront

RUN npm i \
    && npm i next \
    && npm i react-dom \
    && npm i axios 

COPY . /dockerfront

EXPOSE 3000

CMD ["npm", "run", "dev"]