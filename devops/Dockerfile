FROM node:14-slim

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer
# installs, work.
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y bzip2 google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 build-essential chrpath libssl-dev libxft-dev\
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get install libfreetype6 libfreetype6-dev
RUN apt-get install libfontconfig1 libfontconfig1-dev

# If running Docker >= 1.13.0 use docker run's --init arg to reap zombie processes, otherwise
# uncomment the following lines to have `dumb-init` as PID 1
# ADD https://github.com/Yelp/dumb-init/releases/download/v1.2.0/dumb-init_1.2.0_amd64 /usr/local/bin/dumb-init
# RUN chmod +x /usr/local/bin/dumb-init
# ENTRYPOINT ["dumb-init", "--"]

# Uncomment to skip the chromium download when installing puppeteer. If you do,
# you'll need to launch puppeteer with:
#     browser.launch({executablePath: 'google-chrome-stable'})
# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Install puppeteer so it's available in the container.
# RUN npm i puppeteer \
#     # Add user so we don't need --no-sandbox.
#     # same layer as npm install to keep re-chowned files from using up several hundred MBs more space
#     && groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
#     && mkdir -p /home/pptruser/Downloads \
#     && chown -R pptruser:pptruser /home/pptruser \
#     && chown -R pptruser:pptruser /node_modules

# # Run everything after as non-privileged user.
# USER pptruser

RUN npm install -g pnpm
#RUN apk update && apk add curl

# RUN curl -sL https://unpkg.com/@pnpm/self-installer | node

# install node-prune (https://github.com/tj/node-prune)
# RUN curl -sfL https://install.goreleaser.com/github.com/tj/node-prune.sh | sh -s -- -b /usr/local/bin

EXPOSE 80
# Install dependencies
WORKDIR /usr/portal
COPY ./zdn-web/package.json /usr/portal/web/
COPY ./zdn-app/package.json /usr/portal/app/

WORKDIR /usr/portal/web
RUN pnpm install

WORKDIR /usr/portal/app
RUN pnpm install
RUN npm install phantomjs-prebuilt@2.1.16 --update-binary
RUN npm link phantomjs-prebuilt

# Env vars in build time
ARG NODE_ENV
ARG REACT_APP_GIT_HASH
ENV TZ=utc
ENV GIT_HASH=$REACT_APP_GIT_HASH
ENV GENERATE_SOURCEMAP=false
ENV NODE_OPTIONS=--max_old_space_size=4096
ENV REACT_APP_ZDN_API_ENDPOINT=/api/v1
ENV REACT_APP_ZDN_GOOGLE_SSO_CLIENT_ID=561759632332-dqs7s6u1dqma6kqh32paq192d7qocg9k.apps.googleusercontent.com
ENV REACT_APP_ZDN_STRIPE_PUBLISHABLE_KEY=pk_test_51Hp56jEBt7ChgqJqBRoTJ8V2IPcwYDAMdJhp9XbNTPDHoyOhpOt3HBPIv8iV39mHoUMUQ9NN7gKxZIVDVzJhGWWx00MK1EEkKD

# Build app
COPY ./zdn-app /usr/portal/app
RUN pnpm run build:prod
RUN pnpm prune --production
# RUN /usr/local/bin/node-prune

# Build web
WORKDIR /usr/portal/web
COPY ./zdn-web /usr/portal/web
RUN pnpm run compile:prod

# Copy web to app/www
RUN cp -rf /usr/portal/web/build /usr/portal/app/www
RUN rm -rf /usr/portal/web

# RUN npm uninstall -g pnpm

# Start the portal website
WORKDIR /usr/portal/app
# CMD node index.js
CMD node index.js

