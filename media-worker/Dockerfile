FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/audixo-python \
  && /opt/audixo-python/bin/pip install --no-cache-dir --upgrade 'yt-dlp[default]'
ENV PATH="/opt/audixo-python/bin:${PATH}" \
    NODE_ENV=production \
    PORT=8080 \
    AUDIXO_DATA_DIR=/app/data
WORKDIR /app
COPY package.json lib.mjs server.mjs ./
RUN mkdir -p /app/data/private /app/data/jobs && chmod 700 /app/data/private /app/data/jobs
EXPOSE 8080
CMD ["node","server.mjs"]
