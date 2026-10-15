# 🌐 V Platform -- AI Research Intelligence & Content Architecture Workspace

> **An AI-powered research, domain intelligence, and content architecture platform integrating Neon Serverless PostgreSQL and local Ollama inference.**

---

## 🌟 Key Features

- **⚡ Real-Time Research HUD & Brief Generator**: Automatically aggregates, clusters, and synthesizes domain intelligence briefs with real-time SSE progress streaming.
- **🧠 Hybrid AI Engine (Ollama & Cloud)**: Pluggable model architecture supporting local Ollama models (Llama 3, Mistral, Qwen) for privacy-first analysis alongside cloud AI backends.
- **📊 Algorithmic Content & Domain Scoring**: Custom scoring heuristics evaluating content readability, topic coverage, and domain audit health.
- **🔄 Side-by-Side Comparison Panels**: Compare drafts, briefs, and competitor domains simultaneously with synchronized scrolling and diff highlighting.
- **📁 Multi-Workspace State Management**: Seamlessly manage research projects with local cache persistence and cloud synchronization on Neon Serverless PostgreSQL.
- **🧪 Test-Driven Engineering**: Robust unit test suite covering scoring algorithms, comparison services, and domain analytics with Vitest.

---

## 🏛️ Architecture & Tech Stack

```
+---------------------------------------------------------------+
|                      V PLATFORM ARCHITECTURE                  |
+---------------------------------------------------------------+
|  UI Layer:        React 19 + TypeScript + Tailwind CSS v4     |
|  Build Tooling:   Vite 8 + Oxlint + Vitest                    |
|  AI Backends:     Local Ollama (REST) + Cloud LLM Gateway     |
|  Database:        Neon Serverless PostgreSQL (Workspaces/Docs)|
+---------------------------------------------------------------+
```

### Stack Details
- **Frontend Framework**: React `19.2` (TypeScript)
- **Styling**: Tailwind CSS `v4` with Lucide Icons
- **Bundler & Tooling**: Vite `v8`, Oxlint
- **Testing**: Vitest (`test/` suite across `scoring`, `compare`, `domain`, and `api`)
- **Database / API**: Neon Serverless PostgreSQL & REST API services

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20.0.0
- (Optional) [Ollama](https://ollama.ai/) running locally for on-device AI inference

### Installation

```bash
# Clone the repository
git clone https://github.com/sherifahmedeisa/v-platform.git
cd v-platform

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Running Tests & Linter

```bash
# Run unit tests
npm test

# Run Oxlint
npm run lint

# Build for production
npm run build
```

---

## 📂 Project Structure

```
src/
├── components/          # Reusable UI & Modal components
│   ├── Editor.tsx       # Core markdown editor with live stats
│   ├── BriefPanel.tsx   # AI Research brief panel
│   ├── ScoreWidget.tsx  # Dynamic content scoring widget
│   └── ComparePanel.tsx # Side-by-side comparison engine
├── services/            # Pure TypeScript domain & scoring services
│   ├── api.ts           # Neon DB API & streaming services
│   ├── domain.ts        # Domain health & audit computation
│   ├── scoring.ts       # Content scoring algorithms
│   └── ollama.ts        # Local Ollama LLM integration
└── types.ts             # Shared domain types & interfaces
```

---

## 📄 License
MIT License. Built by [Sherif Ahmed Eisa](https://github.com/sherifahmedeisa).
