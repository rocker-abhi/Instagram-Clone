# 📸 Instagram Clone — Distributed Microservices Architecture

A production-ready, event-driven Instagram Clone built with a **Distributed Microservices Architecture**. Powered by **FastAPI**, **gRPC**, **Apache Kafka**, **Redis**, **PostgreSQL**, **MinIO S3 Storage**, **Nginx API Gateway**, and **React (Vite + Tailwind CSS)**. Designed for independent container containerization and deployment on **AWS ECS (Elastic Container Service)**.

---

## 🚀 Key Features

- **🛡️ Authentication & Security**: JWT Access/Refresh tokens, bcrypt password hashing, asymmetric RSA key verification, and gRPC authentication hooks.
- **👤 User Management**: User profile customization, bio/avatar uploads to S3, follow/unfollow social graph, and profile search.
- **📷 Posts, Reels & Stories**: Media uploads (photos & HLS video streaming for reels), story creation with expiration, likes, comments, and feed generation.
- **💬 Real-time Messaging**: Full-duplex WebSocket chat service supporting messaging, message editing/deletion, and live unread notification indicators.
- **🔔 Event-driven Notifications**: Kafka-backed asynchronous notification delivery and SMTP email dispatch.
- **🌐 Unified Nginx API Gateway**: Single reverse-proxy entry point for REST endpoints and WebSocket protocol upgrades.

---

## 🏗️ System Architecture & Port Registry

All frontend client requests route through the **Nginx API Gateway** listening on port `8080` (or port `80`).

| Service Name | Protocol / Type | Default Host Port | Description / Responsibilities |
| :--- | :--- | :--- | :--- |
| **Nginx API Gateway** | HTTP / WS | `8080` / `80` | Reverse proxy API gateway routing client traffic |
| **Instaclone Frontend** | HTTP (Web) | `5173` | React + Vite SPA client interface |
| **Authentication Server (REST)** | HTTP (REST) | `5000` | User auth, login, token refresh, and registration |
| **Authentication gRPC** | gRPC | `50050` | Auth verification hooks for internal services |
| **User Service (REST)** | HTTP (REST) | `6001` | User profile management, relationships, and search |
| **User Service (gRPC)** | gRPC | `50051` | Internal gRPC profile verification & sync |
| **Post Service (REST)** | HTTP (REST) | `7001` | Posts, Reels (HLS), Stories, Likes, & Comments |
| **Chat Service (REST/WS)** | HTTP / WS | `8001` | Real-time WebSocket messaging and chat history |
| **Notification Server** | HTTP (REST) | `5001` | Event consumer listening to Kafka message queues |
| **PostgreSQL Database** | PostgreSQL | `5432` | Relational SQL database (`instagram_db`) |
| **Redis Server** | Redis TCP | `6379` | In-memory cache & WebSocket session state |
| **Redis Commander Console** | HTTP (Web) | `8081` | Web UI administration tool for Redis database |
| **Kafka Broker** | SASL / PLAINTEXT | `9092` | Asynchronous message broker & event stream |
| **Kafka UI Console** | HTTP (Web) | `8082` | UI dashboard for managing topics & messages |
| **MinIO Storage Server** | S3 API | `9000` | S3-compatible media object storage backend |
| **MinIO Admin Console** | HTTP (Web) | `9001` | S3 bucket management dashboard |

---

## 🛠️ Step-by-Step Setup Guide

### 1. Prerequisites
Ensure you have the following installed on your host machine:
- **Python 3.11+**
- **Node.js 18+ & npm**
- **Docker** (For independent container builds & testing)
- **PostgreSQL 16+** (Running locally on port `5432` or AWS RDS)

---

### 2. Startup Infrastructure Stack First

Before launching any microservice, verify that your core infrastructure services (**PostgreSQL**, **Kafka**, **Redis**, and **MinIO**) are running and accessible:

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Kafka: `localhost:9092`
- MinIO: `http://localhost:9000` (Console: `http://localhost:9001`)

---

## ⚙️ Environment Variables Reference (`.env`)

Below is the dictionary of environment variables used across the system, followed by the exact `.env` configuration files for each microservice.

### 📚 Environment Variable Explanations

| Variable Name | Description & Purpose |
| :--- | :--- |
| **`APP_NAME`** | Display name of the microservice application. |
| **`DEBUG`** | Set to `True` for development debugging logs and error tracebacks. |
| **`HOST`** | Host interface IP address the server binds to (`127.0.0.1` for local, `0.0.0.0` for containers). |
| **`PORT`** | HTTP TCP port number for the microservice. |
| **`SERVICE_NAME`** | Unique microservice identifier passed in response headers (`X-Service-Name`). |
| **`DATABASE_URL`** | Async SQLAlchemy PostgreSQL connection string (`postgresql+asyncpg://<user>:<password>@<host>:<port>/<dbname>`). |
| **`JWT_SECRET_KEY`** | Secret key used for cryptographic signing and validation of JWT authentication tokens. |
| **`ACCESS_TOKEN_EXPIRE_MINUTES`** | Expiration period for short-lived JWT access tokens (in minutes). |
| **`REFRESH_TOKEN_TTL`** | Lifetime for long-lived JWT refresh tokens (in seconds). |
| **`EMAIL_VERIFICATION_TTL`** | Validity window for email verification tokens (in seconds). |
| **`REDIS_HOST` / `REDIS_PORT`** | Host and port for Redis cache and WebSocket pub/sub messaging. |
| **`REDIS_PASSWORD` / `REDIS_DB`** | Authentication password and database index for Redis connection. |
| **`REDIS_URL`** | Redis connection URI string (`redis://:<password>@<host>:<port>`). |
| **`MINIO_ENDPOINT`** | Address of the S3-compatible MinIO object storage server (`localhost:9000`). |
| **`MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`** | Access credentials for MinIO storage bucket operations. |
| **`MINIO_SECURE`** | Set to `True` for HTTPS connection to MinIO, `False` for HTTP. |
| **`MINIO_PUBLIC_URL`** | Base URL for accessing media files and generating presigned URLs (`http://localhost:9000`). |
| **`KAFKA_BOOTSTRAP_SERVERS`** | Connection string for Kafka brokers (`localhost:9092`). |
| **`KAFKA_BATCH_SIZE` / `KAFKA_LINGER_MS`** | Kafka producer performance tuning for event batching. |
| **`KAFKA_ACKS` / `KAFKA_RETRIES`** | Message acknowledgment setting (`all`) and delivery retry attempts. |
| **`KAFKA_SECURITY_PROTOCOL`** | Security protocol used to connect to Kafka (`PLAINTEXT` or `SASL_PLAINTEXT`). |
| **`KAFKA_SASL_MECHANISM`** | SASL authentication mechanism (`PLAIN`). |
| **`KAFKA_SASL_PLAIN_USERNAME` / `KAFKA_SASL_PLAIN_PASSWORD`** | SASL authentication credentials for Kafka brokers. |
| **`USER_SERVICE_HOST_GRPC` / `USER_SERVICE_PORT_GRPC`** | Internal gRPC host and port for User Service RPC methods. |
| **`AUTH_SERVICE_HOST_GRPC` / `AUTH_SERVICE_PORT_GRPC`** | Internal gRPC host and port for Authentication Service RPC methods. |
| **`GATEWAY_URL`** | Base URL of the Nginx API Gateway (`http://localhost:8080`). |
| **`USER_SERVICE_GATEWAY_URL`** | Gateway route URL for fetching user profiles from Post Service (`http://localhost:8080/user-profile`). |
| **`SMTP_HOST` / `SMTP_PORT`** | SMTP email server hostname and port (e.g. `smtp.gmail.com:587`). |
| **`SMTP_EMAIL` / `SMTP_PASSWORD`** | Sender email address and app-specific password for email dispatch. |
| **`SMTP_TLS`** | Set to `True` to enable TLS encryption for email delivery. |

---

### 📝 Microservice `.env` Templates

Copy and configure the templates below for each microservice:

#### 🔐 `Authentication-Server/.env`
```ini
APP_NAME=Instagram Auth Service
DEBUG=True
HOST=127.0.0.1
PORT=5000
DATABASE_URL=postgresql+asyncpg://your_db_user:your_db_password@localhost:5432/instagram_db
SERVICE_NAME=authentication-service

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=your_redis_password
REDIS_URL=redis://localhost:6379

REFRESH_TOKEN_TTL=604800
EMAIL_VERIFICATION_TTL=900
JWT_SECRET_KEY=your_jwt_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES=15

KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_BATCH_SIZE=32768
KAFKA_LINGER_MS=10
KAFKA_ACKS=all
KAFKA_RETRIES=5
KAFKA_SECURITY_PROTOCOL=SASL_PLAINTEXT
KAFKA_SASL_MECHANISM=PLAIN
KAFKA_SASL_PLAIN_USERNAME=your_kafka_username
KAFKA_SASL_PLAIN_PASSWORD=your_kafka_password

USER_SERVICE_HOST_GRPC=localhost
USER_SERVICE_PORT_GRPC=50051
AUTH_SERVICE_HOST_GRPC=localhost
AUTH_SERVICE_PORT_GRPC=50050

GATEWAY_URL=http://localhost:8080
```

#### 👤 `User-Service/.env`
```ini
APP_NAME=Instagram User Service
DEBUG=True
HOST=127.0.0.1
PORT=6001
DATABASE_URL=postgresql+asyncpg://your_db_user:your_db_password@localhost:5432/instagram_db
SERVICE_NAME=user-service

JWT_SECRET_KEY=your_jwt_secret_key
USER_SERVICE_HOST_GRPC=localhost
USER_SERVICE_PORT_GRPC=50051
AUTH_SERVICE_HOST_GRPC=localhost
AUTH_SERVICE_PORT_GRPC=50050

MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=your_minio_access_key
MINIO_SECRET_KEY=your_minio_secret_key
MINIO_SECURE=False
MINIO_PUBLIC_URL=http://localhost:9000

KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_BATCH_SIZE=32768
KAFKA_LINGER_MS=10
KAFKA_ACKS=all
KAFKA_RETRIES=5
KAFKA_SECURITY_PROTOCOL=SASL_PLAINTEXT
KAFKA_SASL_MECHANISM=PLAIN
KAFKA_SASL_PLAIN_USERNAME=your_kafka_username
KAFKA_SASL_PLAIN_PASSWORD=your_kafka_password

GATEWAY_URL=http://localhost:8080
```

#### 🖼️ `Post-Server/.env`
```ini
APP_NAME=Instagram Post Service
DEBUG=True
HOST=127.0.0.1
PORT=7001
DATABASE_URL=postgresql+asyncpg://your_db_user:your_db_password@localhost:5432/instagram_db
SERVICE_NAME=post-service

JWT_SECRET_KEY=your_jwt_secret_key
USER_SERVICE_HOST_GRPC=localhost
USER_SERVICE_PORT_GRPC=50051
AUTH_SERVICE_HOST_GRPC=localhost
AUTH_SERVICE_PORT_GRPC=50050

MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=your_minio_access_key
MINIO_SECRET_KEY=your_minio_secret_key
MINIO_SECURE=False
MINIO_PUBLIC_URL=http://localhost:9000

KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_BATCH_SIZE=32768
KAFKA_LINGER_MS=10
KAFKA_ACKS=all
KAFKA_RETRIES=5
KAFKA_SECURITY_PROTOCOL=SASL_PLAINTEXT
KAFKA_SASL_MECHANISM=PLAIN
KAFKA_SASL_PLAIN_USERNAME=your_kafka_username
KAFKA_SASL_PLAIN_PASSWORD=your_kafka_password

GATEWAY_URL=http://localhost:8080
USER_SERVICE_GATEWAY_URL=http://localhost:8080/user-profile
```

#### 💬 `chat-server/.env`
```ini
APP_NAME=Instagram Chat Service
DEBUG=True
DATABASE_URL=postgresql+asyncpg://your_db_user:your_db_password@localhost:5432/instagram_db
SERVICE_NAME=chat-service
HOST=0.0.0.0
PORT=8001

USER_SERVICE_HOST_GRPC=localhost
USER_SERVICE_PORT_GRPC=50051

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=your_redis_password

GATEWAY_URL=http://localhost:8080
```

#### 🔔 `Notification-Server/.env`
```ini
APP_NAME=Instagram Notification Service
DEBUG=True
HOST=127.0.0.1
PORT=5001
DATABASE_URL=postgresql+asyncpg://your_db_user:your_db_password@localhost:5432/instagram_db
SERVICE_NAME=notification-service

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=your_redis_password
REDIS_URL=redis://localhost:6379
REFRESH_TOKEN_TTL=300
EMAIL_VERIFICATION_TTL=900

JWT_SECRET_KEY=your_jwt_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES=15

KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_BATCH_SIZE=32768
KAFKA_LINGER_MS=10
KAFKA_ACKS=all
KAFKA_RETRIES=5
KAFKA_SECURITY_PROTOCOL=SASL_PLAINTEXT
KAFKA_SASL_MECHANISM=PLAIN
KAFKA_SASL_PLAIN_USERNAME=your_kafka_username
KAFKA_SASL_PLAIN_PASSWORD=your_kafka_password

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_TLS=True

GATEWAY_URL=http://localhost:8080
```

---

### 4. Database Migrations (Alembic)

Run database migrations to initialize tables inside PostgreSQL (`instagram_db`):

```bash
# 1. Authentication Server Migrations
cd Authentication-Server
alembic upgrade head
cd ..

# 2. User Service Migrations
cd User-Service
alembic upgrade head
cd ..

# 3. Post Server Migrations
cd Post-Server
alembic upgrade head
cd ..

# 4. Chat Server Migrations
cd chat-server
alembic upgrade head
cd ..

# 5. Notification Server Migrations
cd Notification-Server
alembic upgrade head
cd ..
```

---

### 5. Running Microservices Individually (Local Host)

After starting infrastructure (Kafka, Redis, MinIO) and running Alembic migrations, launch each service in separate terminal windows:

#### Terminal 1: Authentication Server
```bash
cd Authentication-Server
python main.py
```

#### Terminal 2: User Service
```bash
cd User-Service
python main.py
```

#### Terminal 3: Post Server
```bash
cd Post-Server
python main.py
```

#### Terminal 4: Chat Server
```bash
cd chat-server
python main.py
```

#### Terminal 5: Notification Server
```bash
cd Notification-Server
python main.py
```

#### Terminal 6: React Frontend (Vite)
```bash
cd insta-frontend
npm install
npm run dev
```

---

## 📦 Independent Container Deployment (AWS ECS / Standalone Docker)

Each microservice is containerized with its own dedicated `Dockerfile` and can be built and deployed independently to **AWS ECS Task Definitions** or AWS ECR.

### 1. Build Container Images

```bash
# 1. Authentication Server Image
docker build -t auth-service ./Authentication-Server

# 2. User Service Image
docker build -t user-service ./User-Service

# 3. Post Service Image
docker build -t post-service ./Post-Server

# 4. Chat Service Image
docker build -t chat-service ./chat-server

# 5. Notification Service Image
docker build -t notification-service ./Notification-Server

# 6. React Frontend Image
docker build -t insta-frontend ./insta-frontend

# 7. Nginx Gateway Image
docker build -t nginx-gateway ./nginx
```

---

### 2. Run Container Images Independently

```bash
# 1. Authentication Server Container
docker run -d --name auth_service -p 5000:5000 -p 50050:50050 --env-file ./Authentication-Server/.env auth-service

# 2. User Service Container
docker run -d --name user_service -p 6001:6001 -p 50051:50051 --env-file ./User-Service/.env user-service

# 3. Post Service Container
docker run -d --name post_service -p 7001:7001 --env-file ./Post-Server/.env post-service

# 4. Chat Service Container
docker run -d --name chat_service -p 8001:8001 --env-file ./chat-server/.env chat-service

# 5. Notification Service Container
docker run -d --name notification_service -p 5001:5001 --env-file ./Notification-Server/.env notification-service

# 6. React Frontend Container
docker run -d --name insta_frontend -p 5173:5173 insta-frontend

# 7. Nginx API Gateway Container
docker run -d --name nginx_gateway -p 8080:80 nginx-gateway
```

---

## 📄 Interactive API Documentation

Each FastAPI microservice provides interactive Swagger / OpenAPI documentation:

- **Auth Service Docs**: `http://localhost:8080/auth/docs` (or `http://localhost:5000/docs`)
- **User Service Docs**: `http://localhost:8080/user-profile/docs` (or `http://localhost:6001/docs`)
- **Post Service Docs**: `http://localhost:8080/posts/docs` (or `http://localhost:7001/docs`)
- **Chat Service Docs**: `http://localhost:8080/chat/docs` (or `http://localhost:8001/docs`)
- **Notification Service Docs**: `http://localhost:8080/notifications/docs` (or `http://localhost:5001/docs`)
