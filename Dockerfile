FROM ghcr.io/puppeteer/puppeteer:21.5.2

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

RUN mkdir /app && chown node:node /app
WORKDIR /app
USER node
COPY --chown=node:node package.json package-lock.json* ./
RUN npm ci
COPY --chown=node:node . .
EXPOSE 3000
CMD [ "node", "app.js" ]
