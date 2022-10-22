ARG NPM_VERSION="8.19.2"

FROM node:16-alpine AS build_stage

WORKDIR /app

COPY ./package.json /app/
COPY ./package-lock.json /app/
RUN npm i -g npm@${NPM_VERSION}
# INFO: https://docs.npmjs.com/cli/v6/commands/npm-ci
RUN npm ci

COPY ./ /app/
RUN npm run build

FROM node:16-alpine AS final_stage

WORKDIR /app
COPY --from=build_stage /app/package.json /app/
COPY --from=build_stage /app/package-lock.json /app/
COPY --from=build_stage /app/dist/ /app/
RUN npm ci --production

EXPOSE 8000
ENV NODE_ENV="production"
ENV PORT="8000"
USER node

CMD ["node", "index.js"]
