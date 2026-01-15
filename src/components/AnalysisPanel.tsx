import { useState, useMemo } from 'react';
import {
  X,
  Search,
  GitBranch,
  BarChart3,
  Filter,
  ChevronDown,
  ChevronRight,
  Network,
  Lightbulb,
  ArrowRightLeft,
} from 'lucide-react';
import { useGraphStore } from '../stores/graphStore';
import {
  findShortestPath,
  findWeightedShortestPath,
  detectCommunitiesLouvain,
  searchEntities,
  calculateDirectedCentrality,
  calculateTopologyMetrics,
  calculateEigenvectorCentrality,
  calculateHarmonicCentrality,
  calculateKatzCentrality,
  predictLinks,
} from '../utils/graphAnalysis';
import { ENTITY_COLORS, EntityType, WeightedPathResult, PathResult } from '../types';
import { MetricTooltip } from './MetricTooltip';

interface AnalysisPanelProps {
  onClose: () => void;
}

type TabType = 'metrics' | 'path' | 'search' | 'filter' | 'predict';

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

  const [activeTab, setActiveTab] = useState<TabType>('metrics');
  const [pathSource, setPathSource] = useState('');
  const [pathTarget, setPathTarget] = useState('');
  const [pathResult, setPathResult] = useState<PathResult | WeightedPathResult | null>(null);
  const [useWeightedPath, setUseWeightedPath] = useState(false);
  const [invertWeight, setInvertWeight] = useState(true);
  const [expandedSections, setExpandedSections] = useState<string[]>(['basic', 'centrality']);
  const [linkPredictionMethod, setLinkPredictionMethod] = useState<'common_neighbors' | 'jaccard' | 'preferential_attachment' | 'adamic_adar'>('common_neighbors');

  // Search results
  const searchResults = useMemo(() => {
    if (!currentGraph || !searchQuery) return [];
    return searchEntities(currentGraph, searchQuery).slice(0, 20);
  }, [currentGraph, searchQuery]);

  // Community detection (Louvain)
  const communityResult = useMemo(() => {
    if (!currentGraph) return null;
    return detectCommunitiesLouvain(currentGraph);
  }, [currentGraph]);

  // Directed centrality
  const directedCentrality = useMemo(() => {
    if (!currentGraph) return null;
    return calculateDirectedCentrality(currentGraph);
  }, [currentGraph]);

  // Topology metrics
  const topology = useMemo(() => {
    if (!currentGraph) return null;
    return calculateTopologyMetrics(currentGraph);
  }, [currentGraph]);

  // Extended centrality metrics
  const extendedCentrality = useMemo(() => {
    if (!currentGraph) return null;
    return {
      eigenvector: calculateEigenvectorCentrality(currentGraph),
      harmonic: calculateHarmonicCentrality(currentGraph),
      katz: calculateKatzCentrality(currentGraph),
    };
  }, [currentGraph]);

  // Link predictions
  const linkPredictions = useMemo(() => {
    if (!currentGraph) return [];
    return predictLinks(currentGraph, linkPredictionMethod, 10);
  }, [currentGraph, linkPredictionMethod]);

  // Find path handler
  const handleFindPath = () => {
    if (!currentGraph || !pathSource || !pathTarget) return;

    const sourceEntity = currentGraph.entities.find(
      (e) => e.name.toLowerCase() === pathSource.toLowerCase()
    );
    const targetEntity = currentGraph.entities.find(
      (e) => e.name.toLowerCase() === pathTarget.toLowerCase()
    );

    if (sourceEntity && targetEntity) {
      let result;
      if (useWeightedPath) {
        result = findWeightedShortestPath(currentGraph, sourceEntity.id, targetEntity.id, {
          useWeight: true,
          invertWeight,
          defaultWeight: 1,
        });
      } else {
        result = findShortestPath(currentGraph, sourceEntity.id, targetEntity.id);
      }
      setPathResult(result);

      if (result) {
        setHighlightedPath(result.path);
      } else {
        setHighlightedPath([]);
      }
    }
  };

  const handleClearPath = () => {
    setPathResult(null);
    setHighlightedPath([]);
    setPathSource('');
    setPathTarget('');
  };

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

  const tabs: Array<{ id: TabType; icon: typeof BarChart3; label: string }> = [
    { id: 'metrics', icon: BarChart3, label: 'Metrics' },
    { id: 'path', icon: GitBranch, label: 'Paths' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'filter', icon: Filter, label: 'Filter' },
    { id: 'predict', icon: Lightbulb, label: 'Predict' },
  ];

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
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 p-3 flex items-center justify-center gap-1.5 text-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-700 text-white border-b-2 border-primary-500'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <tab.icon size={14} />
            <span className="hidden sm:inline text-xs">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            {/* Basic metrics */}
            <CollapsibleSection
              title="Basic Metrics"
              isExpanded={isExpanded('basic')}
              onToggle={() => toggleSection('basic')}
            >
              <div className="grid grid-cols-2 gap-2">
                <MetricCard label="Nodes" value={metrics.nodeCount} metricKey="nodeCount" />
                <MetricCard label="Edges" value={metrics.edgeCount} metricKey="edgeCount" />
                <MetricCard label="Density" value={(metrics.density * 100).toFixed(2) + '%'} metricKey="density" />
                <MetricCard label="Avg Degree" value={metrics.averageDegree.toFixed(2)} metricKey="averageDegree" />
                <MetricCard label="Components" value={metrics.connectedComponents} metricKey="connectedComponents" />
                <MetricCard label="Isolated" value={metrics.isolatedNodes} metricKey="isolatedNodes" />
                <MetricCard label="Clustering" value={metrics.clusteringCoefficient.toFixed(3)} metricKey="clusteringCoefficient" />
                <MetricCard label="Communities" value={communityResult?.communityCount || 0} metricKey="communityCount" />
              </div>
            </CollapsibleSection>

            {/* Topology metrics */}
            {topology && (
              <CollapsibleSection
                title="Network Topology"
                isExpanded={isExpanded('topology')}
                onToggle={() => toggleSection('topology')}
              >
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard label="Diameter" value={topology.diameter} metricKey="diameter" />
                  <MetricCard label="Radius" value={topology.radius} metricKey="radius" />
                  <MetricCard label="Avg Path" value={topology.averagePathLength.toFixed(2)} metricKey="averagePathLength" />
                  {communityResult && (
                    <MetricCard label="Modularity" value={communityResult.modularity.toFixed(3)} metricKey="modularity" />
                  )}
                </div>
                {topology.centerNodes.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-400 mb-1">Center Nodes (best query start):</p>
                    <div className="flex flex-wrap gap-1">
                      {topology.centerNodes.slice(0, 3).map((id) => {
                        const entity = currentGraph.entities.find((e) => e.id === id);
                        return entity ? (
                          <span key={id} className="text-xs bg-slate-700 px-2 py-0.5 rounded">
                            {entity.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </CollapsibleSection>
            )}

            {/* Top nodes by degree */}
            <CollapsibleSection
              title="Most Connected Nodes"
              isExpanded={isExpanded('topNodes')}
              onToggle={() => toggleSection('topNodes')}
            >
              <div className="space-y-1.5">
                {metrics.mostConnectedNodes.slice(0, 5).map((node, i) => (
                  <div
                    key={node.id}
                    className="flex items-center justify-between text-sm bg-slate-800 rounded p-2"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-slate-500 w-4">{i + 1}.</span>
                      <span className="truncate max-w-[160px]">{node.name}</span>
                    </span>
                    <span className="text-primary-400 font-medium">{node.degree}</span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* Directed Centrality */}
            {directedCentrality && (
              <CollapsibleSection
                title="Directed Centrality"
                isExpanded={isExpanded('directed')}
                onToggle={() => toggleSection('directed')}
                icon={<ArrowRightLeft size={14} className="text-cyan-400" />}
              >
                <div className="space-y-3">
                  <CentralitySection
                    title="In-Degree (Authorities)"
                    data={directedCentrality.inDegree}
                    entities={currentGraph.entities}
                    metricKey="inDegree"
                  />
                  <CentralitySection
                    title="Out-Degree (Hubs)"
                    data={directedCentrality.outDegree}
                    entities={currentGraph.entities}
                    metricKey="outDegree"
                  />
                </div>
              </CollapsibleSection>
            )}

            {/* Standard Centrality */}
            {centrality && (
              <CollapsibleSection
                title="Centrality Analysis"
                isExpanded={isExpanded('centrality')}
                onToggle={() => toggleSection('centrality')}
              >
                <div className="space-y-3">
                  <CentralitySection
                    title="PageRank (Influence)"
                    data={centrality.pageRank}
                    entities={currentGraph.entities}
                    metricKey="pageRank"
                  />
                  <CentralitySection
                    title="Betweenness (Bridge)"
                    data={centrality.betweenness}
                    entities={currentGraph.entities}
                    metricKey="betweenness"
                  />
                  <CentralitySection
                    title="Closeness (Reach)"
                    data={centrality.closeness}
                    entities={currentGraph.entities}
                    metricKey="closeness"
                  />
                </div>
              </CollapsibleSection>
            )}

            {/* Extended Centrality */}
            {extendedCentrality && (
              <CollapsibleSection
                title="Advanced Centrality"
                isExpanded={isExpanded('extendedCentrality')}
                onToggle={() => toggleSection('extendedCentrality')}
                icon={<Network size={14} className="text-purple-400" />}
              >
                <div className="space-y-3">
                  <CentralitySection
                    title="Eigenvector"
                    data={extendedCentrality.eigenvector}
                    entities={currentGraph.entities}
                    metricKey="eigenvector"
                  />
                  <CentralitySection
                    title="Harmonic"
                    data={extendedCentrality.harmonic}
                    entities={currentGraph.entities}
                    metricKey="harmonic"
                  />
                  <CentralitySection
                    title="Katz"
                    data={extendedCentrality.katz}
                    entities={currentGraph.entities}
                    metricKey="katz"
                  />
                </div>
              </CollapsibleSection>
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

                {/* Weighted path options */}
                <div className="bg-slate-800 rounded p-3 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useWeightedPath}
                      onChange={(e) => setUseWeightedPath(e.target.checked)}
                      className="rounded border-slate-500"
                    />
                    <span className="text-sm">Use weighted pathfinding</span>
                    <MetricTooltip metricKey="weightedPath">
                      <span className="text-xs text-slate-400">(Dijkstra)</span>
                    </MetricTooltip>
                  </label>

                  {useWeightedPath && (
                    <label className="flex items-center gap-2 cursor-pointer ml-5">
                      <input
                        type="checkbox"
                        checked={invertWeight}
                        onChange={(e) => setInvertWeight(e.target.checked)}
                        className="rounded border-slate-500"
                      />
                      <span className="text-xs text-slate-400">
                        Invert weights (high confidence = shorter path)
                      </span>
                    </label>
                  )}
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
                  {'totalWeight' in pathResult && (
                    <span className="text-xs ml-2 text-green-400">
                      Total weight: {pathResult.totalWeight.toFixed(3)}
                    </span>
                  )}
                </h4>
                <div className="space-y-2">
                  {pathResult.entities.map((entity, i) => (
                    <div key={entity.id} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: ENTITY_COLORS[entity.type] }}
                      />
                      <span className="text-sm truncate">{entity.name}</span>
                      {i < pathResult.relationships.length && (
                        <span className="text-xs text-slate-400 ml-auto shrink-0">
                          → {pathResult.relationships[i].type}
                          {'weights' in pathResult && pathResult.weights[i] !== undefined && (
                            <span className="text-cyan-400 ml-1">
                              ({pathResult.weights[i].toFixed(2)})
                            </span>
                          )}
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

            {/* Agent insight */}
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-3">
              <h4 className="text-sm font-medium text-primary-300 mb-1 flex items-center gap-2">
                <Lightbulb size={14} />
                Why Agents Use Paths
              </h4>
              <p className="text-xs text-slate-300">
                Agents traverse knowledge graph paths to chain reasoning steps. The shortest path
                provides the most direct explanation for "how X relates to Y". Weighted paths prefer
                high-confidence relationships for reliable answers.
              </p>
            </div>
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

        {/* Link Prediction Tab */}
        {activeTab === 'predict' && (
          <div className="space-y-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h3 className="font-medium mb-3">Link Prediction</h3>
              <p className="text-xs text-slate-400 mb-3">
                Predict missing relationships based on graph structure.
              </p>

              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-1">Prediction Method</label>
                <select
                  value={linkPredictionMethod}
                  onChange={(e) => setLinkPredictionMethod(e.target.value as typeof linkPredictionMethod)}
                  className="select w-full"
                >
                  <option value="common_neighbors">Common Neighbors</option>
                  <option value="jaccard">Jaccard Coefficient</option>
                  <option value="preferential_attachment">Preferential Attachment</option>
                  <option value="adamic_adar">Adamic-Adar Index</option>
                </select>
              </div>

              {linkPredictions.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm text-slate-400">Top Predicted Links:</h4>
                  {linkPredictions.map((prediction, i) => (
                    <div
                      key={`${prediction.source}-${prediction.target}`}
                      className="bg-slate-800 rounded p-2 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 w-5">{i + 1}.</span>
                        <span className="flex-1 truncate">{prediction.sourceName}</span>
                        <span className="text-slate-400 mx-2">↔</span>
                        <span className="flex-1 truncate text-right">{prediction.targetName}</span>
                      </div>
                      <div className="text-xs text-cyan-400 text-right mt-1">
                        Score: {prediction.score.toFixed(3)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm text-center py-4">
                  No link predictions available
                </p>
              )}
            </div>

            {/* Agent insight */}
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-3">
              <h4 className="text-sm font-medium text-primary-300 mb-1 flex items-center gap-2">
                <Lightbulb size={14} />
                Why Agents Use Link Prediction
              </h4>
              <p className="text-xs text-slate-300">
                Link prediction helps agents identify implicit relationships not explicitly stated
                in source documents. When answering questions, agents can suggest likely connections
                and explain the reasoning: "A and B may be related because they share connections to X, Y, Z."
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Collapsible section component
function CollapsibleSection({
  title,
  isExpanded,
  onToggle,
  children,
  icon,
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-slate-700/50 rounded-lg">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between text-left"
      >
        <span className="font-medium flex items-center gap-2">
          {icon}
          {title}
        </span>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {isExpanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function MetricCard({
  label,
  value,
  metricKey,
}: {
  label: string;
  value: string | number;
  metricKey?: string;
}) {
  const content = (
    <div className="bg-slate-800 rounded p-2">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-lg font-semibold text-white">{value}</div>
    </div>
  );

  if (metricKey) {
    return <MetricTooltip metricKey={metricKey}>{content}</MetricTooltip>;
  }

  return content;
}

function CentralitySection({
  title,
  data,
  entities,
  metricKey,
}: {
  title: string;
  data: Record<string, number>;
  entities: Array<{ id: string; name: string; type: EntityType }>;
  metricKey?: string;
}) {
  const topNodes = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const titleContent = (
    <h4 className="text-sm text-slate-400 mb-1">{title}</h4>
  );

  return (
    <div>
      {metricKey ? (
        <MetricTooltip metricKey={metricKey}>{titleContent}</MetricTooltip>
      ) : (
        titleContent
      )}
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
                <span className="truncate max-w-[140px]">{entity.name}</span>
              </span>
              <span className="text-slate-400">{value.toFixed(3)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
