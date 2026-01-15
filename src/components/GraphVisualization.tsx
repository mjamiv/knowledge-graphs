import { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import ForceGraph2D from 'react-force-graph-2d';
import SpriteText from 'three-spritetext';
import { useGraphStore } from '../stores/graphStore';
import { ENTITY_COLORS, GraphData, GraphNode, GraphLink } from '../types';
import { ZoomIn, ZoomOut, Maximize, RotateCcw, Layers } from 'lucide-react';

const GRAPH_BASE_COLOR = '#0b1220';

// Extended node type with position properties from force-graph
interface ForceGraphNode extends GraphNode {
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
}

type LinkDatum = GraphLink & { source: GraphNode | string; target: GraphNode | string };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex: string) => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6 && clean.length !== 3) return null;
  const normalized = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const num = Number.parseInt(normalized, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((c) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, '0')).join('')}`;

const blendColors = (colorA: string, colorB: string, amount: number) => {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  if (!a || !b) return colorA;
  const mix = clamp(amount, 0, 1);
  return rgbToHex(
    a.r + (b.r - a.r) * mix,
    a.g + (b.g - a.g) * mix,
    a.b + (b.b - a.b) * mix
  );
};

const withAlpha = (color: string, alpha: number) => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1)})`;
};

const getNodeId = (node: GraphNode | string) => (typeof node === 'string' ? node : node.id);

const makeLinkKey = (sourceId: string, type: string, targetId: string) =>
  `${sourceId}::${type}::${targetId}`;

const getCurveControlPoint = (source: { x: number; y: number }, target: { x: number; y: number }, curvature: number) => {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.hypot(dx, dy) || 1;
  const offset = curvature * distance;
  return {
    x: (source.x + target.x) / 2 + (dy / distance) * offset,
    y: (source.y + target.y) / 2 - (dx / distance) * offset,
  };
};

export default function GraphVisualization() {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLinkKey, setHoveredLinkKey] = useState<string | null>(null);

  const {
    currentGraph,
    settings,
    selectedNode,
    highlightedPath,
    filterEntityTypes,
    searchQuery,
    selectNode,
  } = useGraphStore();

  const highlightedSet = useMemo(() => new Set(highlightedPath), [highlightedPath]);

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
      const isHighlighted = highlightedSet.has(entity.id);
      const isSelected = entity.id === selectedNode;
      const baseSize = settings.nodeSize === 'small' ? 4 : settings.nodeSize === 'large' ? 12 : 8;
      const emphasis = isSelected ? 1.8 : isHighlighted ? 1.4 : 1;

      return {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        val: baseSize * emphasis,
        color: ENTITY_COLORS[entity.type],
        description: entity.description,
      };
    });

    const relationships = currentGraph.relationships.filter((r) => entityIds.has(r.source) && entityIds.has(r.target));

    const pairCounts = new Map<string, number>();
    const pairIndex = new Map<string, number>();
    relationships.forEach((rel) => {
      const key = [rel.source, rel.target].sort().join('::');
      pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
    });

    // Create links
    const links: GraphLink[] = relationships.map((rel) => {
      const key = [rel.source, rel.target].sort().join('::');
      const index = pairIndex.get(key) || 0;
      pairIndex.set(key, index + 1);
      const count = pairCounts.get(key) || 1;
      const offset = count > 1 ? (index - (count - 1) / 2) * 0.18 : 0.06;
      const direction = rel.source < rel.target ? 1 : -1;

      return {
        source: rel.source,
        target: rel.target,
        type: rel.type,
        color: '#475569',
        curvature: offset * direction,
      };
    });

    return { nodes, links };
  }, [currentGraph, filterEntityTypes, searchQuery, highlightedSet, selectedNode, settings.nodeSize]);

  const nodeById = useMemo(() => {
    const map = new Map<string, GraphNode>();
    graphData.nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [graphData.nodes]);

  const relationshipCounts = useMemo(
    () => currentGraph?.metadata.relationshipTypes || {},
    [currentGraph]
  );

  const adjacency = useMemo(() => {
    const neighbors = new Map<string, Set<string>>();
    const linksByNode = new Map<string, Set<string>>();
    const linkIndex = new Map<string, { source: string; target: string; type: string }>();

    graphData.links.forEach((link) => {
      const source = link.source as string;
      const target = link.target as string;
      const key = makeLinkKey(source, link.type, target);

      linkIndex.set(key, { source, target, type: link.type });

      if (!neighbors.has(source)) neighbors.set(source, new Set());
      if (!neighbors.has(target)) neighbors.set(target, new Set());
      neighbors.get(source)!.add(target);
      neighbors.get(target)!.add(source);

      if (!linksByNode.has(source)) linksByNode.set(source, new Set());
      if (!linksByNode.has(target)) linksByNode.set(target, new Set());
      linksByNode.get(source)!.add(key);
      linksByNode.get(target)!.add(key);
    });

    return { neighbors, linksByNode, linkIndex };
  }, [graphData.links]);

  const focusState = useMemo(() => {
    const activeNodes = new Set<string>();
    const activeLinks = new Set<string>();
    let info: { title: string; subtitle?: string; mode: string; nodes: number; edges: number } | null = null;

    const focusNodeId = selectedNode || hoveredNodeId;
    if (focusNodeId) {
      activeNodes.add(focusNodeId);
      const neighbors = adjacency.neighbors.get(focusNodeId) || new Set();
      neighbors.forEach((id) => activeNodes.add(id));
      const links = adjacency.linksByNode.get(focusNodeId) || new Set();
      links.forEach((key) => activeLinks.add(key));
      const name = nodeById.get(focusNodeId)?.name || 'Node';
      info = {
        title: name,
        mode: selectedNode ? 'Selected node' : 'Hovered node',
        nodes: neighbors.size,
        edges: links.size,
      };
    }

    if (hoveredLinkKey) {
      const linkInfo = adjacency.linkIndex.get(hoveredLinkKey);
      if (linkInfo) {
        activeLinks.add(hoveredLinkKey);
        activeNodes.add(linkInfo.source);
        activeNodes.add(linkInfo.target);
        if (!info) {
          const sourceName = nodeById.get(linkInfo.source)?.name || 'Source';
          const targetName = nodeById.get(linkInfo.target)?.name || 'Target';
          info = {
            title: linkInfo.type.replace(/_/g, ' '),
            subtitle: `${sourceName} -> ${targetName}`,
            mode: 'Hovered link',
            nodes: 2,
            edges: 1,
          };
        }
      }
    }

    return {
      hasFocus: activeNodes.size > 0 || activeLinks.size > 0,
      activeNodes,
      activeLinks,
      info,
    };
  }, [selectedNode, hoveredNodeId, hoveredLinkKey, adjacency, nodeById]);

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

  const handleNodeHover = useCallback((node?: ForceGraphNode | null) => {
    setHoveredNodeId(node ? node.id : null);
  }, []);

  const handleLinkHover = useCallback((link?: LinkDatum | null) => {
    if (!link) {
      setHoveredLinkKey(null);
      return;
    }
    const sourceId = getNodeId(link.source);
    const targetId = getNodeId(link.target);
    setHoveredLinkKey(makeLinkKey(sourceId, link.type, targetId));
  }, []);

  const getNodeRenderColor = useCallback((node: GraphNode) => {
    let color = ENTITY_COLORS[node.type];
    if (node.id === selectedNode) {
      color = '#f8fafc';
    } else if (highlightedSet.has(node.id)) {
      color = '#fbbf24';
    }
    if (focusState.hasFocus && !focusState.activeNodes.has(node.id)) {
      color = blendColors(color, GRAPH_BASE_COLOR, 0.7);
    } else if (focusState.hasFocus && focusState.activeNodes.has(node.id) && node.id !== selectedNode) {
      color = blendColors(color, '#ffffff', 0.12);
    }
    return color;
  }, [focusState, highlightedSet, selectedNode]);

  const getLinkColor = useCallback((link: LinkDatum) => {
    const sourceId = getNodeId(link.source);
    const targetId = getNodeId(link.target);
    const sourceType = nodeById.get(sourceId)?.type || 'other';
    const targetType = nodeById.get(targetId)?.type || 'other';
    let base = blendColors(ENTITY_COLORS[sourceType], ENTITY_COLORS[targetType], 0.5);

    const linkKey = makeLinkKey(sourceId, link.type, targetId);
    const isPath = highlightedSet.has(sourceId) && highlightedSet.has(targetId);
    if (isPath) {
      base = '#fbbf24';
    } else if (focusState.hasFocus && !focusState.activeLinks.has(linkKey)) {
      base = blendColors(base, GRAPH_BASE_COLOR, 0.75);
    } else if (focusState.activeLinks.has(linkKey)) {
      base = blendColors(base, '#ffffff', 0.12);
    }

    return base;
  }, [focusState, highlightedSet, nodeById]);

  const getLinkWidth = useCallback((link: LinkDatum) => {
    const count = relationshipCounts[link.type] || 1;
    const base = 0.8 + Math.log2(count + 1) * 0.6;
    const sourceId = getNodeId(link.source);
    const targetId = getNodeId(link.target);
    const linkKey = makeLinkKey(sourceId, link.type, targetId);
    const isPath = highlightedSet.has(sourceId) && highlightedSet.has(targetId);
    const isActive = focusState.activeLinks.has(linkKey);
    return clamp(base + (isPath ? 1.6 : 0) + (isActive ? 1.1 : 0), 0.8, 6);
  }, [focusState, highlightedSet, relationshipCounts]);

  const getLinkParticleCount = useCallback((link: LinkDatum) => {
    const sourceId = getNodeId(link.source);
    const targetId = getNodeId(link.target);
    const linkKey = makeLinkKey(sourceId, link.type, targetId);
    if (highlightedSet.has(sourceId) && highlightedSet.has(targetId)) return 4;
    if (focusState.activeLinks.has(linkKey)) return 2;
    return 0;
  }, [focusState, highlightedSet]);

  const getLinkParticleSpeed = useCallback((link: LinkDatum) => {
    const sourceId = getNodeId(link.source);
    const targetId = getNodeId(link.target);
    const linkKey = makeLinkKey(sourceId, link.type, targetId);
    if (highlightedSet.has(sourceId) && highlightedSet.has(targetId)) return 0.03;
    if (focusState.activeLinks.has(linkKey)) return 0.02;
    return 0.01;
  }, [focusState, highlightedSet]);

  const getLinkParticleColor = useCallback((link: LinkDatum) => {
    return withAlpha(getLinkColor(link), 0.85);
  }, [getLinkColor]);

  // Node label for 3D - returns SpriteText for labels
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeThreeObject = useCallback(
    (node: ForceGraphNode): any => {
      if (!settings.showLabels) return undefined;
      const sprite = new SpriteText(node.name);
      sprite.color = getNodeRenderColor(node);
      sprite.textHeight = 4;
      sprite.backgroundColor = 'rgba(0,0,0,0.6)';
      sprite.padding = 2;
      sprite.borderRadius = 3;
      return sprite;
    },
    [getNodeRenderColor, settings.showLabels]
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
    nodeLabel: (node: GraphNode) => {
      const degree = adjacency.neighbors.get(node.id)?.size || 0;
      return `${node.name}\n(${node.type})\nConnections: ${degree}`;
    },
    nodeColor: getNodeRenderColor,
    nodeVal: (node: GraphNode) => {
      const base = node.val || 6;
      if (!focusState.hasFocus) return base;
      return focusState.activeNodes.has(node.id) ? base * 1.1 : base * 0.7;
    },
    linkColor: getLinkColor,
    linkWidth: getLinkWidth,
    linkCurvature: (link: GraphLink) => link.curvature || 0,
    linkDirectionalArrowLength: 5,
    linkDirectionalArrowRelPos: 1,
    linkDirectionalParticles: getLinkParticleCount,
    linkDirectionalParticleWidth: (link: LinkDatum) => (getLinkParticleCount(link) ? 2.2 : 0),
    linkDirectionalParticleSpeed: getLinkParticleSpeed,
    linkDirectionalParticleColor: getLinkParticleColor,
    onNodeClick: handleNodeClick,
    onNodeHover: handleNodeHover,
    onLinkHover: handleLinkHover,
    backgroundColor: 'rgba(0,0,0,0)',
    width: dimensions.width,
    height: dimensions.height,
    linkLabel: settings.showRelationshipLabels
      ? (link: LinkDatum) => {
        const sourceId = getNodeId(link.source);
        const targetId = getNodeId(link.target);
        const sourceName = nodeById.get(sourceId)?.name || sourceId;
        const targetName = nodeById.get(targetId)?.name || targetId;
        return `${sourceName} -> ${targetName}\n${link.type}`;
      }
      : undefined,
  };

  const linkCanvasObject = useCallback(
    (link: LinkDatum, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const source = link.source as ForceGraphNode;
      const target = link.target as ForceGraphNode;
      if (source.x === undefined || source.y === undefined || target.x === undefined || target.y === undefined) return;

      const sourceId = getNodeId(link.source);
      const targetId = getNodeId(link.target);
      const linkKey = makeLinkKey(sourceId, link.type, targetId);
      const isActive = focusState.activeLinks.has(linkKey);
      const isPath = highlightedSet.has(sourceId) && highlightedSet.has(targetId);

      const sourceColor = getNodeRenderColor(nodeById.get(sourceId) || {
        id: sourceId,
        name: sourceId,
        type: 'other',
        val: 6,
        color: ENTITY_COLORS.other,
      });
      const targetColor = getNodeRenderColor(nodeById.get(targetId) || {
        id: targetId,
        name: targetId,
        type: 'other',
        val: 6,
        color: ENTITY_COLORS.other,
      });

      const gradient = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
      const alpha = isActive || isPath ? 0.5 : 0.25;
      gradient.addColorStop(0, withAlpha(sourceColor, alpha));
      gradient.addColorStop(1, withAlpha(targetColor, alpha));

      const scale = globalScale || 1;
      const width = getLinkWidth(link) / Math.max(1, Math.sqrt(scale));
      const curvature = link.curvature || 0;

      ctx.save();
      ctx.lineWidth = width + (isActive || isPath ? 1 : 0);
      ctx.strokeStyle = gradient;
      if (isActive || isPath) {
        ctx.shadowColor = withAlpha('#38bdf8', 0.6);
        ctx.shadowBlur = 12;
      }
      ctx.beginPath();
      if (Math.abs(curvature) > 0.01) {
        const control = getCurveControlPoint(source, target, curvature);
        ctx.moveTo(source.x, source.y);
        ctx.quadraticCurveTo(control.x, control.y, target.x, target.y);
      } else {
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
      }
      ctx.stroke();
      ctx.restore();
    },
    [focusState.activeLinks, getLinkWidth, getNodeRenderColor, highlightedSet, nodeById]
  );

  return (
    <div ref={containerRef} className="graph-container graph-surface relative">
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
            const nodeColor = getNodeRenderColor(node);
            const isActive = focusState.activeNodes.has(node.id);

            // Draw node
            ctx.beginPath();
            ctx.arc(node.x || 0, node.y || 0, node.val || 5, 0, 2 * Math.PI);
            ctx.fillStyle = nodeColor;
            ctx.fill();

            if (isActive) {
              ctx.beginPath();
              ctx.arc(node.x || 0, node.y || 0, (node.val || 5) + 3, 0, 2 * Math.PI);
              ctx.strokeStyle = withAlpha('#38bdf8', 0.6);
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
            }

            // Draw label
            if (settings.showLabels && globalScale > 0.5) {
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = focusState.hasFocus && !focusState.activeNodes.has(node.id)
                ? withAlpha('#e2e8f0', 0.5)
                : '#f8fafc';
              ctx.fillText(label, node.x || 0, (node.y || 0) + (node.val || 5) + fontSize);
            }
          }}
          linkCanvasObject={linkCanvasObject}
          linkCanvasObjectMode={() => 'after'}
        />
      )}

      {/* Controls overlay */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/70 rounded-lg shadow-lg backdrop-blur"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/70 rounded-lg shadow-lg backdrop-blur"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <button
          onClick={handleFitToScreen}
          className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/70 rounded-lg shadow-lg backdrop-blur"
          title="Fit to Screen"
        >
          <Maximize size={20} />
        </button>
        <button
          onClick={handleReset}
          className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/70 rounded-lg shadow-lg backdrop-blur"
          title="Reset View"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Focus overlay */}
      {focusState.info && (
        <div className="absolute top-4 right-4 bg-slate-900/85 border border-slate-700/70 rounded-lg px-3 py-2 shadow-lg backdrop-blur z-10 max-w-xs">
          <div className="text-[11px] uppercase tracking-wider text-slate-400">
            {focusState.info.mode}
          </div>
          <div className="text-sm font-semibold text-slate-100 truncate">{focusState.info.title}</div>
          {focusState.info.subtitle && (
            <div className="text-xs text-slate-400 truncate">{focusState.info.subtitle}</div>
          )}
          <div className="mt-2 flex gap-3 text-xs text-slate-300">
            <span>{focusState.info.nodes} nodes</span>
            <span>{focusState.info.edges} links</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/85 border border-slate-700/70 rounded-lg p-3 shadow-lg backdrop-blur z-10">
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
        <div className="mt-3 pt-3 border-t border-slate-700/70 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-10 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-indigo-400" />
            <span>Link color blends connected types</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 w-10 rounded-full bg-slate-500" />
            <span>Line width reflects relationship frequency</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 w-10 rounded-full bg-slate-500 relative">
              <span className="absolute right-0 top-1/2 -translate-y-1/2 h-1 w-1 bg-sky-300 rounded-full" />
            </div>
            <span>Particles show direction</span>
          </div>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 left-4 bg-slate-900/85 border border-slate-700/70 rounded-lg px-3 py-2 shadow-lg text-sm backdrop-blur z-10">
        <span className="text-slate-400">Showing: </span>
        <span className="font-medium">{graphData.nodes.length}</span>
        <span className="text-slate-400"> nodes, </span>
        <span className="font-medium">{graphData.links.length}</span>
        <span className="text-slate-400"> edges</span>
      </div>
    </div>
  );
}
