# Product Requirements Document (PRD)

## Product Name: Notion Knowledge Graph Visualizer

---

## TL;DR

**Goal:** Build a read-only, auto-syncing knowledge graph layer on top of your Notion workspace that lets you visually navigate interconnected content, with clickable backlinks and clusters, without ever leaving Notion as your single source of truth.

No workflow rebuilds. No app-switching. No duplication. This is a viewer, not a new system.

---

## Core Value Proposition

**"Turn your Notion pages into a thinking map, not a second brain rebuild."**

---

## Key Pain Points

| Problem                                                      | Impact                                    |
| ------------------------------------------------------------ | ----------------------------------------- |
| Notion has limited backlinking UX                            | Hard to spot interconnections             |
| No native visualization of page relationships                | Limits semantic thinking                  |
| Context-switching to tools like Obsidian/Logseq is expensive | Disrupts workflow, requires retraining    |
| Notion API pagination and rate-limits                        | Makes naive sync brittle and slow         |
| Building a performant graph of 1K+ nodes                     | Requires careful structure, deduplication |

---

## Key Features

- **Auto-import from Notion:** Pulls structured page data and metadata
- **Graph generation:** Based on mentions, relations, and tags
- **Click-through to Notion:** Each node links back to its original page
- **Graph visualizer:** Interactive, zoomable, filterable (Sigma.js)
- **No data entry:** Keeps Notion as the writing/input tool
- **Incremental sync:** Only fetches changed content
- **Node clustering:** By tags or inferred topic

---

## Functional Requirements

### 1. Data Sync Engine

- Authentication using Notion internal integration token
- Fetch pages recursively with block support
- Extract backlinks (mentions + relations)
- Normalize metadata (title, tags, last edit)
- Handle pagination and rate-limiting robustly

### 2. Graph Builder

- Nodes: Each Notion page becomes a node
- Edges: Relations, mentions become edges
- Optional clustering logic for groupings (by tags or inferred)
- Deduplication of IDs and links
- Export as `graph.json`

### 3. Visual Graph UI (Sigma.js)

- Load `graph.json` from static or API source
- Render with node metadata (color by tag/type)
- Clickable nodes (link to Notion URL)
- Search + filter bar
- Highlight + focus on node selection

---

## Non-Functional Requirements

- Works with 1,000+ nodes smoothly
- Sync time under 5 minutes per 1,000 pages
- Frontend graph load/render under 2s
- No writes back to Notion
- No duplication of Notion content

---

## Technical Stack

- **Backend:** Node.js + TypeScript
- **Frontend:** React (Vite) + TypeScript + Sigma.js
- **Data:** Static JSON (`graph.json`) or optional lightweight API

---

## Prerequisites & Setup

### `.env` Configuration

```env
NOTION_TOKEN=secret_...
NOTION_ROOT_PAGE_ID=...
```

### Project Bootstrap (CLI)

```bash
yarn init -y
yarn add @notionhq/client dotenv ts-node nodemon
```

```ts
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

---

## Phase Plan (Strict Tasks)

### PHASE 1: Notion Data Fetcher

#### 1.1 SDK Client Setup

```ts
// notionClient.ts
import { Client } from '@notionhq/client';
export const notion = new Client({ auth: process.env.NOTION_TOKEN });
```

#### 1.2 Recursive Fetch with Pagination

```ts
async function fetchAllPages(cursor?: string) {
  const response = await notion.search({
    start_cursor: cursor,
    page_size: 100
  });
  // Recurse if has_more
}
```

#### 1.3 Incremental Sync

- Store `lastEditedTime` in `syncState.json`
- Only fetch pages where `last_edited_time > previous_sync`

#### 1.4 Block Traversal for Mentions

```ts
// Recursive traversal of blocks for @mentions and relations
function extractMentions(block) {
  if (block.type === 'mention') {
    // build backlink
  }
}
```

---

### PHASE 2: Graph Data Construction

#### 2.1 Node and Edge Models

```ts
type Node = {
  id: string;
  label: string;
  url: string;
  tags?: string[];
  type?: string;
};

type Edge = {
  source: string;
  target: string;
  type?: 'mention' | 'relation';
};
```

#### 2.2 Deduplication & Normalization

- Normalize UUIDs
- Use Maps for fast lookup

#### 2.3 Exporting JSON

```ts
fs.writeFileSync('frontend/public/graph.json', JSON.stringify({ nodes, edges }, null, 2));
```

---

### PHASE 3: Frontend Visualization

#### 3.1 Setup Vite + Sigma.js

```bash
yarn create vite frontend --template react-ts
yarn add sigma
```

#### 3.2 Load Graph

```ts
fetch('/graph.json').then(res => res.json()).then(setGraph)
```

#### 3.3 Sigma.js Integration

- Customize node size by backlinks
- On click: `window.open(node.url, '_blank')`
- Highlight node + connected edges

---

### PHASE 4: UX, Sync, Enhancements

#### 4.1 Graph Controls

- Cluster toggle
- Filters by tag/type
- Search box input

#### 4.2 Backend Trigger

- Daily cron (node-cron)
- Or manual `yarn sync`

#### 4.3 Error Handling

```ts
try {
  await notion.pages.retrieve(...);
} catch (e) {
  console.error('Failed page fetch', e);
}
```

---

## Folder Structure

```bash
notion-graph/
├── backend/
│   ├── notion/
│   │   ├── notionClient.ts
│   │   ├── fetchPages.ts
│   │   ├── fetchBlocks.ts
│   │   └── extractGraphData.ts
│   ├── graph/
│   │   └── buildGraph.ts
│   ├── utils/
│   │   ├── rateLimiter.ts
│   │   └── idNormalizer.ts
│   ├── .env
│   └── syncState.json
├── frontend/
│   ├── public/
│   │   └── graph.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── Graph.tsx
│   │   ├── SearchFilter.tsx
│   │   └── components/
│   └── vite.config.ts
```


---

## Final Thought

> **"Notion is your input, this is your output. Write as usual. Think visually."**

---
