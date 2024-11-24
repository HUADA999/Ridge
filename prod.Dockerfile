# syntax=docker/dockerfile:1
FROM ubuntu:jammy
LABEL homepage="https://ridge.dev"
LABEL repository="https://github.com/ridge-ai/ridge"
LABEL org.opencontainers.image.source="https://github.com/ridge-ai/ridge"
LABEL org.opencontainers.image.description="Your second brain, containerized for multi-user, cloud deployment"

# Install System Dependencies
RUN apt update -y && apt -y install \
    python3-pip \
    libsqlite3-0 \
    ffmpeg \
    libsm6 \
    libxext6 \
    swig \
    curl && \
    # Required by llama-cpp-python pre-built wheels. See #1628
    musl-dev \
    # Required by Next.js Web app
    curl -sL https://deb.nodesource.com/setup_20.x | bash - && \
    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
    apt update -y && apt -y --no-install-recommends install nodejs yarn && \
    apt clean && rm -rf /var/lib/apt/lists/* && \
    # Required by llama-cpp-python pre-built wheels. See #1628
    ln -s /usr/lib/x86_64-linux-musl/libc.so /lib/libc.musl-x86_64.so.1

# Install Application
WORKDIR /app
COPY pyproject.toml .
COPY README.md .
ARG VERSION=0.0.0
ENV PIP_EXTRA_INDEX_URL=https://abetlen.github.io/llama-cpp-python/whl/cpu
RUN sed -i "s/dynamic = \\[\"version\"\\]/version = \"$VERSION\"/" pyproject.toml && \
    pip install --no-cache-dir -e .[prod]

# Copy Source Code
COPY . .

# Set the PYTHONPATH environment variable in order for it to find the Django app.
ENV PYTHONPATH=/app/src:$PYTHONPATH

# Go to the directory src/interface/web and export the built Next.js assets
WORKDIR /app/src/interface/web
RUN bash -c "yarn install --frozen-lockfile && yarn ciexport && yarn cache clean"
WORKDIR /app

# Run the Application
# There are more arguments required for the application to run,
# but these should be passed in through the docker-compose.yml file.
ARG PORT
EXPOSE ${PORT}
ENTRYPOINT ["gunicorn", "-c", "gunicorn-config.py", "src.ridge.main:app"]
