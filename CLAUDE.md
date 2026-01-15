# CLAUDE.md

This file provides guidance for Claude when working on this codebase.

## Project Overview

Knowledge Graph Studio is a client-side web application for creating, visualizing, and studying knowledge graphs from documents using OpenAI's GPT models. It runs entirely in the browser and is deployed to GitHub Pages.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand (with localStorage persistence)
- **Visualization**: react-force-graph-3d, react-force-graph-2d, Three.js
- **Document Parsing**: PDF.js (PDFs), Mammoth.js (DOCX)
- **AI**: OpenAI API (client-side calls)

## Commands

```bash
# Install dependencies
npm install

# Run development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint the codebase
npm run lint
```

## Project Structure

```
src/
├── components/          # React UI components
│   ├── AnalysisPanel.tsx       # Graph analysis tools (metrics, paths, search, link prediction)
│   ├── AlgorithmVisualizer.tsx # Step-by-step algorithm visualization (BFS, PageRank)
│   ├── GraphVisualization.tsx  # 3D/2D force-directed graph
│   ├── Header.tsx              # Top navigation bar
│   ├── MetricTooltip.tsx       # Educational tooltips for graph metrics
│   ├── NodeDetails.tsx         # Selected node info panel
│   ├── SettingsModal.tsx       # API key and preferences
│   ├── Sidebar.tsx             # Saved graphs list
│   ├── UploadPanel.tsx         # Document upload interface
│   └── WelcomeScreen.tsx       # Landing page
├── data/
│   └── metricExplanations.ts   # Educational content for metrics and algorithms
├── services/
│   ├── documentParser.ts       # PDF/DOCX/TXT parsing
│   └── openaiExtractor.ts      # Knowledge graph extraction via OpenAI
├── stores/
│   └── graphStore.ts           # Zustand store for app state
├── types/
│   └── index.ts                # TypeScript interfaces
├── utils/
│   └── graphAnalysis.ts        # Graph algorithms (centrality, paths, topology, etc.)
├── App.tsx                     # Main app component
├── main.tsx                    # Entry point
└── index.css                   # Global styles + Tailwind
```

## Key Architectural Decisions

1. **Fully Client-Side**: No backend server. Documents are parsed in-browser, and OpenAI API is called directly from the client. Users provide their own API key.

2. **State Management**: Zustand store with persistence to localStorage. Graphs are saved locally in the browser.

3. **Graph Visualization**: Uses react-force-graph library which wraps Three.js for 3D and Canvas for 2D rendering.

4. **TypeScript Strict Mode**: The project uses strict TypeScript. Pay attention to types, especially for the force-graph library which adds position properties (x, y, z) to nodes at runtime.

## Important Types

```typescript
// Core entity in the knowledge graph
interface Entity {
  id: string;
  name: string;
  type: EntityType; // person, organization, location, concept, etc.
  description?: string;
}

// Relationship between entities
interface Relationship {
  id: string;
  source: string;  // Entity ID
  target: string;  // Entity ID
  type: string;    // e.g., "works_for", "located_in"
}

// Complete knowledge graph
interface KnowledgeGraph {
  id: string;
  name: string;
  entities: Entity[];
  relationships: Relationship[];
  metadata: GraphMetadata;
}
```

## Working with the Force Graph

The `ForceGraphNode` interface extends `GraphNode` with optional position properties that the force-graph library adds at runtime:

```typescript
interface ForceGraphNode extends GraphNode {
  x?: number;
  y?: number;
  z?: number;
}
```

When using callbacks like `nodeThreeObject`, you may need to use `any` type to avoid complex type issues with the library.

## OpenAI Integration

The extraction service (`src/services/openaiExtractor.ts`) uses:
- `dangerouslyAllowBrowser: true` for client-side API calls
- JSON response format for structured extraction
- Text chunking for large documents

## Styling Conventions

- Use Tailwind CSS utility classes
- Dark theme by default (slate-800/900 backgrounds)
- Entity type colors defined in `ENTITY_COLORS` constant
- Custom CSS classes: `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.input`, `.select`

## GitHub Pages Deployment

The app auto-deploys via GitHub Actions (`.github/workflows/deploy.yml`) when pushing to `main`. The Vite config uses `base: './'` for relative asset paths.

## Graph Analysis Algorithms

The `src/utils/graphAnalysis.ts` file provides comprehensive graph analysis:

### Centrality Metrics
- **Degree centrality**: Direct connections (normalized)
- **Betweenness centrality**: Bridge nodes (Brandes algorithm)
- **Closeness centrality**: Average distance to all nodes
- **PageRank**: Recursive importance scoring
- **Eigenvector centrality**: Importance based on neighbor importance
- **Harmonic centrality**: Better than closeness for disconnected graphs
- **Katz centrality**: All paths with exponential decay

### Directed Graph Analysis
- **In-degree centrality**: Identifies authority nodes (referenced by many)
- **Out-degree centrality**: Identifies hub nodes (reference many others)
- `buildDirectedAdjacency()`: Separate outgoing/incoming edge maps

### Path Finding
- **BFS shortest path**: `findShortestPath()` - unweighted
- **Dijkstra's algorithm**: `findWeightedShortestPath()` - weighted paths with configurable weight inversion

### Network Topology
- `calculateTopologyMetrics()`: Diameter, radius, average path length, center/periphery nodes

### Community Detection
- **Label propagation**: `detectCommunities()` - fast, approximate
- **Louvain algorithm**: `detectCommunitiesLouvain()` - modularity optimization
- `calculateModularity()`: Quality score for community assignments

### Link Prediction
- `predictLinks()`: Common neighbors, Jaccard, preferential attachment, Adamic-Adar

### Algorithm Visualization
- `generateBFSSteps()`: Step-by-step BFS visualization data
- `generatePageRankSteps()`: Step-by-step PageRank iteration data

## Educational Features

The `src/data/metricExplanations.ts` file contains educational content for each metric:
- Short and full descriptions
- High/low value interpretation
- Agent use cases (why AI agents use this metric)
- Formulas where applicable
- Related metrics

The `MetricTooltip` component displays this information on hover.

## Common Tasks

### Adding a new entity type
1. Add to `EntityType` union in `src/types/index.ts`
2. Add color to `ENTITY_COLORS` constant
3. Update extraction prompt in `openaiExtractor.ts` if needed

### Adding a new graph metric
1. Add calculation to `src/utils/graphAnalysis.ts`
2. Add to `GraphMetrics` interface or create new interface
3. Add explanation to `src/data/metricExplanations.ts`
4. Display in `AnalysisPanel.tsx` with `MetricTooltip`

### Adding a new centrality metric
1. Add function to `src/utils/graphAnalysis.ts`
2. Update `CentralityMetrics` interface in `src/types/index.ts`
3. Add explanation to `METRIC_EXPLANATIONS` in `metricExplanations.ts`
4. Display in AnalysisPanel's centrality section

### Adding a new export format
1. Add case to `exportGraph` function in `graphStore.ts`
2. Add button in `Header.tsx` export dropdown
