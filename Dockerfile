FROM nodesource/vivid:latest

ADD build.sh /tmp/build.sh
RUN DOCKER_BUILD=1 /tmp/build.sh

WORKDIR /app

ADD rootfs/app/package.json /app/package.json
RUN npm install

COPY rootfs /

CMD /bin/boot
