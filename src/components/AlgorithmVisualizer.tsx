import { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  X,
  Lightbulb,
} from 'lucide-react';
import { AlgorithmStep, KnowledgeGraph } from '../types';
import { generateBFSSteps, generatePageRankSteps } from '../utils/graphAnalysis';
import { ALGORITHM_EXPLANATIONS } from '../data/metricExplanations';

interface AlgorithmVisualizerProps {
  graph: KnowledgeGraph;
  algorithm: 'bfs' | 'pagerank' | 'louvain';
  sourceId?: string;
  targetId?: string;
  onHighlightNodes: (nodeIds: string[]) => void;
  onHighlightEdges: (edgeIds: string[]) => void;
  onClose: () => void;
}

export function AlgorithmVisualizer({
  graph,
  algorithm,
  sourceId,
  targetId,
  onHighlightNodes,
  onHighlightEdges,
  onClose,
}: AlgorithmVisualizerProps) {
  const [steps, setSteps] = useState<AlgorithmStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // ms per step

  // Generate steps when algorithm or parameters change
  useEffect(() => {
    let generatedSteps: AlgorithmStep[] = [];

    switch (algorithm) {
      case 'bfs':
        if (sourceId && targetId) {
          generatedSteps = generateBFSSteps(graph, sourceId, targetId);
        }
        break;
      case 'pagerank':
        generatedSteps = generatePageRankSteps(graph, 10);
        break;
      // Add more algorithms as needed
    }

    setSteps(generatedSteps);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [graph, algorithm, sourceId, targetId]);

  // Apply current step's highlights
  useEffect(() => {
    if (steps.length === 0) return;

    const currentStep = steps[currentStepIndex];
    if (currentStep) {
      onHighlightNodes(currentStep.highlightedNodes);
      onHighlightEdges(currentStep.highlightedEdges);
    }
  }, [currentStepIndex, steps, onHighlightNodes, onHighlightEdges]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || currentStepIndex >= steps.length - 1) {
      if (currentStepIndex >= steps.length - 1) {
        setIsPlaying(false);
      }
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStepIndex((prev) => prev + 1);
    }, playbackSpeed);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, steps.length, playbackSpeed]);

  const handlePlayPause = useCallback(() => {
    if (currentStepIndex >= steps.length - 1) {
      // Restart if at end
      setCurrentStepIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [currentStepIndex, steps.length]);

  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const handleStepBack = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
    onHighlightNodes([]);
    onHighlightEdges([]);
  }, [onHighlightNodes, onHighlightEdges]);

  const currentStep = steps[currentStepIndex];
  const algorithmInfo = ALGORITHM_EXPLANATIONS[algorithm];

  if (steps.length === 0) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-6 w-[500px] z-50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Algorithm Visualizer</h3>
          <button onClick={onClose} className="btn-ghost p-1">
            <X size={20} />
          </button>
        </div>
        <p className="text-slate-400 text-center py-4">
          {algorithm === 'bfs'
            ? 'Select source and target nodes to visualize BFS pathfinding.'
            : 'No steps generated for this algorithm.'}
        </p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-[600px] z-50">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex justify-between items-center">
        <div>
          <h3 className="font-semibold">{algorithmInfo?.name || algorithm.toUpperCase()}</h3>
          <p className="text-xs text-slate-400">{algorithmInfo?.shortDescription}</p>
        </div>
        <button onClick={onClose} className="btn-ghost p-1">
          <X size={20} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-slate-400">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Current step description */}
      <div className="p-4 border-b border-slate-700">
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-sm">{currentStep?.description || 'Initializing...'}</p>

          {/* Show node values for PageRank */}
          {currentStep?.nodeValues && Object.keys(currentStep.nodeValues).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(currentStep.nodeValues)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([nodeId, value]) => {
                  const entity = graph.entities.find((e) => e.id === nodeId);
                  return (
                    <span
                      key={nodeId}
                      className="text-xs bg-slate-800 px-2 py-0.5 rounded"
                    >
                      {entity?.name || nodeId}: {value.toFixed(4)}
                    </span>
                  );
                })}
            </div>
          )}

          {/* Show metadata */}
          {currentStep?.metadata && (
            <div className="mt-2 text-xs text-slate-400">
              {currentStep.metadata.found !== undefined && (
                <span className={currentStep.metadata.found ? 'text-green-400' : 'text-amber-400'}>
                  {currentStep.metadata.found ? 'Path found!' : 'Searching...'}
                </span>
              )}
              {Array.isArray(currentStep.metadata.queue) && (
                <span className="ml-2">
                  Queue size: {currentStep.metadata.queue.length}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Playback controls */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="btn-ghost p-2"
            title="Reset"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={handleStepBack}
            className="btn-ghost p-2"
            disabled={currentStepIndex === 0}
            title="Previous step"
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={handlePlayPause}
            className="btn-primary p-2"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            onClick={handleStepForward}
            className="btn-ghost p-2"
            disabled={currentStepIndex >= steps.length - 1}
            title="Next step"
          >
            <SkipForward size={18} />
          </button>
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Speed:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="select text-sm py-1"
          >
            <option value={2000}>0.5x</option>
            <option value={1000}>1x</option>
            <option value={500}>2x</option>
            <option value={250}>4x</option>
          </select>
        </div>
      </div>

      {/* Agent relevance section */}
      {algorithmInfo && (
        <div className="px-4 pb-4">
          <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-3">
            <h4 className="text-xs font-medium text-primary-300 mb-1 flex items-center gap-1">
              <Lightbulb size={12} />
              Why Agents Use This
            </h4>
            <p className="text-xs text-slate-300">{algorithmInfo.agentRelevance}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component to trigger algorithm visualization from AnalysisPanel
interface AlgorithmVisualizerTriggerProps {
  onClick: () => void;
  label: string;
}

export function AlgorithmVisualizerTrigger({ onClick, label }: AlgorithmVisualizerTriggerProps) {
  return (
    <button
      onClick={onClick}
      className="text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
    >
      <Play size={12} />
      Visualize {label}
    </button>
  );
}
