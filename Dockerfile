FROM node:20-alpine

WORKDIR /client

COPY ./client.ts /client
COPY ./package.json /client
COPY ./package-lock.json /client

RUN npm ci

ARG TENANT_ID
ARG NODE_NO_WARNINGS=1
ARG CA_CERT
ARG CLIENT_CERT
ARG PRIVATE_KEY
ARG ENDPOINT

ENTRYPOINT [ "node", "client.js" ]