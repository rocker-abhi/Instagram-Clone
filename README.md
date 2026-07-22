# 📸 Instaclone — Distributed Microservices Architecture

A state-of-the-art, event-driven Instagram Clone built using a high-performance **Distributed Microservices Architecture**. Powered by **FastAPI**, **gRPC**, **Apache Kafka**, **Redis**, **PostgreSQL**, **MinIO S3 Storage**, **Nginx API Gateway**, and **React (Vite + HSL CSS)**.

Designed for robust horizontal scaling, independent container builds, and deployment on cloud platforms such as **AWS ECS (Elastic Container Service)**.

---

## 🎨 Architectural Overview

The system operates as an ecosystem of independent microservices communicating via synchronized **gRPC protocols** and asynchronous **Kafka events**:

```mermaid
graph TD
    Client[Browser Client] -->|HTTP / WebSockets| Nginx[Nginx API Gateway: 8080]
    
    Nginx -->|Route: /auth| Auth[Auth Service: 5000]
    Nginx -->|Route: /user-profile| User[User Service: 6001]
    Nginx -->|Route: /posts /stories| Post[Post Service: 7001]
    Nginx -->|Route: /chat| Chat[Chat Service: 8001]
    Nginx -->|Route: /notifications| Notification[Notification Service: 5001]
    
    Auth -.->|gRPC: Verify Auth| User
    Chat -.->|gRPC: Resolve Users| User
    
    Post -->|Kafka Event: post.liked / post.commented| Broker[(Kafka Broker: 9092)]
    User -->|Kafka Event: user.registered| Broker
    
    Broker -->|Subscribe & Pull| Notification
    Notification -->|Email Dispatch| SMTP[SMTP Relay Server]
```

---

## 🏗️ Port Registry & Service Topology

| Service Name | Protocol / API | Default Host Port | Description & Responsibilities |
| :--- | :--- | :--- | :--- |
| **Nginx API Gateway** | HTTP / WebSockets | `8080` (or `80`) | Main reverse proxy entry point for all frontends & APIs |
| **React Frontend Client** | HTTP (Vite) | `5173` | React web application SPA with HSL premium styling |
| **Auth Service** | REST / HTTP | `5000` | Account registration, token refresh, and login actions |
| **Auth gRPC Daemon** | gRPC | `50050` | Handles inter-service authentication hooks |
| **User Profile Service** | REST / HTTP | `6001` | Profile creation, followers graph, onboarding & settings |
| **User Service gRPC Daemon** | gRPC | `50051` | Validates usernames/details for chat and posts |
| **Post Service** | REST / HTTP | `7001` | Story timelines, Reels (HLS streaming), posts, likes & comments |
| **Chat Service** | WebSockets / HTTP | `8001` | Live message dispatch, editing, deletion & chat logs |
| **Notification Service** | REST / HTTP | `5001` | Dispatches app notifications and SMTP verification mails |
| **PostgreSQL Database** | PostgreSQL TCP | `5432` | Storage engine containing schemas for auth, posts & users |
| **Redis Server** | Redis TCP | `6379` | Token blacklisting & real-time WS session manager |
| **Redis Commander** | HTTP (Web) | `8081` | Web GUI interface to manage and inspect Redis keys |
| **Apache Kafka Broker** | SASL / PLAINTEXT | `9092` | Core messaging backbone for distributed events |
| **Kafka UI Dashboard** | HTTP (Web) | `8082` | Web dashboard to monitor topics, consumers, and lags |
| **MinIO Storage Server** | S3 API | `9000` | S3-compatible file storage for images and videos |
| **MinIO Admin Console** | HTTP (Web) | `9001` | S3 bucket management panel |

---

## ⚡ Deployment & Startup Sequence

> [!IMPORTANT]
> To ensure seamless network handshakes and avoid connection timeout crashes on startup, you **must** spin up the services in the following phased order:

```
┌────────────────────────────────┐
│ PHASE 1: Core Infrastructure   │ ──► PostgreSQL, Redis, Kafka, MinIO, Nginx
└────────────────────────────────┘
               │
               ▼
┌────────────────────────────────┐
│ PHASE 2: Database Migrations   │ ──► Alembic (Manual Local or Automatic Docker)
└────────────────────────────────┘
               │
               ▼
┌────────────────────────────────┐
│ PHASE 3: Backend Services      │ ──► Auth, User, Post, Chat, Notification
└────────────────────────────────┘
               │
               ▼
┌────────────────────────────────┐
│ PHASE 4: Frontend Client       │ ──► React + Vite SPA
└────────────────────────────────┘
```

---

## ⚙️ Phase 1: Core Infrastructure Setup

Before running the application, launch the database, caching, messaging, and storage components.

### Option A: Running via Docker (Recommended)
From the repository root, start the pre-containerized infrastructure stack:
```bash
# Start MinIO S3, Redis, PostgreSQL, and Kafka UI
docker compose -f Mini-o/docker-compose.yml up -d
docker compose -f Redis-Server/docker-compose.yml up -d
docker compose -f Kafka-Server/docker-compose.yml up -d
docker compose -f nginx/docker-compose.yml up -d
```

### Option B: Running Locally (Native Host)
Ensure the following services are active on your local loopback interface:
* **PostgreSQL** active on `localhost:5432` with a database named `instagram_db`.
* **Redis** active on `localhost:6379` with password authentication configured.
* **Kafka** active on `localhost:9092` with SASL plain authentication.

---

## 🛠️ Phase 2: Database Migrations (Alembic)

The application utilizes **Alembic** to control schemas and tables across PostgreSQL.

> [!TIP]
> **Automatic Migrations (Docker):** If you run the microservices via their `docker-compose.yml` configurations, they will automatically run connection checks and execute pending migrations on container start.

To execute the database schema migrations manually on your host machine:

```bash
# 1. Initialize Authentication schemas
cd Authentication-Server
alembic upgrade head
cd ..

# 2. Initialize User Profile schemas
cd User-Service
alembic upgrade head
cd ..

# 3. Initialize Post, Likes, and Stories tables
cd Post-Server
alembic upgrade head
cd ..

# 4. Initialize WebSocket Chat schemas
cd chat-server
alembic upgrade head
cd ..

# 5. Initialize Notification schemas
cd Notification-Server
alembic upgrade head
cd ..
```

---

## ⚙️ Environment Variables Reference (`.env`)

Each service contains a `.env` template file. You must fill in your specific credentials (especially database credentials and SMTP application passwords) before starting.

### 📝 Microservice `.env` Config Guide

#### 1. Authentication Server (`Authentication-Server/.env`)
```ini
APP_NAME=Instagram Auth Service
DEBUG=True
HOST=127.0.0.1
PORT=5000
# Update with your postgres username and password
DATABASE_URL=postgresql+asyncpg://your_db_username:your_db_password@localhost:5432/instagram_db
SERVICE_NAME=authentication-service

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=admin-password
REDIS_URL=redis://:admin-password@localhost:6379/0

REFRESH_TOKEN_TTL=604800
EMAIL_VERIFICATION_TTL=900
JWT_SECRET_KEY=my-super-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=15

KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_SASL_PLAIN_USERNAME=admin
KAFKA_SASL_PLAIN_PASSWORD=admin-password
```

#### 2. User Service (`User-Service/.env`)
```ini
APP_NAME=Instagram User Service
DEBUG=True
HOST=127.0.0.1
PORT=6001
# Update with your postgres username and password
DATABASE_URL=postgresql+asyncpg://your_db_username:your_db_password@localhost:5432/instagram_db
SERVICE_NAME=user-service

MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=password123
MINIO_PUBLIC_URL=http://localhost:9000

KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_SASL_PLAIN_USERNAME=admin
KAFKA_SASL_PLAIN_PASSWORD=admin-password
```

#### 3. Post Service (`Post-Server/.env`)
```ini
APP_NAME=Instagram Post Service
DEBUG=True
HOST=127.0.0.1
PORT=7001
# Update with your postgres username and password
DATABASE_URL=postgresql+asyncpg://your_db_username:your_db_password@localhost:5432/instagram_db
SERVICE_NAME=post-service

MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=password123
MINIO_PUBLIC_URL=http://localhost:9000

KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_SASL_PLAIN_USERNAME=admin
KAFKA_SASL_PLAIN_PASSWORD=admin-password
```

#### 4. Notification Service (`Notification-Server/.env`)
```ini
APP_NAME=Instagram Notification Service
DEBUG=True
HOST=127.0.0.1
PORT=5001
# Update with your postgres username and password
DATABASE_URL=postgresql+asyncpg://your_db_username:your_db_password@localhost:5432/instagram_db
SERVICE_NAME=notification-service

# SMTP credentials for sending verification emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_TLS=True

KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_SASL_PLAIN_USERNAME=admin
KAFKA_SASL_PLAIN_PASSWORD=admin-password
```

#### 5. Chat Service (`chat-server/.env`)
```ini
APP_NAME=Instagram Chat Service
DEBUG=True
HOST=0.0.0.0
PORT=8001
# Update with your postgres username and password
DATABASE_URL=postgresql+asyncpg://your_db_username:your_db_password@localhost:5432/instagram_db
SERVICE_NAME=chat-service

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=admin-password
```

---

## 🏃 Running the Application Services

After the databases are migrated and the environment files are configured, start the services:

### Local Running Mode
Open five separate terminal sessions and execute:
```bash
# Terminal 1: Auth
cd Authentication-Server && python main.py

# Terminal 2: User
cd User-Service && python main.py

# Terminal 3: Post
cd Post-Server && python main.py

# Terminal 4: Chat
cd chat-server && python main.py

# Terminal 5: Notification
cd Notification-Server && python main.py
```

### Docker Container Running Mode
If you prefer running containerized microservices:
```bash
# Build and run the services in their own network context
docker compose -f Authentication-Server/docker-compose.yml up --build -d
docker compose -f User-Service/docker-compose.yml up --build -d
docker compose -f Post-Server/docker-compose.yml up --build -d
docker compose -f chat-server/docker-compose.yml up --build -d
docker compose -f Notification-Server/docker-compose.yml up --build -d
```

### 💻 Running the Frontend SPA
In a separate terminal:
```bash
cd insta-frontend
npm install
npm run dev
```
Open `http://localhost:5173` to access the full application.

---

### Infrastructure Admin Interfaces
* **MinIO Object Console**: `http://localhost:9001` (Credentials: `admin`/`password123`)
* **Kafka UI Dashboard**: `http://localhost:8082` (Broker Monitoring, Topics Registry)
* **Redis Commander**: `http://localhost:8081` (Inspect Session cache & sockets)
* **Swagger OpenAPI Docs**:
  * Auth Service: `http://localhost:8080/auth/docs`
  * Chat Service: `http://localhost:8080/chat/docs`
  * Post Service: `http://localhost:8080/posts/docs`
  * User Service: `http://localhost:8080/user-profile/docs`

---

## 📄 Interactive API documentation
Each FastAPI microservice provides interactive Swagger / OpenAPI documentation:

- **Auth Service Docs**: `http://localhost:8080/auth/docs` (or `http://localhost:5000/docs`)
- **User Service Docs**: `http://localhost:8080/user-profile/docs` (or `http://localhost:6001/docs`)
- **Post Service Docs**: `http://localhost:8080/posts/docs` (or `http://localhost:7001/docs`)
- **Chat Service Docs**: `http://localhost:8080/chat/docs` (or `http://localhost:8001/docs`)
- **Notification Service Docs**: `http://localhost:8080/notifications/docs` (or `http://localhost:5001/docs`)

---

## ✨ Core Application Features

The system encompasses a comprehensive feature-set designed to mirror a production social platform:

### 🔑 Authentication & Security
* **Session Lifecycle:** JWT Access/Refresh tokens with expiration boundaries.
* **Token Handshake Interceptor:** Frontend Axios/Fetch interceptor automatically requests a new Access Token in the background using the Refresh Token when `401 Unauthorized` responses occur.
* **Cryptography:** RSA asymmetric key pairs securely sign and verify incoming request payloads in less than 1ms.

### 👤 Profile Graph & Onboarding
* **Onboarding Wizard:** Profile initialization screen requiring avatar upload, display name, and bio before entry.
* **Social Graph:** Full follow/unfollow capability supporting both **Public** and **Private** accounts.
* **Relationship Management:** Request queues allowing users to accept or decline pending follow requests.
* **Profile Search:** Live matching query system searching users by username or full name.

### 🖼️ Content Delivery (Posts, Reels & Stories)
* **Reels & Video Streaming:** Integrated `ffmpeg` segmentation providing HLS (HTTP Live Streaming) adaptive bitrate playback.
* **Dynamic Feed:** Combined query compiling posts and stories from followed accounts, sorted chronologically.
* **Timelines & Expirations:** Stories database tracks and filters content based on a strict 24-hour expiration window.
* **Interactivity:** Nested post likes and comment registry with live counter updates.

### 💬 WebSocket Direct Messaging
* **Full-Duplex Communication:** Instant, real-time message delivery over WebSockets.
* **Message Lifecycle:** Edit and delete messages instantly with options for "Delete for Everyone".
* **Presence Indicators:** Live online and offline status synchronizers.
* **Unread Indicators:** Badge counts incrementing in real-time when new messages arrive.

### ✉️ Event-Driven Processing & SMTP
* **Kafka Event Pipes:** Asynchronous dispatch pipelines listening to events like `post.liked`, `post.commented`, and `user.registered`.
* **SMTP Mail Engine:** Relays welcome messages and verification codes via Gmail SMTP server using secure TLS.

---

## 📸 Application Screenshot Gallery

To keep the documentation clean and scannable, the screenshots of the active running system are organized below by category:

<details>
  <summary>🔒 Click to view Authentication & Onboarding Screenshots</summary>

  #### Profile Setup Onboarding
  ![Profile Setup](./screenshots/Screenshot%20From%202026-07-22%2023-16-00.png)

  #### Initial Verification Page
  ![Verify Email](./screenshots/Screenshot%20From%202026-07-22%2023-33-31.png)

  #### Password Reset Flow
  ![Reset Password](./screenshots/Screenshot%20From%202026-07-22%2023-33-36.png)

  #### Sign In Screen
  ![Login Screen](./screenshots/Screenshot%20From%202026-07-22%2023-33-39.png)

  #### Account Registration
  ![Register Screen](./screenshots/Screenshot%20From%202026-07-22%2023-33-50.png)

  #### Onboarding Setup Completed
  ![Onboarding Complete](./screenshots/Screenshot%20From%202026-07-22%2023-33-57.png)
</details>

<details>
  <summary>👥 Click to view User Profiles & Social Graph Screenshots</summary>

  #### User Timeline Profile Page
  ![Profile Timeline](./screenshots/Screenshot%20From%202026-07-22%2023-35-44.png)

  #### User Settings & Privacy Controls
  ![Privacy Settings](./screenshots/Screenshot%20From%202026-07-22%2023-35-55.png)

  #### Public Profile Preview
  ![Public Profile](./screenshots/Screenshot%20From%202026-07-22%2023-43-27.png)

  #### Search Directory Results
  ![Search Profiles](./screenshots/Screenshot%20From%202026-07-22%2023-56-35.png)

  #### Follow Requests Dashboard
  ![Follow Requests](./screenshots/Screenshot%20From%202026-07-22%2023-56-53.png)

  #### Follower / Following Lists
  ![Follow Lists](./screenshots/Screenshot%20From%202026-07-22%2023-56-57.png)

  #### User Interaction Notifications List
  ![Notification Feed](./screenshots/Screenshot%20From%202026-07-22%2023-58-18.png)
</details>

<details>
  <summary>💬 Click to view Real-time Direct Messaging (Chat) Screenshots</summary>

  #### Direct Message Chat Interface
  ![Chat Timeline](./screenshots/Screenshot%20From%202026-07-23%2000-03-57.png)

  #### Message Deletion Options
  ![Delete Message Dialog](./screenshots/Screenshot%20From%202026-07-23%2000-05-10.png)

  #### Message Editing Mode
  ![Edit Message](./screenshots/Screenshot%20From%202026-07-23%2000-05-16.png)

  #### Dynamic Status Updates
  ![Online Presence](./screenshots/Screenshot%20From%202026-07-23%2000-05-22.png)

  #### New Chat Participant Selector
  ![Select Friend Dialog](./screenshots/Screenshot%20From%202026-07-23%2000-11-57.png)

  #### Chat Workspace Dashboard
  ![Messaging Workspace](./screenshots/Screenshot%20From%202026-07-23%2000-12-02.png)
</details>

<details>
  <summary>⚙️ Click to view Backend Logs, Databases & Developer Tooling Screenshots</summary>

  #### Alembic Database Migrations Output
  ![Migrations Log](./screenshots/Screenshot%20From%202026-07-23%2000-12-38.png)

  #### Docker Compose Multi-Container Startup
  ![Compose Startup Log](./screenshots/Screenshot%20From%202026-07-23%2000-13-16.png)

  #### MinIO Object Browser (Buckets Registry)
  ![MinIO File Console](./screenshots/Screenshot%20From%202026-07-23%2000-17-53.png)

  #### Apache Kafka Topics UI
  ![Kafka Topic Registry](./screenshots/Screenshot%20From%202026-07-23%2000-18-46.png)

  #### Redis Session & Token Store Inspector
  ![Redis Commander GUI](./screenshots/Screenshot%20From%202026-07-23%2000-19-17.png)

  #### Microservices Container Topology Dashboard
  ![Docker Containers Status](./screenshots/Screenshot%20From%202026-07-23%2000-20-14.png)
</details>
 

