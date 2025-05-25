# Notion Knowledge Graph Visualizer

A read-only, auto-syncing knowledge graph layer on top of your Notion workspace that lets you visually navigate interconnected content, with clickable backlinks and clusters.

## Features

- **Auto-import from Notion:** Pulls structured page data and metadata
- **Graph generation:** Based on mentions, relations, and tags
- **Click-through to Notion:** Each node links back to its original page
- **Graph visualizer:** Interactive, zoomable, filterable (Sigma.js)
- **No data entry:** Keeps Notion as the writing/input tool
- **Incremental sync:** Only fetches changed content
- **Node clustering:** By tags or inferred topic

## Getting Started

### Prerequisites

- Node.js (14+)
- Yarn or npm
- A Notion workspace
- A Notion integration token (API key)

### Setup

1. Clone this repository
2. Create a `.env` file in the `backend` directory with the following content:

```
NOTION_TOKEN=secret_your_notion_integration_token
NOTION_ROOT_PAGE_ID=your_root_page_id
```

3. Install dependencies:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Running the Application

1. Run the initial sync to build the graph:

```bash
cd backend
npm run sync
```

2. Start the frontend:

```bash
cd ../frontend
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

## Development

### Backend

The backend is responsible for:
- Fetching data from Notion API
- Processing page content and extracting relationships
- Building and exporting the graph data

### Frontend

The frontend provides:
- Interactive graph visualization
- Search and filtering capabilities
- Node navigation to original Notion pages

## Project Structure

```bash
notion-graph/
├── backend/
│   ├── notion/        # Notion API integration
│   ├── graph/         # Graph construction
│   ├── utils/         # Utility functions
│   ├── .env           # Environment variables
│   └── syncState.json # Sync state tracking
├── frontend/
│   ├── public/        # Static assets
│   └── src/           # React components
```

## License

MIT

---

> **"Notion is your input, this is your output. Write as usual. Think visually."**
