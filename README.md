<p align="center">
  <img src="frontend/src/assets/logo.png" alt="Minecraft Stats Logo" width="200" />
</p>

<h1 align="center">Minecraft Stats</h1>

🌍 **Live website: [mc-stats.fr](https://mc-stats.fr)**

Minecraft Stats is a full-stack application designed to monitor, collect, and visualize Minecraft server statistics in real time. This repository is a monorepo containing both the web client (frontend) and the server services (backend).

> 💡 **Inspiration:** This project was inspired by the original concept from [Sportek/minecraft-stats](https://github.com/Sportek/minecraft-stats).

## 🚀 Tech Stack

**Frontend:**
*   [React 19](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
*   [Vite](https://vitejs.dev/) - Blazing fast build tool
*   [Tailwind CSS](https://tailwindcss.com/) & [Shadcn/ui](https://ui.shadcn.com/) - For styling and UI components
*   [uPlot](https://github.com/leeoniya/uPlot) - For high-performance rendering of statistics charts
*   [Clerk](https://clerk.com/) - For user authentication

**Backend:**
*   [Rust](https://www.rust-lang.org/) - Main language used for its performance and memory safety
*   [Axum](https://github.com/tokio-rs/axum) - Web framework for the REST API
*   [SQLx](https://github.com/launchbadge/sqlx) - Async SQL toolkit for PostgreSQL interaction
*   [Tokio](https://tokio.rs/) - Asynchronous runtime for Rust

**Deployment:**
*   Docker & Docker Compose

## 📁 Project Structure

The monorepo is divided into three main sections:

*   **`/frontend/`**: The user web application built with React/Vite.
*   **`/backend/`**: The Rust workspace containing:
    *   `rest-api/`: The main API interacting with the frontend (Axum).
    *   `worker/`: The background service responsible for pinging Minecraft servers and recording their status.
    *   `repository/`: The shared data access layer (SQLx / PostgreSQL).
*   **`/deploy/`**: Configuration files for deployment (`.env` files, `docker-compose.yml`, and Docker contexts for each service).

## 🛠️ Prerequisites

To run this project locally, you will need:

*   [Node.js](https://nodejs.org/) (and [pnpm](https://pnpm.io/) is recommended)
*   [Rust & Cargo](https://rustup.rs/) (version 2024 or higher)
*   [Docker](https://www.docker.com/) and Docker Compose (for the database and full stack environment)
*   A PostgreSQL database

## ⚙️ Installation & Setup

### Running with Docker (Recommended)

The easiest way to boot up the entire stack is to use Docker Compose located in the `deploy` folder.

```bash
cd deploy
# Copy the example file and configure your environment variables
cp .env.local .env
# Start the services
docker-compose up -d --build
