# syntax=docker/dockerfile:1
FROM ubuntu:jammy AS base
LABEL homepage="https://ridge.dev"
LABEL repository="https://github.com/ridge-ai/ridge"
LABEL org.opencontainers.image.source="https://github.com/ridge-ai/ridge"
LABEL org.opencontainers.image.description="Ridge: Autonomous Recursive Agent for System Memory and Decision Routing"

# Install System Dependencies
RUN apt update -y && apt -y install \
    python3-pip \
    libsqlite3-0 \
    ffmpeg \
    libsm6 \
    libxext6 \
    swig \
    curl \
    # Support for llama-cpp-python (minimal libc)
    musl-dev && \
    ln -s /usr/lib/x86_64-linux-musl/libc.so /lib/libc.musl-x86_64.so.1 && \
    # Clean image for fast rebuilds
    apt clean && rm -rf /var/lib/apt/lists/*

# Build Server Dependencies
FROM base AS server-deps
WORKDIR /app
COPY pyproject.toml .
COPY README.md .
ARG VERSION=0.0.0
ENV PIP_EXTRA_INDEX_URL="https://download.pytorch.org/whl/cpu https://abetlen.github.io/llama-cpp-python/whl/cpu"
ENV CUDA_VISIBLE_DEVICES=""

RUN sed -i "s/dynamic = \\[\"version\"\\]/version = \"$VERSION\"/" pyproject.toml && \
    pip install --no-cache-dir -e .[prod]

# Build Web Interface
FROM node:20-alpine AS web-app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/src/interface/web
COPY src/interface/web/package.json src/interface/web/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY src/interface/web/. ./
RUN yarn build

# Final Image: Ridge Runtime Environment
FROM base
ENV PYTHONPATH=/app/src:$PYTHONPATH
WORKDIR /app

COPY --from=server-deps /usr/local/lib/python3.10/dist-packages /usr/local/lib/python3.10/dist-packages
COPY --from=server-deps /usr/local/bin /usr/local/bin
COPY --from=web-app /app/src/interface/web/out ./src/ridge/interface/built
COPY . .

# Collect static web files
RUN cd src && python3 ridge/manage.py collectstatic --noinput

# Expose entry point
ARG PORT
EXPOSE ${PORT}
ENTRYPOINT ["gunicorn", "-c", "gunicorn-config.py", "src.ridge.main:app"]
