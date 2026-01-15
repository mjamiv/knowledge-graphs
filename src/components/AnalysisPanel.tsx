import { useState, useMemo } from 'react';
import {
  X,
  Search,
  GitBranch,
  BarChart3,
  Filter,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useGraphStore } from '../stores/graphStore';
import { findShortestPath, detectCommunities, searchEntities } from '../utils/graphAnalysis';
import { ENTITY_COLORS, EntityType } from '../types';

interface AnalysisPanelProps {
  onClose: () => void;
}

export default function AnalysisPanel({ onClose }: AnalysisPanelProps) {
  const {
    currentGraph,
    metrics,
    centrality,
    setHighlightedPath,
    setFilterEntityTypes,
    filterEntityTypes,
    searchQuery,
    setSearchQuery,
  } = useGraphStore();

  const [activeTab, setActiveTab] = useState<'metrics' | 'path' | 'search' | 'filter'>('metrics');
  const [pathSource, setPathSource] = useState('');
  const [pathTarget, setPathTarget] = useState('');
  const [pathResult, setPathResult] = useState<ReturnType<typeof findShortestPath>>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['basic', 'centrality']);

  // Search results
  const searchResults = useMemo(() => {
    if (!currentGraph || !searchQuery) return [];
    return searchEntities(currentGraph, searchQuery).slice(0, 20);
  }, [currentGraph, searchQuery]);

  // Community detection
  const communities = useMemo(() => {
    if (!currentGraph) return new Map<string, number>();
    return detectCommunities(currentGraph);
  }, [currentGraph]);

  const uniqueCommunities = useMemo(() => {
    return new Set(communities.values()).size;
  }, [communities]);

  // Find path handler
  const handleFindPath = () => {
    if (!currentGraph || !pathSource || !pathTarget) return;

    // Find entities by name (case insensitive)
    const sourceEntity = currentGraph.entities.find(
      (e) => e.name.toLowerCase() === pathSource.toLowerCase()
    );
    const targetEntity = currentGraph.entities.find(
      (e) => e.name.toLowerCase() === pathTarget.toLowerCase()
    );

    if (sourceEntity && targetEntity) {
      const result = findShortestPath(currentGraph, sourceEntity.id, targetEntity.id);
      setPathResult(result);

      if (result) {
        setHighlightedPath(result.path);
      } else {
        setHighlightedPath([]);
      }
    }
  };

  // Clear path highlight
  const handleClearPath = () => {
    setPathResult(null);
    setHighlightedPath([]);
    setPathSource('');
    setPathTarget('');
  };

  // Toggle entity type filter
  const toggleEntityTypeFilter = (type: EntityType) => {
    const current = filterEntityTypes;
    if (current.includes(type)) {
      setFilterEntityTypes(current.filter((t) => t !== type));
    } else {
      setFilterEntityTypes([...current, type]);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  const isExpanded = (section: string) => expandedSections.includes(section);

  if (!currentGraph || !metrics) return null;

  return (
    <div className="w-96 bg-slate-800 border-l border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Analysis Tools</h2>
        <button onClick={onClose} className="btn-ghost p-1">
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {[
          { id: 'metrics', icon: BarChart3, label: 'Metrics' },
          { id: 'path', icon: GitBranch, label: 'Paths' },
          { id: 'search', icon: Search, label: 'Search' },
          { id: 'filter', icon: Filter, label: 'Filter' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 p-3 flex items-center justify-center gap-2 text-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-700 text-white border-b-2 border-primary-500'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <tab.icon size={16} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            {/* Basic metrics */}
            <div className="bg-slate-700/50 rounded-lg">
              <button
                onClick={() => toggleSection('basic')}
                className="w-full p-3 flex items-center justify-between text-left"
              >
                <span className="font-medium">Basic Metrics</span>
                {isExpanded('basic') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {isExpanded('basic') && (
                <div className="px-3 pb-3 grid grid-cols-2 gap-3">
                  <MetricCard label="Nodes" value={metrics.nodeCount} />
                  <MetricCard label="Edges" value={metrics.edgeCount} />
                  <MetricCard label="Density" value={(metrics.density * 100).toFixed(2) + '%'} />
                  <MetricCard label="Avg Degree" value={metrics.averageDegree.toFixed(2)} />
                  <MetricCard label="Components" value={metrics.connectedComponents} />
                  <MetricCard label="Isolated" value={metrics.isolatedNodes} />
                  <MetricCard label="Clustering" value={metrics.clusteringCoefficient.toFixed(3)} />
                  <MetricCard label="Communities" value={uniqueCommunities} />
                </div>
              )}
            </div>

            {/* Top nodes by degree */}
            <div className="bg-slate-700/50 rounded-lg">
              <button
                onClick={() => toggleSection('topNodes')}
                className="w-full p-3 flex items-center justify-between text-left"
              >
                <span className="font-medium">Most Connected Nodes</span>
                {isExpanded('topNodes') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {isExpanded('topNodes') && (
                <div className="px-3 pb-3 space-y-2">
                  {metrics.mostConnectedNodes.slice(0, 5).map((node, i) => (
                    <div
                      key={node.id}
                      className="flex items-center justify-between text-sm bg-slate-800 rounded p-2"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-slate-500">{i + 1}.</span>
                        <span className="truncate max-w-[180px]">{node.name}</span>
                      </span>
                      <span className="text-primary-400 font-medium">{node.degree}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Centrality metrics */}
            {centrality && (
              <div className="bg-slate-700/50 rounded-lg">
                <button
                  onClick={() => toggleSection('centrality')}
                  className="w-full p-3 flex items-center justify-between text-left"
                >
                  <span className="font-medium">Centrality Analysis</span>
                  {isExpanded('centrality') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {isExpanded('centrality') && (
                  <div className="px-3 pb-3 space-y-3">
                    <CentralitySection
                      title="PageRank (Influence)"
                      data={centrality.pageRank}
                      entities={currentGraph.entities}
                    />
                    <CentralitySection
                      title="Betweenness (Bridge)"
                      data={centrality.betweenness}
                      entities={currentGraph.entities}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Path Finding Tab */}
        {activeTab === 'path' && (
          <div className="space-y-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h3 className="font-medium mb-3">Find Shortest Path</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">From Entity</label>
                  <input
                    type="text"
                    value={pathSource}
                    onChange={(e) => setPathSource(e.target.value)}
                    placeholder="Enter entity name..."
                    className="input w-full"
                    list="entities-source"
                  />
                  <datalist id="entities-source">
                    {currentGraph.entities.map((e) => (
                      <option key={e.id} value={e.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">To Entity</label>
                  <input
                    type="text"
                    value={pathTarget}
                    onChange={(e) => setPathTarget(e.target.value)}
                    placeholder="Enter entity name..."
                    className="input w-full"
                    list="entities-target"
                  />
                  <datalist id="entities-target">
                    {currentGraph.entities.map((e) => (
                      <option key={e.id} value={e.name} />
                    ))}
                  </datalist>
                </div>

                <div className="flex gap-2">
                  <button onClick={handleFindPath} className="btn-primary flex-1">
                    Find Path
                  </button>
                  <button onClick={handleClearPath} className="btn-secondary">
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Path result */}
            {pathResult && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                <h4 className="font-medium text-green-300 mb-2">
                  Path Found ({pathResult.length} steps)
                </h4>
                <div className="space-y-2">
                  {pathResult.entities.map((entity, i) => (
                    <div key={entity.id} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ENTITY_COLORS[entity.type] }}
                      />
                      <span className="text-sm">{entity.name}</span>
                      {i < pathResult.relationships.length && (
                        <span className="text-xs text-slate-400 ml-auto">
                          → {pathResult.relationships[i].type}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pathResult === null && pathSource && pathTarget && (
              <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4">
                <p className="text-amber-300 text-sm">No path found between these entities.</p>
              </div>
            )}
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entities..."
                className="input w-full pl-10"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((entity) => (
                  <div
                    key={entity.id}
                    className="bg-slate-700/50 rounded-lg p-3 hover:bg-slate-700 cursor-pointer"
                    onClick={() => {
                      useGraphStore.getState().selectNode(entity.id);
                      setHighlightedPath([entity.id]);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ENTITY_COLORS[entity.type] }}
                      />
                      <span className="font-medium">{entity.name}</span>
                      <span className="text-xs text-slate-400 capitalize">{entity.type}</span>
                    </div>
                    {entity.description && (
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                        {entity.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && (
              <p className="text-slate-400 text-center py-8">No entities found</p>
            )}
          </div>
        )}

        {/* Filter Tab */}
        {activeTab === 'filter' && (
          <div className="space-y-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h3 className="font-medium mb-3">Filter by Entity Type</h3>
              <div className="space-y-2">
                {Object.entries(ENTITY_COLORS).map(([type, color]) => {
                  const count = currentGraph.metadata.entityTypes[type as EntityType] || 0;
                  if (count === 0) return null;

                  const isActive = filterEntityTypes.length === 0 || filterEntityTypes.includes(type as EntityType);

                  return (
                    <label
                      key={type}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                        isActive ? 'bg-slate-700' : 'bg-slate-800 opacity-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => toggleEntityTypeFilter(type as EntityType)}
                        className="rounded border-slate-500"
                      />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="flex-1 capitalize">{type}</span>
                      <span className="text-slate-400 text-sm">{count}</span>
                    </label>
                  );
                })}
              </div>

              {filterEntityTypes.length > 0 && (
                <button
                  onClick={() => setFilterEntityTypes([])}
                  className="btn-ghost text-sm w-full mt-3"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-800 rounded p-2">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function CentralitySection({
  title,
  data,
  entities,
}: {
  title: string;
  data: Record<string, number>;
  entities: Array<{ id: string; name: string; type: EntityType }>;
}) {
  const topNodes = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div>
      <h4 className="text-sm text-slate-400 mb-1">{title}</h4>
      <div className="space-y-1">
        {topNodes.map(([id, value]) => {
          const entity = entities.find((e) => e.id === id);
          if (!entity) return null;

          return (
            <div key={id} className="flex items-center justify-between text-sm bg-slate-800 rounded p-2">
              <span className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: ENTITY_COLORS[entity.type] }}
                />
                <span className="truncate max-w-[150px]">{entity.name}</span>
              </span>
              <span className="text-slate-400">{value.toFixed(3)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
