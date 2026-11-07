FROM node:22-bookworm-slim
WORKDIR /opt/warxau-fbs
COPY warxau-fbs/relay.cjs warxau-fbs/page.cjs warxau-fbs/client.js warxau-fbs/bootstrap.cjs ./
RUN node --check relay.cjs && node --check page.cjs && node --check client.js && node --check bootstrap.cjs
ENV NODE_ENV=production
CMD ["node", "/opt/warxau-fbs/bootstrap.cjs"]
