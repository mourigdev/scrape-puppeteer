FROM ghcr.io/puppeteer/puppeteer:21.5.2
USER node
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

WORKDIR /home/node

COPY --chown=node:node package*.json ./
RUN npm ci
COPY --chown=node:node . .
CMD [ "node", "app.js" ]
