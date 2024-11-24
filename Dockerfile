# syntax=docker/dockerfile:1
FROM ubuntu:jammy AS base
LABEL homepage="https://ridge.dev"
LABEL repository="https://github.com/ridge-ai/ridge"
LABEL org.opencontainers.image.source="https://github.com/ridge-ai/ridge"
LABEL org.opencontainers.image.description="Your second brain, containerized for personal, local deployment."

# Install System Dependencies
RUN apt update -y && apt -y install \
    python3-pip \
    swig \
    curl \
    # Required by RapidOCR
    libgl1 \
    libglx-mesa0 \
    libglib2.0-0 \
    # Required by llama-cpp-python pre-built wheels. See #1628
    musl-dev && \
    ln -s /usr/lib/x86_64-linux-musl/libc.so /lib/libc.musl-x86_64.so.1 && \
    # Clean up
    apt clean && rm -rf /var/lib/apt/lists/*

# Build Server
FROM base AS server-deps
WORKDIR /app
COPY pyproject.toml .
COPY README.md .
ARG VERSION=0.0.0
# use the pre-built llama-cpp-python, torch cpu wheel
ENV PIP_EXTRA_INDEX_URL="https://download.pytorch.org/whl/cpu https://abetlen.github.io/llama-cpp-python/whl/cpu"
# avoid downloading unused cuda specific python packages
ENV CUDA_VISIBLE_DEVICES=""
RUN sed -i "s/dynamic = \\[\"version\"\\]/version = \"$VERSION\"/" pyproject.toml && \
    pip install --no-cache-dir .

# Build Web App
FROM node:20-alpine AS web-app
COPY src/interface/web /app/src/interface/web
WORKDIR /app/src/interface/web
RUN yarn install --frozen-lockfile && \
    yarn build

# Merge the Server and Web App into a Single Image
FROM base
ENV PYTHONPATH=/app/src
WORKDIR /app
COPY --from=server-deps /usr/local/lib/python3.10/dist-packages /usr/local/lib/python3.10/dist-packages
COPY --from=web-app /app/src/interface/web/out ./src/ridge/interface/built
COPY . .
RUN cd src && python3 ridge/manage.py collectstatic --noinput

# Run the Application
# There are more arguments required for the application to run,
# but those should be passed in through the docker-compose.yml file.
ARG PORT
EXPOSE ${PORT}
ENTRYPOINT ["python3", "src/ridge/main.py"]
