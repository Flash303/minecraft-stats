<p align="center">
  <img src="frontend/src/assets/logo.png" alt="Minecraft Stats Logo" width="200" />
</p>

<h1 align="center">Minecraft Stats</h1>

🌍 **Accessible en ligne sur : [mc-stats.fr](https://mc-stats.fr)**

Minecraft Stats est une application complète (full-stack) permettant de surveiller, collecter et visualiser les statistiques de serveurs Minecraft en temps réel. Ce dépôt est un monorepo contenant à la fois le client web (frontend) et les services serveur (backend).

> 💡 **Inspiration :** Ce projet a été inspiré par le concept original de [Sportek/minecraft-stats](https://github.com/Sportek/minecraft-stats).

## 🚀 Technologies

**Frontend :**
*   [React 19](https://react.dev/) avec [TypeScript](https://www.typescriptlang.org/)
*   [Vite](https://vitejs.dev/) - Outil de build ultra-rapide
*   [Tailwind CSS](https://tailwindcss.com/) & [Shadcn/ui](https://ui.shadcn.com/) - Pour le style et les composants UI
*   [uPlot](https://github.com/leeoniya/uPlot) - Pour le rendu performant des graphiques de statistiques
*   [Clerk](https://clerk.com/) - Pour l'authentification des utilisateurs

**Backend :**
*   [Rust](https://www.rust-lang.org/) - Langage principal pour sa performance et sa sécurité
*   [Axum](https://github.com/tokio-rs/axum) - Framework web pour l'API REST
*   [SQLx](https://github.com/launchbadge/sqlx) - Toolkit asynchrone pour interagir avec PostgreSQL
*   [Tokio](https://tokio.rs/) - Runtime asynchrone pour Rust

**Déploiement :**
*   Docker & Docker Compose

## 📁 Structure du projet

Le monorepo est divisé en trois parties principales :

*   **`/frontend/`** : L'application web utilisateur en React/Vite.
*   **`/backend/`** : Espace de travail (workspace) Rust contenant :
    *   `rest-api/` : L'API principale qui communique avec le frontend (Axum).
    *   `worker/` : Service d'arrière-plan chargé de "ping" les serveurs Minecraft et d'enregistrer leurs états.
    *   `repository/` : Couche d'accès aux données partagée (SQLx / PostgreSQL).
*   **`/deploy/`** : Fichiers de configuration pour le déploiement (fichiers `.env`, `docker-compose.yml`, et les contextes Docker pour chaque service).

## 🛠️ Prérequis

Pour lancer le projet localement, vous aurez besoin de :

*   [Node.js](https://nodejs.org/) (et [pnpm](https://pnpm.io/) recommandé)
*   [Rust & Cargo](https://rustup.rs/) (version 2024 ou supérieure)
*   [Docker](https://www.docker.com/) et Docker Compose (pour la base de données et l'environnement complet)
*   Une base de données PostgreSQL

## ⚙️ Installation et Lancement

### Lancement avec Docker (Recommandé)

Le moyen le plus simple de démarrer l'ensemble de la pile est d'utiliser Docker Compose situé dans le dossier `deploy`.

```bash
cd deploy
# Copiez le fichier d'exemple et configurez vos variables d'environnement
cp .env.local .env
# Lancez les services
docker-compose up -d --build
```

### Développement local (Mode Dev)

Si vous souhaitez travailler sur le code source, vous devrez lancer le backend et le frontend séparément.

#### 1. Backend (API & Worker)

Assurez-vous d'avoir une instance PostgreSQL en cours d'exécution (vous pouvez utiliser uniquement le service `db` du `docker-compose.yml`).

```bash
cd backend
# Lancez l'API REST
cargo run --bin rest-api

# Dans un autre terminal, lancez le worker
cargo run --bin worker
```

#### 2. Frontend

Installez les dépendances et démarrez le serveur de développement Vite :

```bash
cd frontend
# Installation des dépendances avec pnpm
pnpm install
# Lancement du serveur
pnpm run dev
```

Ouvrez `http://localhost:5173` dans votre navigateur pour voir l'application.

## 🎯 Objectifs futurs

*   **Optimisation des performances :** Améliorer la gestion, le stockage et la requêtage de la quantité colossale de données temporelles récoltées afin d'assurer une évolutivité à long terme.

## 📝 Licence

Ce projet est sous licence **GPL-3.0**. Consultez le fichier [LICENSE](LICENSE) pour plus de détails.

<p align="center">
  <img src="https://visitor-badge.laobi.icu/badge?page_id=flash303.minecraft-stats&left_text=Visiteurs" alt="visitors">
</p>
