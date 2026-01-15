import { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import ForceGraph2D from 'react-force-graph-2d';
import SpriteText from 'three-spritetext';
import { useGraphStore } from '../stores/graphStore';
import { ENTITY_COLORS, GraphData, GraphNode, GraphLink } from '../types';
import { ZoomIn, ZoomOut, Maximize, RotateCcw, Layers } from 'lucide-react';

// Extended node type with position properties from force-graph
interface ForceGraphNode extends GraphNode {
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
}

export default function GraphVisualization() {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const {
    currentGraph,
    settings,
    selectedNode,
    highlightedPath,
    filterEntityTypes,
    searchQuery,
    selectNode,
  } = useGraphStore();

  // Calculate container dimensions
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }
  }, []);

  // Update dimensions on mount and resize
  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  // Transform graph data for visualization
  const graphData: GraphData = useMemo(() => {
    if (!currentGraph) return { nodes: [], links: [] };

    const searchLower = searchQuery.toLowerCase();

    // Filter entities
    let filteredEntities = currentGraph.entities;

    if (filterEntityTypes.length > 0) {
      filteredEntities = filteredEntities.filter((e) =>
        filterEntityTypes.includes(e.type)
      );
    }

    if (searchQuery) {
      filteredEntities = filteredEntities.filter(
        (e) =>
          e.name.toLowerCase().includes(searchLower) ||
          e.description?.toLowerCase().includes(searchLower)
      );
    }

    const entityIds = new Set(filteredEntities.map((e) => e.id));

    // Create nodes
    const nodes: GraphNode[] = filteredEntities.map((entity) => {
      const isHighlighted = highlightedPath.includes(entity.id);
      const isSelected = entity.id === selectedNode;
      const baseSize = settings.nodeSize === 'small' ? 4 : settings.nodeSize === 'large' ? 12 : 8;

      return {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        val: isSelected ? baseSize * 2 : isHighlighted ? baseSize * 1.5 : baseSize,
        color: isSelected
          ? '#ffffff'
          : isHighlighted
          ? '#fbbf24'
          : ENTITY_COLORS[entity.type],
        description: entity.description,
      };
    });

    // Create links
    const links: GraphLink[] = currentGraph.relationships
      .filter((r) => entityIds.has(r.source) && entityIds.has(r.target))
      .map((rel) => ({
        source: rel.source,
        target: rel.target,
        type: rel.type,
        color:
          highlightedPath.includes(rel.source) && highlightedPath.includes(rel.target)
            ? '#fbbf24'
            : '#475569',
        curvature: 0.2,
      }));

    return { nodes, links };
  }, [currentGraph, filterEntityTypes, searchQuery, highlightedPath, selectedNode, settings.nodeSize]);

  // Handle node click
  const handleNodeClick = useCallback((node: ForceGraphNode) => {
    selectNode(node.id === selectedNode ? null : node.id);

    // Focus on node
    if (graphRef.current && settings.visualizationMode === '3d') {
      const distance = 200;
      const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0);

      graphRef.current.cameraPosition(
        {
          x: (node.x || 0) * distRatio,
          y: (node.y || 0) * distRatio,
          z: (node.z || 0) * distRatio,
        },
        node,
        1000
      );
    }
  }, [selectedNode, selectNode, settings.visualizationMode]);

  // Node label for 3D - returns SpriteText for labels
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeThreeObject = useCallback(
    (node: ForceGraphNode): any => {
      if (!settings.showLabels) return undefined;
      const sprite = new SpriteText(node.name);
      sprite.color = node.color;
      sprite.textHeight = 4;
      sprite.backgroundColor = 'rgba(0,0,0,0.6)';
      sprite.padding = 2;
      sprite.borderRadius = 3;
      return sprite;
    },
    [settings.showLabels]
  );

  // Controls
  const handleZoomIn = () => {
    if (graphRef.current) {
      if (settings.visualizationMode === '3d') {
        graphRef.current.zoomToFit(400, 50);
      } else {
        graphRef.current.zoom(graphRef.current.zoom() * 1.5, 300);
      }
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      if (settings.visualizationMode === '3d') {
        graphRef.current.zoomToFit(400, 200);
      } else {
        graphRef.current.zoom(graphRef.current.zoom() * 0.7, 300);
      }
    }
  };

  const handleReset = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
      if (settings.visualizationMode === '3d') {
        graphRef.current.cameraPosition({ x: 0, y: 0, z: 500 }, { x: 0, y: 0, z: 0 }, 1000);
      }
    }
  };

  const handleFitToScreen = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 50);
    }
  };

  // Common props
  const commonProps = {
    ref: graphRef,
    graphData,
    nodeId: 'id',
    nodeLabel: (node: GraphNode) => `${node.name}\n(${node.type})`,
    nodeColor: (node: GraphNode) => node.color,
    nodeVal: (node: GraphNode) => node.val,
    linkColor: (link: GraphLink) => link.color,
    linkWidth: 1,
    linkCurvature: (link: GraphLink) => link.curvature || 0,
    linkDirectionalArrowLength: 4,
    linkDirectionalArrowRelPos: 1,
    onNodeClick: handleNodeClick,
    backgroundColor: '#0f172a',
    width: dimensions.width,
    height: dimensions.height,
  };

  return (
    <div ref={containerRef} className="graph-container relative">
      {settings.visualizationMode === '3d' ? (
        <ForceGraph3D
          {...commonProps}
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={true}
          linkOpacity={0.6}
          enableNodeDrag={true}
          enableNavigationControls={true}
        />
      ) : (
        <ForceGraph2D
          {...commonProps}
          nodeCanvasObject={(node: ForceGraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.name;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;

            // Draw node
            ctx.beginPath();
            ctx.arc(node.x || 0, node.y || 0, node.val || 5, 0, 2 * Math.PI);
            ctx.fillStyle = node.color;
            ctx.fill();

            // Draw label
            if (settings.showLabels && globalScale > 0.5) {
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#fff';
              ctx.fillText(label, node.x || 0, (node.y || 0) + (node.val || 5) + fontSize);
            }
          }}
          linkLabel={settings.showRelationshipLabels ? (link: GraphLink) => link.type : undefined}
        />
      )}

      {/* Controls overlay */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg shadow-lg"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg shadow-lg"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <button
          onClick={handleFitToScreen}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg shadow-lg"
          title="Fit to Screen"
        >
          <Maximize size={20} />
        </button>
        <button
          onClick={handleReset}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg shadow-lg"
          title="Reset View"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-800/90 rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 mb-2 text-sm font-medium">
          <Layers size={14} />
          <span>Entity Types</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {Object.entries(ENTITY_COLORS).map(([type, color]) => {
            const count = currentGraph?.metadata.entityTypes[type as keyof typeof ENTITY_COLORS] || 0;
            if (count === 0) return null;
            return (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="capitalize">{type}</span>
                <span className="text-slate-500">({count})</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 left-4 bg-slate-800/90 rounded-lg px-3 py-2 shadow-lg text-sm">
        <span className="text-slate-400">Showing: </span>
        <span className="font-medium">{graphData.nodes.length}</span>
        <span className="text-slate-400"> nodes, </span>
        <span className="font-medium">{graphData.links.length}</span>
        <span className="text-slate-400"> edges</span>
      </div>
    </div>
  );
}
