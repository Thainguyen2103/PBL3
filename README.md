<div align="center">
  <br/>
  <h1>🌸 Japanese Learning Platform - Full-stack Architecture</h1>
  <p>
    <strong>A comprehensive, AI-integrated, and gamified Japanese learning ecosystem.</strong><br/>
    <i>Developed as a Capstone Project (PBL3) demonstrating advanced Full-stack Engineering, Real-time Systems, and AI Integrations.</i>
  </p>
  <br/>
</div>

## 📖 Executive Summary

This project is a robust, full-stack Japanese learning platform designed to bridge the gap between traditional rote memorization and practical, engaging language acquisition. It goes beyond simple flashcards by integrating **Real-time Multiplayer Matchmaking (Arena)**, **Intelligent Multilingual AI Analysis (Google Gemini)**, and **Interactive Stroke-Order Visualizations**.

The codebase demonstrates a deep understanding of modern web architecture, state management, complex database transactions (handling race conditions natively in PostgreSQL), and seamless third-party API orchestration.

---

## 🛠️ Technology Stack & Architecture

### Frontend (Client-Side)
- **Framework:** React.js 19 with Vite (for optimized HMR and build performance).
- **Styling:** Vanilla CSS & Tailwind CSS for a scalable, responsive, and highly customizable UI system (including Glassmorphism and specialized dark modes).
- **State & Routing:** `react-router-dom` for robust SPA navigation. Complex state is managed via specialized Custom Hooks (`useArenaMatchmaking`, `useStatistics`).
- **Interactive Visualizations:**
  - `reactflow` & `dagre`: Rendering declarative, directed graph trees for Kanji etymology and structural relationships.
  - `hanzi-writer`: SVG-based interactive Japanese/Chinese character stroke-order animations.
  - `wanakana`: Real-time Romaji to Hiragana/Katakana phonetic conversions.

### Backend & API Edge
- **Server:** Node.js with Express.js acting as a specialized edge runtime for AI proxying.
- **AI Engine:** `@google/genai` (Google Gemini Pro) for processing multilingual user data, generating customized learning roadmaps, and powering the AI conversational chatbot.

### Database & Authentication (Supabase / PostgreSQL)
- **Database:** PostgreSQL (via Supabase) with heavily optimized Pl/pgSQL RPC functions.
- **Authentication:** Supabase Auth for JWT-based secure sessions, Email Verification, and password recovery.
- **Real-time:** Supabase Realtime (WebSockets) for instant messaging (Friend System, Global Chat) and Multiplayer Arena synchronization.

---

## 🔥 Key Technical Technical Achievements & Problem Solving

This project was built to solve several complex engineering challenges. Here are the highlights:

### 1. Concurrency Control in Real-time Matchmaking
**Challenge:** In the Arena (PvP) mode, multiple players joining the matchmaking queue simultaneously could lead to race conditions, overfilling lobbies, or duplicate match creation.
**Solution:** 
- Instead of managing queue state completely on a Node.js server (which requires complex Redis locking), I pushed the concurrency logic down to the database layer using **PostgreSQL PL/pgSQL**.
- Implemented `join_match_queue` and `accept_match_ready` RPC functions utilizing `FOR UPDATE SKIP LOCKED`. This guarantees ACID compliance, ensures row-level locking during queue assignment, and completely eliminates race conditions when multiple concurrent users attempt to join the same match room.

### 2. Intelligent Multilingual Analytics Engine
**Challenge:** Providing meaningful learning feedback to users across 5 different languages (English, Japanese, Vietnamese, Chinese, Korean) based on their raw application statistics without hardcoding static strings.
**Solution:**
- Engineered a data pipeline that collects aggregate daily statistics (Flashcard reviews, Arena wins/losses, Study time).
- Integrated **Google Gemini AI** via a secure backend proxy to ingest these raw PostgreSQL aggregates and dynamically output contextual, emotionally expressive learning advice.
- Built a localized formatting engine (`formatMsg`) that strictly maps AI outputs to parameterized translation templates, ensuring syntax validity regardless of the user's chosen UI language.

### 3. Declarative Graph Rendering for Kanji Structures
**Challenge:** Visualizing how complex Kanji characters are built from radicals to help learners remember them through etymology.
**Solution:**
- Integrated `React Flow` alongside the `Dagre` layout algorithm to mathematically calculate node positioning and render SVG edges. 
- Transformed raw API relational data into a semantic Graph structure, rendering interactive, draggable, and beautifully styled Kanji component Trees natively in the browser.

---

## 🗄️ Database Schema & Entities Overview

The database strictly adheres to normalized relational design. Core entities include:

- **`users` / `profiles`**: Extended metadata linked to Supabase Auth UUIDs, tracking level, experience points (XP), and customized avatars.
- **`matches`**: Central table for the PvP matchmaking engine. Utilizes `JSONB` to store player arrays flexibly and tracks state (`waiting`, `ready_check`, `playing`, `completed`).
- **`daily_stats`**: Time-series tracking of user engagement per day (study duration, flashcards learned, match participation). Optimized with indices for fast aggregation in the `StatisticsPage`.
- **`friends` / `messages`**: Graph relationships mapping user inter-connections and storing encrypted peer-to-peer messages with Realtime webhooks.

---

## 🚀 Local Development Setup

To run this project locally, ensure you have Node.js (>= 18.x) and a Supabase Project initialized.

### 1. Clone the Repository
```bash
git clone https://github.com/Thainguyen2103/PBL3.git
cd PBL3-main
```

### 2. Database Provisioning
Copy the SQL scripts located in `backend/sql/` (such as `QUICK_SETUP.sql`) and run them in your Supabase SQL Editor. This will instantiate the necessary tables, Row Level Security (RLS) policies, and critical PL/pgSQL RPC functions.

### 3. Backend Setup (AI Proxy)
```bash
cd backend
npm install
```
Create a `.env` file in the `backend/` directory:
```env
GEMINI_API_KEY=your_google_gemini_api_key
PORT=3000
```
Run the edge server:
```bash
npm start # or node server.js
```

### 4. Frontend Setup
Open a new terminal session:
```bash
cd frontend
npm install
```
Create a `.env` file in the `frontend/` directory connecting it to your Supabase instance:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_auth_key
VITE_API_URL=http://localhost:3000
```
Run the Vite development server:
```bash
npm run dev
```

Visit the console output URL (typically `http://localhost:5173`) to view the application.

---

<div align="center">
  <p><i>Looking for an engineer who understands both deep technical architecture and product UX? Feel free to explore the codebase.</i></p>
</div>
