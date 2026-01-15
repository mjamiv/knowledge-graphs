import { useMemo } from 'react';
import { X, Link, ArrowRight, ArrowLeft } from 'lucide-react';
import { useGraphStore } from '../stores/graphStore';
import { ENTITY_COLORS } from '../types';

export default function NodeDetails() {
  const {
    currentGraph,
    selectedNode,
    selectNode,
    setHighlightedPath,
    centrality,
  } = useGraphStore();

  const entity = useMemo(() => {
    if (!currentGraph || !selectedNode) return null;
    return currentGraph.entities.find((e) => e.id === selectedNode);
  }, [currentGraph, selectedNode]);

  const connections = useMemo(() => {
    if (!currentGraph || !selectedNode) return { incoming: [], outgoing: [] };

    const incoming = currentGraph.relationships
      .filter((r) => r.target === selectedNode)
      .map((r) => ({
        relationship: r,
        entity: currentGraph.entities.find((e) => e.id === r.source),
      }))
      .filter((c) => c.entity);

    const outgoing = currentGraph.relationships
      .filter((r) => r.source === selectedNode)
      .map((r) => ({
        relationship: r,
        entity: currentGraph.entities.find((e) => e.id === r.target),
      }))
      .filter((c) => c.entity);

    return { incoming, outgoing };
  }, [currentGraph, selectedNode]);

  if (!entity) return null;

  const entityCentrality = centrality
    ? {
        degree: centrality.degree[entity.id] || 0,
        betweenness: centrality.betweenness[entity.id] || 0,
        pageRank: centrality.pageRank[entity.id] || 0,
      }
    : null;

  const handleClose = () => {
    selectNode(null);
    setHighlightedPath([]);
  };

  const handleConnectionClick = (entityId: string) => {
    selectNode(entityId);
    setHighlightedPath([selectedNode!, entityId]);
  };

  return (
    <div className="absolute top-4 right-4 w-80 bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div
        className="p-4 border-b border-slate-700"
        style={{ backgroundColor: `${ENTITY_COLORS[entity.type]}20` }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: ENTITY_COLORS[entity.type] }}
              />
              <span
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: ENTITY_COLORS[entity.type] }}
              >
                {entity.type}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white break-words">{entity.name}</h3>
          </div>
          <button onClick={handleClose} className="btn-ghost p-1 flex-shrink-0">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {/* Description */}
        {entity.description && (
          <div className="mb-4">
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
              Description
            </h4>
            <p className="text-sm text-slate-300">{entity.description}</p>
          </div>
        )}

        {/* Centrality metrics */}
        {entityCentrality && (
          <div className="mb-4">
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              Centrality
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-700/50 rounded p-2 text-center">
                <div className="text-xs text-slate-400">Degree</div>
                <div className="text-sm font-medium">{(entityCentrality.degree * 100).toFixed(1)}%</div>
              </div>
              <div className="bg-slate-700/50 rounded p-2 text-center">
                <div className="text-xs text-slate-400">Betweenness</div>
                <div className="text-sm font-medium">{(entityCentrality.betweenness * 100).toFixed(1)}%</div>
              </div>
              <div className="bg-slate-700/50 rounded p-2 text-center">
                <div className="text-xs text-slate-400">PageRank</div>
                <div className="text-sm font-medium">{(entityCentrality.pageRank * 100).toFixed(1)}%</div>
              </div>
            </div>
          </div>
        )}

        {/* Connections */}
        <div>
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
            <Link size={12} />
            Connections ({connections.incoming.length + connections.outgoing.length})
          </h4>

          {/* Incoming */}
          {connections.incoming.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                <ArrowRight size={10} />
                Incoming ({connections.incoming.length})
              </div>
              <div className="space-y-1">
                {connections.incoming.slice(0, 5).map(({ relationship, entity: connEntity }) => (
                  <button
                    key={relationship.id}
                    onClick={() => connEntity && handleConnectionClick(connEntity.id)}
                    className="w-full text-left bg-slate-700/50 hover:bg-slate-700 rounded p-2 flex items-center gap-2 text-sm transition-colors"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ENTITY_COLORS[connEntity!.type] }}
                    />
                    <span className="truncate flex-1">{connEntity!.name}</span>
                    <span className="text-xs text-slate-400 truncate max-w-[80px]">
                      {relationship.type}
                    </span>
                  </button>
                ))}
                {connections.incoming.length > 5 && (
                  <div className="text-xs text-slate-500 text-center py-1">
                    +{connections.incoming.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Outgoing */}
          {connections.outgoing.length > 0 && (
            <div>
              <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                <ArrowLeft size={10} />
                Outgoing ({connections.outgoing.length})
              </div>
              <div className="space-y-1">
                {connections.outgoing.slice(0, 5).map(({ relationship, entity: connEntity }) => (
                  <button
                    key={relationship.id}
                    onClick={() => connEntity && handleConnectionClick(connEntity.id)}
                    className="w-full text-left bg-slate-700/50 hover:bg-slate-700 rounded p-2 flex items-center gap-2 text-sm transition-colors"
                  >
                    <span className="text-xs text-slate-400 truncate max-w-[80px]">
                      {relationship.type}
                    </span>
                    <span className="truncate flex-1">{connEntity!.name}</span>
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ENTITY_COLORS[connEntity!.type] }}
                    />
                  </button>
                ))}
                {connections.outgoing.length > 5 && (
                  <div className="text-xs text-slate-500 text-center py-1">
                    +{connections.outgoing.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}

          {connections.incoming.length === 0 && connections.outgoing.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No connections</p>
          )}
        </div>
      </div>
    </div>
  );
}
