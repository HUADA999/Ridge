import multiprocessing

# Network interface and port for Ridge's API gateway
bind = "0.0.0.0:42110"

# Worker configuration: moderate scaling for recursive agents
workers = multiprocessing.cpu_count() * 2
worker_class = "uvicorn.workers.UvicornWorker"

# Connection handling
timeout = 120
keepalive = 60

# Logging (stdout/stderr for container environments)
accesslog = "-"
errorlog = "-"
loglevel = "debug"
