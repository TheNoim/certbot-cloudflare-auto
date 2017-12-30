FROM node:carbon
VOLUME /opt/config /opt/certs /etc/letsencrypt /var/lib/letsencrypt
WORKDIR /opt/WORKDIR

COPY package*.json ./
COPY script.js ./

RUN echo 'deb http://ftp.debian.org/debian jessie-backports main' > /etc/apt/sources.list.d/back.list
RUN apt-get update
RUN apt-get install python python-dev wget build-essential -y
RUN wget https://bootstrap.pypa.io/get-pip.py
RUN python get-pip.py
RUN apt-get install certbot -t jessie-backports -y
RUN pip install certbot-dns-cloudflare
RUN pip install zope.interface -U
RUN pip install certbot -U
RUN certbot plugins
RUN npm install

CMD ["node", "script.js"]