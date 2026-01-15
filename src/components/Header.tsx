import {
  Upload,
  BarChart3,
  FolderOpen,
  Settings,
  Download,
  Share2,
  Layers,
} from 'lucide-react';
import { useGraphStore } from '../stores/graphStore';

interface HeaderProps {
  onToggleUpload: () => void;
  onToggleAnalysis: () => void;
  onToggleSaved: () => void;
  onToggleInsights: () => void;
  onOpenSettings: () => void;
  activePanel: string | null;
  hasExtractionLog?: boolean;
}

export default function Header({
  onToggleUpload,
  onToggleAnalysis,
  onToggleSaved,
  onToggleInsights,
  onOpenSettings,
  activePanel,
  hasExtractionLog,
}: HeaderProps) {
  const { currentGraph, exportGraph, saveGraph, showExtractionInsights } = useGraphStore();

  const handleExport = (format: 'json' | 'csv' | 'graphml') => {
    if (!currentGraph) return;

    const data = exportGraph(format);
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentGraph.name.replace(/\s+/g, '_')}.${format}`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    if (currentGraph) {
      saveGraph(currentGraph);
    }
  };

  const isInsightsActive = activePanel === 'insights' || showExtractionInsights;

  return (
    <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
      {/* Logo and title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
          <Share2 size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">Knowledge Graph Studio</h1>
        </div>
      </div>

      {/* Current graph name */}
      {currentGraph && (
        <div className="hidden md:flex items-center gap-2 text-slate-400">
          <span className="text-sm">{currentGraph.name}</span>
          <span className="text-xs">
            ({currentGraph.metadata.nodeCount} nodes, {currentGraph.metadata.edgeCount} edges)
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleUpload}
          className={`btn-ghost flex items-center gap-2 ${activePanel === 'upload' && !isInsightsActive ? 'bg-slate-700 text-white' : ''}`}
          title="Upload Document"
        >
          <Upload size={18} />
          <span className="hidden sm:inline">Upload</span>
        </button>

        <button
          onClick={onToggleSaved}
          className={`btn-ghost flex items-center gap-2 ${activePanel === 'saved' ? 'bg-slate-700 text-white' : ''}`}
          title="Saved Graphs"
        >
          <FolderOpen size={18} />
          <span className="hidden sm:inline">Saved</span>
        </button>

        {currentGraph && (
          <>
            <button
              onClick={onToggleAnalysis}
              className={`btn-ghost flex items-center gap-2 ${activePanel === 'analysis' && !isInsightsActive ? 'bg-slate-700 text-white' : ''}`}
              title="Analysis Tools"
            >
              <BarChart3 size={18} />
              <span className="hidden sm:inline">Analysis</span>
            </button>

            {hasExtractionLog && (
              <button
                onClick={onToggleInsights}
                className={`btn-ghost flex items-center gap-2 ${isInsightsActive ? 'bg-primary-600 text-white' : ''}`}
                title="Extraction Insights"
              >
                <Layers size={18} />
                <span className="hidden sm:inline">Insights</span>
              </button>
            )}

            <div className="relative group">
              <button
                className="btn-ghost flex items-center gap-2"
                title="Export Graph"
              >
                <Download size={18} />
                <span className="hidden sm:inline">Export</span>
              </button>
              <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => handleExport('json')}
                  className="block w-full text-left px-4 py-2 hover:bg-slate-700 text-sm"
                >
                  Export as JSON
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="block w-full text-left px-4 py-2 hover:bg-slate-700 text-sm"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport('graphml')}
                  className="block w-full text-left px-4 py-2 hover:bg-slate-700 text-sm"
                >
                  Export as GraphML
                </button>
                <hr className="border-slate-700" />
                <button
                  onClick={handleSave}
                  className="block w-full text-left px-4 py-2 hover:bg-slate-700 text-sm"
                >
                  Save to Library
                </button>
              </div>
            </div>
          </>
        )}

        <div className="w-px h-6 bg-slate-700 mx-1" />

        <button
          onClick={onOpenSettings}
          className="btn-ghost"
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
