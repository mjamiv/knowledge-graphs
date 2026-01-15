import { useMemo } from 'react';
import {
  X,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Layers,
  GitMerge,
  ChevronDown,
  ChevronRight,
  Zap,
  Database,
} from 'lucide-react';
import { useGraphStore } from '../stores/graphStore';
import { ENTITY_COLORS, EntityType, ChunkStatus } from '../types';
import { useState } from 'react';

interface ExtractionInsightsProps {
  onClose: () => void;
}

export default function ExtractionInsights({ onClose }: ExtractionInsightsProps) {
  const { currentExtractionLog, currentGraph, liveChunkResults, detailedProgress } = useGraphStore();
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'overview' | 'chunks' | 'timeline' | 'provenance'>('overview');

  // Use live results during extraction, or log results after completion
  const log = currentExtractionLog;
  const isExtracting = detailedProgress && detailedProgress.stage === 'extracting';

  const chunkResults = isExtracting ? liveChunkResults : (log?.chunkResults || []);

  const toggleChunk = (index: number) => {
    setExpandedChunks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (!log) return null;

    const entityTypeBreakdown: Record<EntityType, number> = {
      person: 0,
      organization: 0,
      location: 0,
      concept: 0,
      event: 0,
      technology: 0,
      document: 0,
      date: 0,
      other: 0,
    };

    currentGraph?.entities.forEach((e) => {
      entityTypeBreakdown[e.type]++;
    });

    const topRelTypes = Object.entries(currentGraph?.metadata.relationshipTypes || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return {
      entityTypeBreakdown,
      topRelTypes,
      chunkSuccessRate: log.totalChunks > 0
        ? ((log.chunksSucceeded / log.totalChunks) * 100).toFixed(0)
        : '0',
      avgEntitiesPerChunk: log.chunksSucceeded > 0
        ? (log.mergeStats.rawEntityCount / log.chunksSucceeded).toFixed(1)
        : '0',
      avgRelPerChunk: log.chunksSucceeded > 0
        ? (log.mergeStats.rawRelationshipCount / log.chunksSucceeded).toFixed(1)
        : '0',
    };
  }, [log, currentGraph]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getStatusIcon = (status: ChunkStatus) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={14} className="text-green-400" />;
      case 'failed':
        return <XCircle size={14} className="text-red-400" />;
      case 'processing':
        return <Zap size={14} className="text-yellow-400 animate-pulse" />;
      default:
        return <Clock size={14} className="text-slate-400" />;
    }
  };

  const getStatusColor = (status: ChunkStatus) => {
    switch (status) {
      case 'success':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'processing':
        return 'bg-yellow-500';
      default:
        return 'bg-slate-600';
    }
  };

  if (!log && !isExtracting) {
    return (
      <div className="w-96 bg-slate-800 border-l border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Extraction Insights</h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-500 p-8 text-center">
          <div>
            <Database size={40} className="mx-auto mb-3 opacity-50" />
            <p>No extraction data available</p>
            <p className="text-sm mt-1">Upload a document to see extraction details</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[450px] bg-slate-800 border-l border-slate-700 flex flex-col max-h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Layers size={20} className="text-primary-400" />
          Extraction Insights
        </h2>
        <button onClick={onClose} className="btn-ghost p-1">
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {(['overview', 'chunks', 'timeline', 'provenance'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Overview Tab */}
        {activeTab === 'overview' && log && (
          <div className="p-4 space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">Processing Time</div>
                <div className="text-xl font-semibold">
                  {formatDuration(log.totalDurationMs || 0)}
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">Chunk Success Rate</div>
                <div className="text-xl font-semibold text-green-400">
                  {summary?.chunkSuccessRate}%
                </div>
              </div>
            </div>

            {/* Document Info */}
            <div className="bg-slate-700/30 rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <FileText size={14} />
                Source Document
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">File</span>
                  <span className="truncate ml-2 max-w-[200px]">{log.documentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Characters</span>
                  <span>{log.documentCharCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Chunks</span>
                  <span>{log.totalChunks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Model</span>
                  <span>{log.model}</span>
                </div>
              </div>
            </div>

            {/* Merge Statistics */}
            <div className="bg-slate-700/30 rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <GitMerge size={14} />
                Merge Statistics
              </h3>
              <div className="space-y-3">
                {/* Entities flow */}
                <div>
                  <div className="text-xs text-slate-400 mb-1">Entities</div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="bg-slate-600 px-2 py-1 rounded">
                      {log.mergeStats.rawEntityCount} raw
                    </span>
                    <span className="text-slate-500">→</span>
                    <span className="bg-slate-600 px-2 py-1 rounded">
                      {log.mergeStats.uniqueEntityCount} unique
                    </span>
                    <span className="text-slate-500">→</span>
                    <span className="bg-primary-600 px-2 py-1 rounded">
                      {log.mergeStats.filteredEntityCount} final
                    </span>
                  </div>
                  {log.mergeStats.duplicateEntitiesMerged > 0 && (
                    <div className="text-xs text-slate-500 mt-1">
                      {log.mergeStats.duplicateEntitiesMerged} duplicates merged
                    </div>
                  )}
                </div>

                {/* Relationships flow */}
                <div>
                  <div className="text-xs text-slate-400 mb-1">Relationships</div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="bg-slate-600 px-2 py-1 rounded">
                      {log.mergeStats.rawRelationshipCount} raw
                    </span>
                    <span className="text-slate-500">→</span>
                    <span className="bg-primary-600 px-2 py-1 rounded">
                      {log.mergeStats.uniqueRelationshipCount} final
                    </span>
                  </div>
                  {log.mergeStats.relationshipsDropped > 0 && (
                    <div className="text-xs text-slate-500 mt-1">
                      {log.mergeStats.relationshipsDropped} dropped (unresolved/self-ref/dupe)
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Entity Type Breakdown */}
            {summary && (
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h3 className="text-sm font-medium mb-3">Entity Types</h3>
                <div className="space-y-2">
                  {Object.entries(summary.entityTypeBreakdown)
                    .filter(([, count]) => count > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: ENTITY_COLORS[type as EntityType] }}
                        />
                        <span className="capitalize flex-1">{type}</span>
                        <span className="text-slate-400">{count}</span>
                        <div className="w-20 h-2 bg-slate-600 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(count / log.finalEntityCount) * 100}%`,
                              backgroundColor: ENTITY_COLORS[type as EntityType],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Warnings & Errors */}
            {(log.warnings.length > 0 || log.errors.length > 0) && (
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-400" />
                  Warnings & Errors
                </h3>
                <div className="space-y-2 text-sm">
                  {log.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-red-400">
                      <XCircle size={14} className="mt-0.5 flex-shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                  {log.warnings.map((warn, i) => (
                    <div key={i} className="flex items-start gap-2 text-amber-400">
                      <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chunks Tab */}
        {activeTab === 'chunks' && (
          <div className="p-4 space-y-3">
            {/* Chunk progress bar */}
            <div className="flex gap-1 mb-4">
              {(log?.chunkResults || chunkResults).map((_, i) => {
                const result = chunkResults[i];
                return (
                  <div
                    key={i}
                    className={`flex-1 h-2 rounded ${getStatusColor(result?.status || 'pending')}`}
                    title={`Chunk ${i + 1}: ${result?.status || 'pending'}`}
                  />
                );
              })}
            </div>

            {/* Chunk list */}
            {chunkResults.map((result, i) => (
              <div
                key={i}
                className="bg-slate-700/30 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleChunk(i)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-slate-700/50 transition-colors"
                >
                  {expandedChunks.has(i) ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                  {getStatusIcon(result.status)}
                  <span className="font-medium">Chunk {i + 1}</span>
                  <span className="text-slate-400 text-sm">
                    {result.contentLength.toLocaleString()} chars
                  </span>
                  <span className="ml-auto text-sm">
                    {result.entitiesExtracted} entities, {result.relationshipsExtracted} rels
                  </span>
                  {result.durationMs && (
                    <span className="text-slate-500 text-sm">
                      {formatDuration(result.durationMs)}
                    </span>
                  )}
                </button>

                {expandedChunks.has(i) && (
                  <div className="p-3 pt-0 border-t border-slate-700 space-y-3">
                    {/* Content preview */}
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Content Preview</div>
                      <div className="bg-slate-800 rounded p-2 text-xs text-slate-300 max-h-32 overflow-y-auto">
                        {result.contentPreview}...
                      </div>
                    </div>

                    {/* Extracted entities */}
                    {result.entities.length > 0 && (
                      <div>
                        <div className="text-xs text-slate-400 mb-1">
                          Extracted Entities ({result.entities.length})
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {result.entities.slice(0, 15).map((e, j) => (
                            <span
                              key={j}
                              className="px-2 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor: `${ENTITY_COLORS[e.type]}30`,
                                color: ENTITY_COLORS[e.type],
                              }}
                            >
                              {e.name}
                            </span>
                          ))}
                          {result.entities.length > 15 && (
                            <span className="px-2 py-0.5 text-xs text-slate-500">
                              +{result.entities.length - 15} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Error message */}
                    {result.error && (
                      <div className="text-sm text-red-400 bg-red-500/10 rounded p-2">
                        {result.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && log && (
          <div className="p-4">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-700" />

              {/* Timeline events */}
              <div className="space-y-4">
                {log.timeline.map((event, i) => (
                  <div key={i} className="flex gap-3 relative">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                        event.stage === 'complete'
                          ? 'bg-green-500'
                          : event.stage === 'error'
                          ? 'bg-red-500'
                          : 'bg-slate-600'
                      }`}
                    >
                      {event.stage === 'complete' ? (
                        <CheckCircle size={12} />
                      ) : event.stage === 'error' ? (
                        <XCircle size={12} />
                      ) : (
                        <Clock size={12} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{event.message}</div>
                      <div className="text-xs text-slate-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                      {event.details && (
                        <div className="mt-1 text-xs text-slate-400 bg-slate-700/30 rounded p-2">
                          {Object.entries(event.details).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-slate-500">{key}:</span>{' '}
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Provenance Tab */}
        {activeTab === 'provenance' && log && (
          <div className="p-4 space-y-3">
            <div className="text-sm text-slate-400 mb-2">
              Shows which chunks each entity was extracted from
            </div>
            {log.entityProvenance
              .sort((a, b) => b.mentionCount - a.mentionCount)
              .slice(0, 50)
              .map((prov) => {
                const entity = currentGraph?.entities.find((e) => e.id === prov.entityId);
                if (!entity) return null;

                return (
                  <div
                    key={prov.entityId}
                    className="bg-slate-700/30 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ENTITY_COLORS[entity.type] }}
                      />
                      <span className="font-medium">{prov.entityName}</span>
                      <span className="text-xs text-slate-500 capitalize">({entity.type})</span>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div>
                        Mentioned in {prov.mentionCount} chunk{prov.mentionCount > 1 ? 's' : ''}:{' '}
                        <span className="text-slate-300">
                          {prov.sourceChunks.map((c) => `#${c + 1}`).join(', ')}
                        </span>
                      </div>
                      {prov.originalDescriptions.length > 0 && (
                        <div className="text-slate-500">
                          Descriptions: {prov.originalDescriptions.join(' | ')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
