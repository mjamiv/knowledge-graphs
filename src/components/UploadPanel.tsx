import { useState, useCallback } from 'react';
import {
  X,
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  Zap,
} from 'lucide-react';
import { useGraphStore } from '../stores/graphStore';
import { parseDocument } from '../services/documentParser';
import { extractKnowledgeGraphWithLog } from '../services/openaiExtractor';
import { DocumentInfo, ChunkStatus } from '../types';

interface UploadPanelProps {
  onClose: () => void;
}

export default function UploadPanel({ onClose }: UploadPanelProps) {
  const {
    settings,
    setCurrentGraph,
    saveGraph,
    extractionProgress,
    setExtractionProgress,
    detailedProgress,
    setDetailedProgress,
    addChunkResult,
    clearLiveChunkResults,
    setCurrentExtractionLog,
    saveExtractionLog,
    setShowExtractionInsights,
  } = useGraphStore();

  const [isDragging, setIsDragging] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState<DocumentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  }, []);

  const processFile = async (file: File) => {
    try {
      setExtractionProgress({ stage: 'reading', progress: 5, message: 'Reading document...' });
      const doc = await parseDocument(file);
      setUploadedDoc(doc);
      setExtractionProgress({ stage: 'idle', progress: 0, message: '' });
    } catch (err) {
      setError(`Failed to read file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setExtractionProgress({ stage: 'error', progress: 0, message: 'Failed to read document' });
    }
  };

  const handleExtract = async () => {
    if (!uploadedDoc || !settings.openaiApiKey) return;

    setError(null);
    clearLiveChunkResults();

    try {
      const { graph, log } = await extractKnowledgeGraphWithLog(
        uploadedDoc.content,
        settings.openaiApiKey,
        settings.extractionModel,
        settings.maxEntities,
        uploadedDoc.name,
        uploadedDoc.size,
        {
          onProgress: setExtractionProgress,
          onDetailedProgress: setDetailedProgress,
          onChunkComplete: addChunkResult,
        }
      );

      // Add source document info
      graph.metadata.sourceDocument = uploadedDoc.content.slice(0, 500) + '...';
      graph.metadata.sourceFileName = uploadedDoc.name;
      graph.name = `KG: ${uploadedDoc.name}`;

      // Save extraction log
      setCurrentExtractionLog(log);
      saveExtractionLog(log);

      setCurrentGraph(graph);
      saveGraph(graph);

      // Clear detailed progress
      setDetailedProgress(null);

      // Show insights panel automatically
      setShowExtractionInsights(true);
    } catch (err) {
      setError(`Extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setExtractionProgress({ stage: 'error', progress: 0, message: 'Extraction failed' });
      setDetailedProgress(null);
    }
  };

  const handleViewInsights = () => {
    setShowExtractionInsights(true);
  };

  const isProcessing =
    extractionProgress.stage !== 'idle' &&
    extractionProgress.stage !== 'error' &&
    extractionProgress.stage !== 'complete';

  const getChunkStatusColor = (status: ChunkStatus) => {
    switch (status) {
      case 'success':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'processing':
        return 'bg-yellow-500 animate-pulse';
      default:
        return 'bg-slate-600';
    }
  };

  return (
    <div className="w-96 bg-slate-800 border-l border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Upload Document</h2>
        <button onClick={onClose} className="btn-ghost p-1">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Drop zone */}
        <div
          className={`drop-zone rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging ? 'dragging' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => window.document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".pdf,.docx,.doc,.txt,.md"
            className="hidden"
            onChange={handleFileSelect}
          />

          <Upload size={40} className="mx-auto text-slate-400 mb-4" />
          <p className="text-slate-300 mb-2">Drag and drop a file here</p>
          <p className="text-slate-500 text-sm">or click to browse</p>
          <p className="text-slate-600 text-xs mt-4">Supports PDF, DOCX, TXT, MD</p>
        </div>

        {/* Document info */}
        {uploadedDoc && (
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText size={24} className="text-primary-400 flex-shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{uploadedDoc.name}</p>
                <p className="text-sm text-slate-400">
                  {(uploadedDoc.size / 1024).toFixed(1)} KB
                  {uploadedDoc.pageCount && ` • ${uploadedDoc.pageCount} pages`}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {uploadedDoc.content.length.toLocaleString()} characters
                </p>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-4">
              <p className="text-xs text-slate-400 mb-2">Preview:</p>
              <div className="bg-slate-800 rounded p-3 text-sm text-slate-300 max-h-40 overflow-y-auto">
                {uploadedDoc.content.slice(0, 500)}
                {uploadedDoc.content.length > 500 && '...'}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Progress */}
        {isProcessing && detailedProgress && (
          <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
            {/* Main progress */}
            <div className="flex items-center gap-3">
              <Loader2 size={20} className="text-primary-400 spinner" />
              <span className="text-sm text-slate-300 flex-1">{extractionProgress.message}</span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ width: `${extractionProgress.progress}%` }}
              />
            </div>

            {/* Chunk progress */}
            {detailedProgress.chunkStatuses && detailedProgress.totalChunks && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Chunk {detailedProgress.currentChunk || 0}/{detailedProgress.totalChunks}
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap size={12} className="text-primary-400" />
                    {detailedProgress.entitiesFound || 0} entities found
                  </span>
                </div>

                {/* Chunk status indicators */}
                <div className="flex gap-1">
                  {detailedProgress.chunkStatuses.map((status, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1.5 rounded ${getChunkStatusColor(status)}`}
                      title={`Chunk ${i + 1}: ${status}`}
                    />
                  ))}
                </div>

                {/* Current chunk preview */}
                {detailedProgress.currentChunkPreview && (
                  <div className="text-xs text-slate-500 truncate">
                    Processing: "{detailedProgress.currentChunkPreview}"
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Simple Progress fallback */}
        {isProcessing && !detailedProgress && (
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 size={20} className="text-primary-400 spinner" />
              <span className="text-sm text-slate-300">{extractionProgress.message}</span>
            </div>
            <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ width: `${extractionProgress.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success message */}
        {extractionProgress.stage === 'complete' && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle size={20} className="text-green-400" />
              <span className="text-green-300 flex-1">{extractionProgress.message}</span>
            </div>
            <button
              onClick={handleViewInsights}
              className="w-full btn-secondary text-sm flex items-center justify-center gap-2"
            >
              <Eye size={16} />
              View Extraction Details
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}

        {/* API key warning */}
        {!settings.openaiApiKey && (
          <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4">
            <p className="text-amber-300 text-sm">
              Please configure your OpenAI API key in Settings to extract knowledge graphs.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={handleExtract}
          disabled={!uploadedDoc || !settings.openaiApiKey || isProcessing}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 size={18} className="spinner" />
              Processing...
            </>
          ) : (
            <>
              <Upload size={18} />
              Extract Knowledge Graph
            </>
          )}
        </button>
      </div>
    </div>
  );
}
