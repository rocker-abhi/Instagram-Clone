FROM redis:7-alpine

# Expose default redis port
EXPOSE 6379

# Run redis-server with dynamic port and password configuration
CMD ["sh", "-c", "redis-server --port ${REDIS_PORT:-6379} --requirepass ${REDIS_PASSWORD:-admin-password}"]
