FROM node:carbon
VOLUME /opt/config /opt/certs /etc/letsencrypt /var/lib/letsencrypt
WORKDIR /opt/WORKDIR

COPY package*.json ./
COPY script.js ./

RUN echo 'deb http://ftp.debian.org/debian jessie-backports main' > /etc/apt/sources.list.d/back.list && \
    apt-get update && \
    apt-get install python python-dev wget build-essential -y && \
    wget https://bootstrap.pypa.io/get-pip.py && \
    python get-pip.py && \
    apt-get install certbot -t jessie-backports -y && \
    pip install certbot-dns-cloudflare && \
    pip install zope.interface -U && \
    pip install certbot -U && \
    certbot plugins && \
    npm install
CMD ["node", "script.js"]