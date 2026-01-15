import { X, Trash2, Share2, Calendar, Hash } from 'lucide-react';
import { useGraphStore } from '../stores/graphStore';

interface SidebarProps {
  onClose: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { savedGraphs, currentGraph, loadGraph, deleteGraph } = useGraphStore();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Saved Graphs</h2>
        <button onClick={onClose} className="btn-ghost p-1">
          <X size={20} />
        </button>
      </div>

      {/* Graph list */}
      <div className="flex-1 overflow-y-auto p-2">
        {savedGraphs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Share2 size={40} className="mx-auto mb-3 opacity-50" />
            <p>No saved graphs yet</p>
            <p className="text-sm mt-1">Upload a document to create one</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedGraphs.map((graph) => (
              <div
                key={graph.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  currentGraph?.id === graph.id
                    ? 'bg-primary-600/20 border border-primary-500/30'
                    : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'
                }`}
                onClick={() => loadGraph(graph.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">{graph.name}</h3>
                    {graph.description && (
                      <p className="text-sm text-slate-400 truncate">{graph.description}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this graph?')) {
                        deleteGraph(graph.id);
                      }
                    }}
                    className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors"
                    title="Delete graph"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Hash size={12} />
                    {graph.metadata.nodeCount} nodes
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(graph.createdAt)}
                  </span>
                </div>

                {/* Entity type breakdown */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(graph.metadata.entityTypes)
                    .filter(([, count]) => count > 0)
                    .slice(0, 4)
                    .map(([type, count]) => (
                      <span
                        key={type}
                        className={`badge bg-entity-${type}/20 text-entity-${type}`}
                      >
                        {count} {type}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import button */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                const text = await file.text();
                useGraphStore.getState().importGraph(text, 'json');
              }
            };
            input.click();
          }}
          className="btn-secondary w-full"
        >
          Import Graph (JSON)
        </button>
      </div>
    </div>
  );
}
