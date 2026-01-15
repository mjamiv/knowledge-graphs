import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  KnowledgeGraph,
  Entity,
  Relationship,
  AppSettings,
  DEFAULT_SETTINGS,
  ExtractionProgress,
  GraphMetrics,
  CentralityMetrics,
} from '../types';
import { calculateMetrics, calculateCentrality } from '../utils/graphAnalysis';

interface GraphState {
  // Current graph
  currentGraph: KnowledgeGraph | null;

  // Saved graphs
  savedGraphs: KnowledgeGraph[];

  // Settings
  settings: AppSettings;

  // Extraction state
  extractionProgress: ExtractionProgress;

  // UI state
  selectedNode: string | null;
  selectedNodes: string[];
  highlightedPath: string[];
  filterEntityTypes: string[];
  filterRelationshipTypes: string[];
  searchQuery: string;

  // Computed metrics (cached)
  metrics: GraphMetrics | null;
  centrality: CentralityMetrics | null;

  // Actions
  setCurrentGraph: (graph: KnowledgeGraph | null) => void;
  saveGraph: (graph: KnowledgeGraph) => void;
  loadGraph: (id: string) => void;
  deleteGraph: (id: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setExtractionProgress: (progress: ExtractionProgress) => void;

  // Node/selection actions
  selectNode: (nodeId: string | null) => void;
  toggleNodeSelection: (nodeId: string) => void;
  clearSelection: () => void;
  setHighlightedPath: (path: string[]) => void;

  // Filter actions
  setFilterEntityTypes: (types: string[]) => void;
  setFilterRelationshipTypes: (types: string[]) => void;
  setSearchQuery: (query: string) => void;

  // Graph modification actions
  addEntity: (entity: Entity) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  deleteEntity: (id: string) => void;
  addRelationship: (relationship: Relationship) => void;
  deleteRelationship: (id: string) => void;

  // Metrics
  recalculateMetrics: () => void;

  // Export/Import
  exportGraph: (format: 'json' | 'csv' | 'graphml') => string;
  importGraph: (data: string, format: 'json') => void;
}

export const useGraphStore = create<GraphState>()(
  persist(
    (set, get) => ({
      currentGraph: null,
      savedGraphs: [],
      settings: DEFAULT_SETTINGS,
      extractionProgress: { stage: 'idle', progress: 0, message: '' },
      selectedNode: null,
      selectedNodes: [],
      highlightedPath: [],
      filterEntityTypes: [],
      filterRelationshipTypes: [],
      searchQuery: '',
      metrics: null,
      centrality: null,

      setCurrentGraph: (graph) => {
        set({ currentGraph: graph, selectedNode: null, selectedNodes: [], highlightedPath: [] });
        if (graph) {
          get().recalculateMetrics();
        } else {
          set({ metrics: null, centrality: null });
        }
      },

      saveGraph: (graph) => {
        const { savedGraphs } = get();
        const existingIndex = savedGraphs.findIndex((g) => g.id === graph.id);

        if (existingIndex >= 0) {
          const updated = [...savedGraphs];
          updated[existingIndex] = { ...graph, updatedAt: new Date().toISOString() };
          set({ savedGraphs: updated });
        } else {
          set({ savedGraphs: [...savedGraphs, graph] });
        }
      },

      loadGraph: (id) => {
        const graph = get().savedGraphs.find((g) => g.id === id);
        if (graph) {
          get().setCurrentGraph(graph);
        }
      },

      deleteGraph: (id) => {
        set((state) => ({
          savedGraphs: state.savedGraphs.filter((g) => g.id !== id),
          currentGraph: state.currentGraph?.id === id ? null : state.currentGraph,
        }));
      },

      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },

      setExtractionProgress: (progress) => {
        set({ extractionProgress: progress });
      },

      selectNode: (nodeId) => {
        set({ selectedNode: nodeId });
      },

      toggleNodeSelection: (nodeId) => {
        set((state) => {
          const isSelected = state.selectedNodes.includes(nodeId);
          return {
            selectedNodes: isSelected
              ? state.selectedNodes.filter((id) => id !== nodeId)
              : [...state.selectedNodes, nodeId],
          };
        });
      },

      clearSelection: () => {
        set({ selectedNode: null, selectedNodes: [], highlightedPath: [] });
      },

      setHighlightedPath: (path) => {
        set({ highlightedPath: path });
      },

      setFilterEntityTypes: (types) => {
        set({ filterEntityTypes: types });
      },

      setFilterRelationshipTypes: (types) => {
        set({ filterRelationshipTypes: types });
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      addEntity: (entity) => {
        const { currentGraph } = get();
        if (!currentGraph) return;

        const updated: KnowledgeGraph = {
          ...currentGraph,
          entities: [...currentGraph.entities, entity],
          metadata: {
            ...currentGraph.metadata,
            nodeCount: currentGraph.metadata.nodeCount + 1,
            entityTypes: {
              ...currentGraph.metadata.entityTypes,
              [entity.type]: (currentGraph.metadata.entityTypes[entity.type] || 0) + 1,
            },
          },
          updatedAt: new Date().toISOString(),
        };

        set({ currentGraph: updated });
        get().recalculateMetrics();
      },

      updateEntity: (id, updates) => {
        const { currentGraph } = get();
        if (!currentGraph) return;

        const updated: KnowledgeGraph = {
          ...currentGraph,
          entities: currentGraph.entities.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
          updatedAt: new Date().toISOString(),
        };

        set({ currentGraph: updated });
      },

      deleteEntity: (id) => {
        const { currentGraph } = get();
        if (!currentGraph) return;

        const entity = currentGraph.entities.find((e) => e.id === id);
        if (!entity) return;

        const updated: KnowledgeGraph = {
          ...currentGraph,
          entities: currentGraph.entities.filter((e) => e.id !== id),
          relationships: currentGraph.relationships.filter(
            (r) => r.source !== id && r.target !== id
          ),
          metadata: {
            ...currentGraph.metadata,
            nodeCount: currentGraph.metadata.nodeCount - 1,
            entityTypes: {
              ...currentGraph.metadata.entityTypes,
              [entity.type]: Math.max(0, (currentGraph.metadata.entityTypes[entity.type] || 1) - 1),
            },
          },
          updatedAt: new Date().toISOString(),
        };

        set({ currentGraph: updated, selectedNode: null });
        get().recalculateMetrics();
      },

      addRelationship: (relationship) => {
        const { currentGraph } = get();
        if (!currentGraph) return;

        const updated: KnowledgeGraph = {
          ...currentGraph,
          relationships: [...currentGraph.relationships, relationship],
          metadata: {
            ...currentGraph.metadata,
            edgeCount: currentGraph.metadata.edgeCount + 1,
            relationshipTypes: {
              ...currentGraph.metadata.relationshipTypes,
              [relationship.type]: (currentGraph.metadata.relationshipTypes[relationship.type] || 0) + 1,
            },
          },
          updatedAt: new Date().toISOString(),
        };

        set({ currentGraph: updated });
        get().recalculateMetrics();
      },

      deleteRelationship: (id) => {
        const { currentGraph } = get();
        if (!currentGraph) return;

        const relationship = currentGraph.relationships.find((r) => r.id === id);
        if (!relationship) return;

        const updated: KnowledgeGraph = {
          ...currentGraph,
          relationships: currentGraph.relationships.filter((r) => r.id !== id),
          metadata: {
            ...currentGraph.metadata,
            edgeCount: currentGraph.metadata.edgeCount - 1,
            relationshipTypes: {
              ...currentGraph.metadata.relationshipTypes,
              [relationship.type]: Math.max(0, (currentGraph.metadata.relationshipTypes[relationship.type] || 1) - 1),
            },
          },
          updatedAt: new Date().toISOString(),
        };

        set({ currentGraph: updated });
        get().recalculateMetrics();
      },

      recalculateMetrics: () => {
        const { currentGraph } = get();
        if (!currentGraph) {
          set({ metrics: null, centrality: null });
          return;
        }

        const metrics = calculateMetrics(currentGraph);
        const centrality = calculateCentrality(currentGraph);
        set({ metrics, centrality });
      },

      exportGraph: (format) => {
        const { currentGraph } = get();
        if (!currentGraph) return '';

        switch (format) {
          case 'json':
            return JSON.stringify(currentGraph, null, 2);

          case 'csv': {
            const nodesCSV = 'id,name,type,description\n' +
              currentGraph.entities.map((e) =>
                `"${e.id}","${e.name}","${e.type}","${e.description || ''}"`
              ).join('\n');

            const edgesCSV = 'source,target,type,description\n' +
              currentGraph.relationships.map((r) =>
                `"${r.source}","${r.target}","${r.type}","${r.description || ''}"`
              ).join('\n');

            return `# NODES\n${nodesCSV}\n\n# EDGES\n${edgesCSV}`;
          }

          case 'graphml': {
            const nodes = currentGraph.entities.map((e) =>
              `    <node id="${e.id}">
      <data key="name">${e.name}</data>
      <data key="type">${e.type}</data>
    </node>`
            ).join('\n');

            const edges = currentGraph.relationships.map((r) =>
              `    <edge source="${r.source}" target="${r.target}">
      <data key="relationship">${r.type}</data>
    </edge>`
            ).join('\n');

            return `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="name" for="node" attr.name="name" attr.type="string"/>
  <key id="type" for="node" attr.name="type" attr.type="string"/>
  <key id="relationship" for="edge" attr.name="relationship" attr.type="string"/>
  <graph id="${currentGraph.id}" edgedefault="directed">
${nodes}
${edges}
  </graph>
</graphml>`;
          }

          default:
            return '';
        }
      },

      importGraph: (data, format) => {
        if (format === 'json') {
          try {
            const graph = JSON.parse(data) as KnowledgeGraph;
            // Validate basic structure
            if (graph.entities && graph.relationships && graph.metadata) {
              get().setCurrentGraph(graph);
              get().saveGraph(graph);
            }
          } catch (e) {
            console.error('Failed to import graph:', e);
          }
        }
      },
    }),
    {
      name: 'knowledge-graph-storage',
      partialize: (state) => ({
        savedGraphs: state.savedGraphs,
        settings: state.settings,
      }),
    }
  )
);
