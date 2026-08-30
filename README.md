<p align="center">
  <img src=".github/assets/logo.png" alt="Minecraft Stats Logo" width="200" />
</p>

<h1 align="center">Minecraft Stats</h1>

🌍 **Live website: [mc-stats.fr](https://mc-stats.fr)**

## 📖 The Project & Its Origins

Minecraft Stats is a web platform that allows users to visualize the evolution of connected players on various Minecraft servers over time with high precision. It also offers users the ability to configure custom alerts (e.g., getting notified when a server stops responding or exceeds a certain player threshold).

> 💡 **Inspiration:** This project was inspired by the original concept from minecraft-stats.fr and [Sportek/minecraft-stats](https://github.com/Sportek/minecraft-stats).

> 🎓 **Learning Opportunity:** Being in the process of learning Rust, I decided to develop the entire backend in this language. It was the perfect opportunity to deepen my knowledge through a concrete, high-performance project.

## ✨ Key Features

*   **Precision Tracking:** High-performance, ultra-smooth player count charts using [uPlot](https://github.com/leeoniya/uPlot).
*   **Custom Alerts:** Configure personalized notifications (e.g., when a server goes offline or player counts exceed/drop below a threshold).
*   **Lunar & LabyMod Integration:** Automatically detects and displays **Lunar Client** and **LabyMod** servers, including their custom backgrounds, icons, and specific manifest information directly on the server details page.
*   **MOTD Preview:** Full support for rendering Minecraft Server MOTDs with their original colors and formatting.

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

## ⚙️ Backend Architecture (Rust)

Each registered server is pinged approximately every 10 seconds. To achieve this efficiently, I developed a custom library, `minecraft-pinger`, which implements the Minecraft protocol for both Java and Bedrock editions.

To keep the codebase maintainable and clear, the project is split into multiple distinct crates:

| Crate | Description |
| :--- | :--- |
| `minecraft-pinger` | External crate implementing the ping (status) protocol for Minecraft servers. |
| `repository` | Contains the core data models (`Server`, `PingRecord`, etc.) and the associated queries to communicate with the database. |
| `worker` | A standalone application that connects to the DB and handles continuously pinging the servers. It is also responsible for dispatching alerts. |
| `rest-api` | The API built with the [Axum](https://github.com/tokio-rs/axum) framework. It allows the frontend to fetch historical data and configure alerts. |

> ⚡ **Network Optimization:** To deliver extensive historical data to the frontend while minimizing bandwidth impact, the API does not use standard text formats (like JSON) for stats. Instead, all statistical data is **encoded and transmitted in binary**, ensuring ultra-fast and lightweight transfers for the client.

## 🗺️ Roadmap & Future Evolutions

The project is continuously evolving (such as the recent addition of MOTD previews with full support for Minecraft colors and styles). Here is a non-exhaustive list of upcoming optimizations:

*   **Redis Cache on the Backend:** Adding a temporary cache will significantly reduce the database load for each API request.
*   **Recording Optimization (Deltas):** Currently, if a server remains at 0 connected players for 24 hours, its state is continuously recorded. A planned revision aims to store only state changes (deltas). This will greatly reduce the number of database records for inactive servers, although it will introduce new technical challenges.

## 🛠️ Prerequisites

To run this project locally, you will need:

*   [Bun](https://bun.sh/) (recommended) or [Node.js](https://nodejs.org/)
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
```
