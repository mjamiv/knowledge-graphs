import {
  KnowledgeGraph,
  GraphMetrics,
  CentralityMetrics,
  PathResult,
  Entity,
  Relationship,
} from '../types';

/**
 * Calculate basic graph metrics
 */
export function calculateMetrics(graph: KnowledgeGraph): GraphMetrics {
  const { entities, relationships } = graph;
  const nodeCount = entities.length;
  const edgeCount = relationships.length;

  // Build adjacency map
  const adjacency = new Map<string, Set<string>>();
  entities.forEach((e) => adjacency.set(e.id, new Set()));

  relationships.forEach((r) => {
    adjacency.get(r.source)?.add(r.target);
    adjacency.get(r.target)?.add(r.source);
  });

  // Calculate degrees
  const degrees: number[] = [];
  const degreeMap = new Map<string, number>();
  const degreeDistribution: Record<number, number> = {};

  adjacency.forEach((neighbors, nodeId) => {
    const degree = neighbors.size;
    degrees.push(degree);
    degreeMap.set(nodeId, degree);
    degreeDistribution[degree] = (degreeDistribution[degree] || 0) + 1;
  });

  const maxDegree = Math.max(...degrees, 0);
  const minDegree = Math.min(...degrees, 0);
  const averageDegree = nodeCount > 0 ? degrees.reduce((a, b) => a + b, 0) / nodeCount : 0;

  // Calculate density
  const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
  const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

  // Find connected components using BFS
  const visited = new Set<string>();
  let connectedComponents = 0;

  entities.forEach((entity) => {
    if (!visited.has(entity.id)) {
      connectedComponents++;
      const queue = [entity.id];
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        adjacency.get(current)?.forEach((neighbor) => {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        });
      }
    }
  });

  // Count isolated nodes
  const isolatedNodes = degrees.filter((d) => d === 0).length;

  // Find most connected nodes
  const nodesByDegree = entities
    .map((e) => ({
      id: e.id,
      name: e.name,
      degree: degreeMap.get(e.id) || 0,
    }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 10);

  // Calculate clustering coefficient (average local clustering)
  let totalClustering = 0;
  let clusterableNodes = 0;

  entities.forEach((entity) => {
    const neighbors = Array.from(adjacency.get(entity.id) || []);
    if (neighbors.length < 2) return;

    clusterableNodes++;
    let triangles = 0;
    const possibleTriangles = (neighbors.length * (neighbors.length - 1)) / 2;

    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        if (adjacency.get(neighbors[i])?.has(neighbors[j])) {
          triangles++;
        }
      }
    }

    totalClustering += triangles / possibleTriangles;
  });

  const clusteringCoefficient = clusterableNodes > 0 ? totalClustering / clusterableNodes : 0;

  return {
    nodeCount,
    edgeCount,
    density,
    averageDegree,
    maxDegree,
    minDegree,
    connectedComponents,
    isolatedNodes,
    mostConnectedNodes: nodesByDegree,
    degreeDistribution,
    clusteringCoefficient,
  };
}

/**
 * Calculate centrality metrics for all nodes
 */
export function calculateCentrality(graph: KnowledgeGraph): CentralityMetrics {
  const { entities, relationships } = graph;

  // Build adjacency map
  const adjacency = new Map<string, Set<string>>();
  entities.forEach((e) => adjacency.set(e.id, new Set()));

  relationships.forEach((r) => {
    adjacency.get(r.source)?.add(r.target);
    adjacency.get(r.target)?.add(r.source);
  });

  // Degree centrality (normalized)
  const degree: Record<string, number> = {};
  const maxDegree = entities.length - 1;

  entities.forEach((e) => {
    const nodeDegree = adjacency.get(e.id)?.size || 0;
    degree[e.id] = maxDegree > 0 ? nodeDegree / maxDegree : 0;
  });

  // Betweenness centrality (Brandes algorithm - simplified)
  const betweenness: Record<string, number> = {};
  entities.forEach((e) => (betweenness[e.id] = 0));

  entities.forEach((source) => {
    const stack: string[] = [];
    const predecessors = new Map<string, string[]>();
    const sigma = new Map<string, number>();
    const distance = new Map<string, number>();

    entities.forEach((e) => {
      predecessors.set(e.id, []);
      sigma.set(e.id, 0);
      distance.set(e.id, -1);
    });

    sigma.set(source.id, 1);
    distance.set(source.id, 0);

    const queue = [source.id];

    while (queue.length > 0) {
      const v = queue.shift()!;
      stack.push(v);

      adjacency.get(v)?.forEach((w) => {
        if (distance.get(w) === -1) {
          queue.push(w);
          distance.set(w, distance.get(v)! + 1);
        }

        if (distance.get(w) === distance.get(v)! + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          predecessors.get(w)!.push(v);
        }
      });
    }

    const delta = new Map<string, number>();
    entities.forEach((e) => delta.set(e.id, 0));

    while (stack.length > 0) {
      const w = stack.pop()!;
      predecessors.get(w)!.forEach((v) => {
        const contribution = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
        delta.set(v, delta.get(v)! + contribution);
      });

      if (w !== source.id) {
        betweenness[w] += delta.get(w)!;
      }
    }
  });

  // Normalize betweenness
  const n = entities.length;
  const normFactor = n > 2 ? 2 / ((n - 1) * (n - 2)) : 1;
  Object.keys(betweenness).forEach((key) => {
    betweenness[key] *= normFactor;
  });

  // Closeness centrality
  const closeness: Record<string, number> = {};

  entities.forEach((source) => {
    const distances = bfsDistances(source.id, adjacency);
    let totalDistance = 0;
    let reachable = 0;

    distances.forEach((dist) => {
      if (dist > 0 && dist < Infinity) {
        totalDistance += dist;
        reachable++;
      }
    });

    closeness[source.id] = reachable > 0 ? reachable / totalDistance : 0;
  });

  // PageRank (simplified power iteration)
  const pageRank: Record<string, number> = {};
  const damping = 0.85;
  const iterations = 20;

  // Initialize
  entities.forEach((e) => (pageRank[e.id] = 1 / entities.length));

  for (let i = 0; i < iterations; i++) {
    const newRank: Record<string, number> = {};

    entities.forEach((e) => {
      let sum = 0;
      adjacency.get(e.id)?.forEach((neighbor) => {
        const neighborDegree = adjacency.get(neighbor)?.size || 1;
        sum += pageRank[neighbor] / neighborDegree;
      });

      newRank[e.id] = (1 - damping) / entities.length + damping * sum;
    });

    Object.assign(pageRank, newRank);
  }

  return { degree, betweenness, closeness, pageRank };
}

/**
 * BFS to calculate distances from a source node
 */
function bfsDistances(source: string, adjacency: Map<string, Set<string>>): Map<string, number> {
  const distances = new Map<string, number>();
  adjacency.forEach((_, key) => distances.set(key, Infinity));
  distances.set(source, 0);

  const queue = [source];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDist = distances.get(current)!;

    adjacency.get(current)?.forEach((neighbor) => {
      if (distances.get(neighbor) === Infinity) {
        distances.set(neighbor, currentDist + 1);
        queue.push(neighbor);
      }
    });
  }

  return distances;
}

/**
 * Find shortest path between two nodes
 */
export function findShortestPath(
  graph: KnowledgeGraph,
  sourceId: string,
  targetId: string
): PathResult | null {
  const { entities, relationships } = graph;

  // Build adjacency map with edge info
  const adjacency = new Map<string, Array<{ nodeId: string; edgeId: string }>>();
  entities.forEach((e) => adjacency.set(e.id, []));

  relationships.forEach((r) => {
    adjacency.get(r.source)?.push({ nodeId: r.target, edgeId: r.id });
    adjacency.get(r.target)?.push({ nodeId: r.source, edgeId: r.id });
  });

  // BFS to find shortest path
  const visited = new Set<string>();
  const parent = new Map<string, { nodeId: string; edgeId: string } | null>();

  parent.set(sourceId, null);
  visited.add(sourceId);

  const queue = [sourceId];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === targetId) {
      // Reconstruct path
      const path: string[] = [];
      const edgeIds: string[] = [];
      let node: string | undefined = targetId;

      while (node) {
        path.unshift(node);
        const parentInfo = parent.get(node);
        if (parentInfo) {
          edgeIds.unshift(parentInfo.edgeId);
          node = parentInfo.nodeId;
        } else {
          break;
        }
      }

      const pathEntities = path.map((id) => entities.find((e) => e.id === id)!).filter(Boolean);
      const pathRelationships = edgeIds
        .map((id) => relationships.find((r) => r.id === id)!)
        .filter(Boolean);

      return {
        path,
        length: path.length - 1,
        entities: pathEntities,
        relationships: pathRelationships,
      };
    }

    adjacency.get(current)?.forEach(({ nodeId, edgeId }) => {
      if (!visited.has(nodeId)) {
        visited.add(nodeId);
        parent.set(nodeId, { nodeId: current, edgeId });
        queue.push(nodeId);
      }
    });
  }

  return null; // No path found
}

/**
 * Find all nodes within N hops of a given node
 */
export function findNeighborhood(
  graph: KnowledgeGraph,
  nodeId: string,
  maxHops: number
): { entities: Entity[]; relationships: Relationship[] } {
  const { entities, relationships } = graph;

  // Build adjacency map
  const adjacency = new Map<string, Set<string>>();
  entities.forEach((e) => adjacency.set(e.id, new Set()));

  relationships.forEach((r) => {
    adjacency.get(r.source)?.add(r.target);
    adjacency.get(r.target)?.add(r.source);
  });

  // BFS to find nodes within maxHops
  const visited = new Set<string>();
  const distances = new Map<string, number>();

  visited.add(nodeId);
  distances.set(nodeId, 0);

  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDist = distances.get(current)!;

    if (currentDist >= maxHops) continue;

    adjacency.get(current)?.forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        distances.set(neighbor, currentDist + 1);
        queue.push(neighbor);
      }
    });
  }

  const neighborEntities = entities.filter((e) => visited.has(e.id));
  const neighborRelationships = relationships.filter(
    (r) => visited.has(r.source) && visited.has(r.target)
  );

  return { entities: neighborEntities, relationships: neighborRelationships };
}

/**
 * Detect communities using label propagation algorithm
 */
export function detectCommunities(graph: KnowledgeGraph): Map<string, number> {
  const { entities, relationships } = graph;

  // Build adjacency map
  const adjacency = new Map<string, string[]>();
  entities.forEach((e) => adjacency.set(e.id, []));

  relationships.forEach((r) => {
    adjacency.get(r.source)?.push(r.target);
    adjacency.get(r.target)?.push(r.source);
  });

  // Initialize labels
  const labels = new Map<string, number>();
  entities.forEach((e, index) => labels.set(e.id, index));

  // Iterate until convergence
  const maxIterations = 10;
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let changed = false;

    // Shuffle order for each iteration
    const shuffledEntities = [...entities].sort(() => Math.random() - 0.5);

    shuffledEntities.forEach((entity) => {
      const neighbors = adjacency.get(entity.id) || [];
      if (neighbors.length === 0) return;

      // Count neighbor labels
      const labelCounts = new Map<number, number>();
      neighbors.forEach((neighbor) => {
        const label = labels.get(neighbor)!;
        labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
      });

      // Find most common label
      let maxCount = 0;
      let maxLabel = labels.get(entity.id)!;

      labelCounts.forEach((count, label) => {
        if (count > maxCount) {
          maxCount = count;
          maxLabel = label;
        }
      });

      if (maxLabel !== labels.get(entity.id)) {
        labels.set(entity.id, maxLabel);
        changed = true;
      }
    });

    if (!changed) break;
  }

  return labels;
}

/**
 * Search entities by name or description
 */
export function searchEntities(graph: KnowledgeGraph, query: string): Entity[] {
  const lowerQuery = query.toLowerCase();

  return graph.entities.filter(
    (e) =>
      e.name.toLowerCase().includes(lowerQuery) ||
      e.description?.toLowerCase().includes(lowerQuery)
  );
}
