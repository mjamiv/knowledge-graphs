# Knowledge Graph Studio

Access App: https://mjamiv.github.io/knowledge-graphs/

A powerful web application for creating, visualizing, and studying knowledge graphs from documents using AI.

![Knowledge Graph Studio](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-green)

## Features

### Document Processing
- **Multiple Formats**: Upload PDF, DOCX, TXT, or Markdown files
- **Client-Side Processing**: All document parsing happens in your browser
- **Large Document Support**: Automatic chunking for large documents

### AI-Powered Extraction
- **Entity Recognition**: Automatically identifies people, organizations, locations, concepts, events, technologies, and more
- **Relationship Extraction**: Discovers connections between entities
- **Configurable Models**: Choose between GPT-4o, GPT-4 Turbo, GPT-4, or GPT-3.5 Turbo

### Interactive Visualization
- **3D/2D Modes**: Switch between immersive 3D and classic 2D graph layouts
- **Force-Directed Layout**: Physics-based node positioning
- **Interactive Controls**: Zoom, pan, rotate, and click to explore
- **Node Highlighting**: Click nodes to see details and connections
- **Path Highlighting**: Visualize paths between entities

### Analysis Tools
- **Graph Metrics**: Node count, edge count, density, clustering coefficient
- **Network Topology**: Diameter, radius, average path length, center/periphery nodes
- **Centrality Analysis**: Degree, betweenness, closeness, PageRank, eigenvector, harmonic, and Katz centrality
- **Directed Graph Analysis**: In-degree and out-degree centrality for identifying hubs and authorities
- **Path Finding**: BFS shortest path and Dijkstra's weighted path algorithm
- **Community Detection**: Louvain algorithm with modularity scoring
- **Link Prediction**: Common neighbors, Jaccard coefficient, preferential attachment, and Adamic-Adar index
- **Search & Filter**: Find entities by name or filter by type

### Educational Features
- **Interactive Tooltips**: Hover over any metric to learn what it measures and why it matters for AI agents
- **Agent Context**: Each metric includes explanations of how AI agents use knowledge graphs for reasoning
- **Algorithm Visualization**: Step-by-step visualization of BFS and PageRank algorithms

### Data Management
- **Local Storage**: Graphs are saved in your browser
- **Export Options**: Download as JSON, CSV, or GraphML
- **Import/Export**: Share graphs with others

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/knowledge-graphs.git
cd knowledge-graphs
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:5173 in your browser

5. Click the Settings icon and enter your OpenAI API key

### Deployment

The app is configured for automatic deployment to GitHub Pages:

1. Push to the `main` branch
2. GitHub Actions will build and deploy automatically
3. Access your app at `https://yourusername.github.io/knowledge-graphs`

## Usage

### Creating a Knowledge Graph

1. **Configure API Key**: Click Settings and enter your OpenAI API key
2. **Upload Document**: Drag and drop a file or click to browse
3. **Extract**: Click "Extract Knowledge Graph" and wait for processing
4. **Explore**: Interact with the 3D visualization

### Analyzing Your Graph

- **Metrics Tab**: View graph statistics, topology metrics, and multiple centrality measures with educational tooltips
- **Paths Tab**: Find shortest paths (BFS) or weighted paths (Dijkstra) between entities
- **Search Tab**: Search for specific entities by name or description
- **Filter Tab**: Show/hide entity types
- **Predict Tab**: Discover potential missing relationships using link prediction algorithms

### Keyboard Shortcuts

- **Click Node**: Select and view details
- **Scroll**: Zoom in/out
- **Drag**: Rotate view (3D) / Pan (2D)
- **Right-Click Drag**: Pan (3D)

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Visualization**: react-force-graph-3d, Three.js
- **Document Parsing**: PDF.js, Mammoth.js
- **AI**: OpenAI GPT-4

## Privacy & Security

- **Local Processing**: Documents are parsed locally in your browser
- **API Key Storage**: Your OpenAI API key is stored only in your browser's localStorage
- **No Server**: This is a fully client-side application
- **Data Privacy**: Only extracted text is sent to OpenAI for analysis

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [react-force-graph](https://github.com/vasturiano/react-force-graph) for the amazing graph visualization library
- [OpenAI](https://openai.com) for the powerful language models
- [PDF.js](https://mozilla.github.io/pdf.js/) for PDF parsing
- [Mammoth.js](https://github.com/mwilliamson/mammoth.js) for DOCX parsing
