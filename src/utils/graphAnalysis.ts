import {
  KnowledgeGraph,
  GraphMetrics,
  CentralityMetrics,
  DirectedCentralityMetrics,
  DirectedAdjacency,
  TopologyMetrics,
  CommunityResult,
  LinkPrediction,
  PathResult,
  WeightedPathResult,
  AlgorithmStep,
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

// ============================================
// Directed Graph Support
// ============================================

/**
 * Build directed adjacency maps (outgoing and incoming edges)
 * Unlike the undirected version, this respects relationship direction
 */
export function buildDirectedAdjacency(graph: KnowledgeGraph): DirectedAdjacency {
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();

  graph.entities.forEach((e) => {
    outgoing.set(e.id, new Set());
    incoming.set(e.id, new Set());
  });

  graph.relationships.forEach((r) => {
    outgoing.get(r.source)?.add(r.target);
    incoming.get(r.target)?.add(r.source);
  });

  return { outgoing, incoming };
}

/**
 * Calculate directed centrality metrics (in-degree and out-degree)
 * - Hub nodes have high out-degree (they reference many others)
 * - Authority nodes have high in-degree (they are referenced by many)
 */
export function calculateDirectedCentrality(graph: KnowledgeGraph): DirectedCentralityMetrics {
  const { outgoing, incoming } = buildDirectedAdjacency(graph);
  const maxDegree = graph.entities.length - 1;

  const inDegree: Record<string, number> = {};
  const outDegree: Record<string, number> = {};

  graph.entities.forEach((e) => {
    const inCount = incoming.get(e.id)?.size || 0;
    const outCount = outgoing.get(e.id)?.size || 0;

    // Normalize by max possible degree
    inDegree[e.id] = maxDegree > 0 ? inCount / maxDegree : 0;
    outDegree[e.id] = maxDegree > 0 ? outCount / maxDegree : 0;
  });

  return { inDegree, outDegree };
}

// ============================================
// Weighted Path Analysis
// ============================================

/**
 * Find shortest weighted path using Dijkstra's algorithm
 * @param graph - The knowledge graph
 * @param sourceId - Starting entity ID
 * @param targetId - Destination entity ID
 * @param options - Configuration for weight handling
 */
export function findWeightedShortestPath(
  graph: KnowledgeGraph,
  sourceId: string,
  targetId: string,
  options: {
    useWeight?: boolean;
    invertWeight?: boolean; // true = high weight means shorter/better path (for confidence)
    defaultWeight?: number;
  } = {}
): WeightedPathResult | null {
  const { useWeight = true, invertWeight = false, defaultWeight = 1 } = options;
  const { entities, relationships } = graph;

  // Build adjacency map with edge weights
  const adjacency = new Map<string, Array<{ nodeId: string; edgeId: string; weight: number }>>();
  entities.forEach((e) => adjacency.set(e.id, []));

  relationships.forEach((r) => {
    let weight = useWeight ? (r.weight ?? defaultWeight) : defaultWeight;
    if (invertWeight && weight > 0) {
      weight = 1 / weight; // Invert: high confidence = low cost
    }

    // Add edges in both directions (undirected for pathfinding)
    adjacency.get(r.source)?.push({ nodeId: r.target, edgeId: r.id, weight });
    adjacency.get(r.target)?.push({ nodeId: r.source, edgeId: r.id, weight });
  });

  // Dijkstra's algorithm
  const distances = new Map<string, number>();
  const parent = new Map<string, { nodeId: string; edgeId: string; weight: number } | null>();
  const visited = new Set<string>();

  entities.forEach((e) => distances.set(e.id, Infinity));
  distances.set(sourceId, 0);
  parent.set(sourceId, null);

  // Priority queue (simple implementation with array)
  const queue: Array<{ nodeId: string; distance: number }> = [{ nodeId: sourceId, distance: 0 }];

  while (queue.length > 0) {
    // Get node with minimum distance
    queue.sort((a, b) => a.distance - b.distance);
    const { nodeId: current } = queue.shift()!;

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === targetId) {
      // Reconstruct path
      const path: string[] = [];
      const edgeIds: string[] = [];
      const weights: number[] = [];
      let node: string | undefined = targetId;

      while (node) {
        path.unshift(node);
        const parentInfo = parent.get(node);
        if (parentInfo) {
          edgeIds.unshift(parentInfo.edgeId);
          weights.unshift(parentInfo.weight);
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
        totalWeight: distances.get(targetId) || 0,
        weights,
      };
    }

    // Explore neighbors
    adjacency.get(current)?.forEach(({ nodeId, edgeId, weight }) => {
      if (visited.has(nodeId)) return;

      const newDistance = (distances.get(current) || 0) + weight;
      if (newDistance < (distances.get(nodeId) || Infinity)) {
        distances.set(nodeId, newDistance);
        parent.set(nodeId, { nodeId: current, edgeId, weight });
        queue.push({ nodeId, distance: newDistance });
      }
    });
  }

  return null; // No path found
}

// ============================================
// Additional Centrality Metrics
// ============================================

/**
 * Calculate eigenvector centrality using power iteration
 * Nodes are important if connected to other important nodes
 */
export function calculateEigenvectorCentrality(
  graph: KnowledgeGraph,
  iterations: number = 100,
  tolerance: number = 1e-6
): Record<string, number> {
  const { entities, relationships } = graph;
  if (entities.length === 0) return {};

  // Build adjacency
  const adjacency = new Map<string, Set<string>>();
  entities.forEach((e) => adjacency.set(e.id, new Set()));
  relationships.forEach((r) => {
    adjacency.get(r.source)?.add(r.target);
    adjacency.get(r.target)?.add(r.source);
  });

  // Initialize scores uniformly
  let scores: Record<string, number> = {};
  const initialScore = 1 / Math.sqrt(entities.length);
  entities.forEach((e) => (scores[e.id] = initialScore));

  // Power iteration
  for (let i = 0; i < iterations; i++) {
    const newScores: Record<string, number> = {};
    let norm = 0;

    entities.forEach((e) => {
      let sum = 0;
      adjacency.get(e.id)?.forEach((neighbor) => {
        sum += scores[neighbor];
      });
      newScores[e.id] = sum;
      norm += sum * sum;
    });

    // Normalize
    norm = Math.sqrt(norm);
    if (norm > 0) {
      entities.forEach((e) => {
        newScores[e.id] /= norm;
      });
    }

    // Check convergence
    let diff = 0;
    entities.forEach((e) => {
      diff += Math.abs(newScores[e.id] - scores[e.id]);
    });

    scores = newScores;
    if (diff < tolerance) break;
  }

  return scores;
}

/**
 * Calculate harmonic centrality
 * Better than closeness for disconnected graphs
 * Uses sum of inverse distances instead of inverse of sum
 */
export function calculateHarmonicCentrality(graph: KnowledgeGraph): Record<string, number> {
  const { entities } = graph;
  const harmonic: Record<string, number> = {};

  // Build adjacency
  const adjacency = new Map<string, Set<string>>();
  entities.forEach((e) => adjacency.set(e.id, new Set()));
  graph.relationships.forEach((r) => {
    adjacency.get(r.source)?.add(r.target);
    adjacency.get(r.target)?.add(r.source);
  });

  entities.forEach((source) => {
    const distances = bfsDistances(source.id, adjacency);
    let sum = 0;

    distances.forEach((dist, nodeId) => {
      if (nodeId !== source.id && dist > 0 && dist < Infinity) {
        sum += 1 / dist;
      }
    });

    // Normalize by n-1
    harmonic[source.id] = entities.length > 1 ? sum / (entities.length - 1) : 0;
  });

  return harmonic;
}

/**
 * Calculate Katz centrality
 * Considers all paths between nodes, with exponential decay
 */
export function calculateKatzCentrality(
  graph: KnowledgeGraph,
  alpha: number = 0.1,
  beta: number = 1,
  iterations: number = 100
): Record<string, number> {
  const { entities, relationships } = graph;
  if (entities.length === 0) return {};

  // Build adjacency
  const adjacency = new Map<string, Set<string>>();
  entities.forEach((e) => adjacency.set(e.id, new Set()));
  relationships.forEach((r) => {
    adjacency.get(r.source)?.add(r.target);
    adjacency.get(r.target)?.add(r.source);
  });

  // Initialize
  let scores: Record<string, number> = {};
  entities.forEach((e) => (scores[e.id] = 0));

  // Iterate
  for (let i = 0; i < iterations; i++) {
    const newScores: Record<string, number> = {};

    entities.forEach((e) => {
      let sum = beta; // Base score for all nodes
      adjacency.get(e.id)?.forEach((neighbor) => {
        sum += alpha * scores[neighbor];
      });
      newScores[e.id] = sum;
    });

    scores = newScores;
  }

  // Normalize to 0-1 range
  const maxScore = Math.max(...Object.values(scores), 1);
  entities.forEach((e) => {
    scores[e.id] /= maxScore;
  });

  return scores;
}

// ============================================
// Network Topology Metrics
// ============================================

/**
 * Calculate network topology metrics including diameter, radius, and eccentricity
 */
export function calculateTopologyMetrics(graph: KnowledgeGraph): TopologyMetrics {
  const { entities } = graph;

  if (entities.length === 0) {
    return {
      diameter: 0,
      radius: 0,
      averagePathLength: 0,
      eccentricity: {},
      peripheryNodes: [],
      centerNodes: [],
    };
  }

  // Build adjacency
  const adjacency = new Map<string, Set<string>>();
  entities.forEach((e) => adjacency.set(e.id, new Set()));
  graph.relationships.forEach((r) => {
    adjacency.get(r.source)?.add(r.target);
    adjacency.get(r.target)?.add(r.source);
  });

  const eccentricity: Record<string, number> = {};
  let totalPathLength = 0;
  let pathCount = 0;

  // Calculate eccentricity for each node (max distance to any reachable node)
  entities.forEach((source) => {
    const distances = bfsDistances(source.id, adjacency);
    let maxDist = 0;

    distances.forEach((dist, nodeId) => {
      if (nodeId !== source.id && dist < Infinity) {
        maxDist = Math.max(maxDist, dist);
        totalPathLength += dist;
        pathCount++;
      }
    });

    eccentricity[source.id] = maxDist;
  });

  const eccentricityValues = Object.values(eccentricity).filter((e) => e > 0);
  const diameter = eccentricityValues.length > 0 ? Math.max(...eccentricityValues) : 0;
  const radius = eccentricityValues.length > 0 ? Math.min(...eccentricityValues) : 0;
  const averagePathLength = pathCount > 0 ? totalPathLength / pathCount : 0;

  // Find center and periphery nodes
  const peripheryNodes = entities
    .filter((e) => eccentricity[e.id] === diameter)
    .map((e) => e.id);
  const centerNodes = entities
    .filter((e) => eccentricity[e.id] === radius && radius > 0)
    .map((e) => e.id);

  return {
    diameter,
    radius,
    averagePathLength,
    eccentricity,
    peripheryNodes,
    centerNodes,
  };
}

// ============================================
// Enhanced Community Detection
// ============================================

/**
 * Detect communities using the Louvain algorithm (modularity optimization)
 * More robust than label propagation
 */
export function detectCommunitiesLouvain(graph: KnowledgeGraph): CommunityResult {
  const { entities, relationships } = graph;

  if (entities.length === 0) {
    return {
      communities: new Map(),
      communityCount: 0,
      modularity: 0,
      communitySizes: {},
      algorithm: 'louvain',
    };
  }

  // Build adjacency with weights
  const adjacency = new Map<string, Map<string, number>>();
  entities.forEach((e) => adjacency.set(e.id, new Map()));

  let totalWeight = 0;
  relationships.forEach((r) => {
    const weight = r.weight ?? 1;
    adjacency.get(r.source)?.set(r.target, weight);
    adjacency.get(r.target)?.set(r.source, weight);
    totalWeight += weight * 2; // Count both directions
  });

  // Initialize: each node in its own community
  const communities = new Map<string, number>();
  entities.forEach((e, i) => communities.set(e.id, i));

  // Calculate node degrees (sum of edge weights)
  const degrees = new Map<string, number>();
  entities.forEach((e) => {
    let sum = 0;
    adjacency.get(e.id)?.forEach((w) => (sum += w));
    degrees.set(e.id, sum);
  });

  // Louvain phase 1: local moving
  const maxIterations = 10;
  for (let iter = 0; iter < maxIterations; iter++) {
    let improved = false;

    // Shuffle nodes
    const shuffled = [...entities].sort(() => Math.random() - 0.5);

    for (const node of shuffled) {
      const currentCommunity = communities.get(node.id)!;
      const nodeDegree = degrees.get(node.id) || 0;

      // Calculate connections to each neighboring community
      const communityConnections = new Map<number, number>();
      adjacency.get(node.id)?.forEach((weight, neighbor) => {
        const neighborCommunity = communities.get(neighbor)!;
        communityConnections.set(
          neighborCommunity,
          (communityConnections.get(neighborCommunity) || 0) + weight
        );
      });

      // Find best community
      let bestCommunity = currentCommunity;
      let bestGain = 0;

      communityConnections.forEach((connection, community) => {
        if (community === currentCommunity) return;

        // Calculate modularity gain using Louvain formula
        // ΔQ = [k_i,in/m - (Σ_tot + k_i) * k_i / (2m²)]
        const sumTot = getCommunityTotalWeight(community, communities, degrees);

        const gain =
          connection / totalWeight -
          ((sumTot + nodeDegree) * nodeDegree) / (totalWeight * totalWeight);

        if (gain > bestGain) {
          bestGain = gain;
          bestCommunity = community;
        }
      });

      if (bestCommunity !== currentCommunity) {
        communities.set(node.id, bestCommunity);
        improved = true;
      }
    }

    if (!improved) break;
  }

  // Renumber communities to be consecutive
  const uniqueCommunities = new Set(communities.values());
  const communityMapping = new Map<number, number>();
  let newId = 0;
  uniqueCommunities.forEach((c) => {
    communityMapping.set(c, newId++);
  });

  const finalCommunities = new Map<string, number>();
  communities.forEach((c, nodeId) => {
    finalCommunities.set(nodeId, communityMapping.get(c)!);
  });

  // Calculate modularity and sizes
  const modularity = calculateModularity(graph, finalCommunities);
  const communitySizes: Record<number, number> = {};
  finalCommunities.forEach((c) => {
    communitySizes[c] = (communitySizes[c] || 0) + 1;
  });

  return {
    communities: finalCommunities,
    communityCount: uniqueCommunities.size,
    modularity,
    communitySizes,
    algorithm: 'louvain',
  };
}

/**
 * Calculate modularity score for a given community assignment
 */
export function calculateModularity(
  graph: KnowledgeGraph,
  communities: Map<string, number>
): number {
  const { relationships } = graph;

  if (relationships.length === 0) return 0;

  // Calculate total edge weight
  let totalWeight = 0;
  relationships.forEach((r) => {
    totalWeight += (r.weight ?? 1) * 2;
  });

  // Calculate node degrees
  const degrees = new Map<string, number>();
  graph.entities.forEach((e) => degrees.set(e.id, 0));
  relationships.forEach((r) => {
    const w = r.weight ?? 1;
    degrees.set(r.source, (degrees.get(r.source) || 0) + w);
    degrees.set(r.target, (degrees.get(r.target) || 0) + w);
  });

  let modularity = 0;
  relationships.forEach((r) => {
    const ci = communities.get(r.source);
    const cj = communities.get(r.target);

    if (ci === cj) {
      const weight = r.weight ?? 1;
      const ki = degrees.get(r.source) || 0;
      const kj = degrees.get(r.target) || 0;

      modularity += weight - (ki * kj) / totalWeight;
    }
  });

  return modularity / totalWeight;
}

// Helper for Louvain: get total weight of nodes in a community
function getCommunityTotalWeight(
  community: number,
  communities: Map<string, number>,
  degrees: Map<string, number>
): number {
  let sum = 0;
  communities.forEach((c, nodeId) => {
    if (c === community) {
      sum += degrees.get(nodeId) || 0;
    }
  });
  return sum;
}

// ============================================
// Link Prediction
// ============================================

/**
 * Predict potential links using multiple methods
 */
export function predictLinks(
  graph: KnowledgeGraph,
  method: 'common_neighbors' | 'jaccard' | 'preferential_attachment' | 'adamic_adar' = 'common_neighbors',
  topK: number = 10
): LinkPrediction[] {
  const { entities, relationships } = graph;

  // Build adjacency
  const adjacency = new Map<string, Set<string>>();
  entities.forEach((e) => adjacency.set(e.id, new Set()));
  relationships.forEach((r) => {
    adjacency.get(r.source)?.add(r.target);
    adjacency.get(r.target)?.add(r.source);
  });

  // Find existing edges
  const existingEdges = new Set<string>();
  relationships.forEach((r) => {
    existingEdges.add(`${r.source}-${r.target}`);
    existingEdges.add(`${r.target}-${r.source}`);
  });

  const predictions: LinkPrediction[] = [];
  const entityMap = new Map(entities.map((e) => [e.id, e]));

  // Check all non-connected pairs
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i].id;
      const b = entities[j].id;

      if (existingEdges.has(`${a}-${b}`)) continue;

      const neighborsA = adjacency.get(a) || new Set();
      const neighborsB = adjacency.get(b) || new Set();

      let score = 0;

      switch (method) {
        case 'common_neighbors': {
          // Count common neighbors
          neighborsA.forEach((n) => {
            if (neighborsB.has(n)) score++;
          });
          break;
        }
        case 'jaccard': {
          // Jaccard coefficient: |A ∩ B| / |A ∪ B|
          let intersection = 0;
          neighborsA.forEach((n) => {
            if (neighborsB.has(n)) intersection++;
          });
          const union = neighborsA.size + neighborsB.size - intersection;
          score = union > 0 ? intersection / union : 0;
          break;
        }
        case 'preferential_attachment': {
          // Product of degrees
          score = neighborsA.size * neighborsB.size;
          break;
        }
        case 'adamic_adar': {
          // Sum of 1/log(degree) for common neighbors
          neighborsA.forEach((n) => {
            if (neighborsB.has(n)) {
              const degree = adjacency.get(n)?.size || 1;
              if (degree > 1) {
                score += 1 / Math.log(degree);
              }
            }
          });
          break;
        }
      }

      if (score > 0) {
        predictions.push({
          source: a,
          target: b,
          sourceName: entityMap.get(a)?.name || a,
          targetName: entityMap.get(b)?.name || b,
          score,
          method,
        });
      }
    }
  }

  // Sort by score descending and return top K
  return predictions.sort((a, b) => b.score - a.score).slice(0, topK);
}

// ============================================
// Algorithm Visualization Step Generators
// ============================================

/**
 * Generate visualization steps for BFS pathfinding
 */
export function generateBFSSteps(
  graph: KnowledgeGraph,
  sourceId: string,
  targetId: string
): AlgorithmStep[] {
  const { entities, relationships } = graph;
  const steps: AlgorithmStep[] = [];
  let stepNumber = 0;

  // Build adjacency with edge IDs
  const adjacency = new Map<string, Array<{ nodeId: string; edgeId: string }>>();
  entities.forEach((e) => adjacency.set(e.id, []));
  relationships.forEach((r) => {
    adjacency.get(r.source)?.push({ nodeId: r.target, edgeId: r.id });
    adjacency.get(r.target)?.push({ nodeId: r.source, edgeId: r.id });
  });

  const visited = new Set<string>();
  const parent = new Map<string, { nodeId: string; edgeId: string } | null>();
  const queue: string[] = [sourceId];

  visited.add(sourceId);
  parent.set(sourceId, null);

  // Initial step
  steps.push({
    stepNumber: stepNumber++,
    description: `Starting BFS from source node`,
    highlightedNodes: [sourceId],
    highlightedEdges: [],
    metadata: { queue: [sourceId], visited: [sourceId] },
  });

  while (queue.length > 0) {
    const current = queue.shift()!;

    steps.push({
      stepNumber: stepNumber++,
      description: `Exploring node and its neighbors`,
      highlightedNodes: [current],
      highlightedEdges: [],
      metadata: { currentNode: current, queue: [...queue] },
    });

    if (current === targetId) {
      // Reconstruct path for final step
      const path: string[] = [];
      const edgeIds: string[] = [];
      let node: string | undefined = targetId;

      while (node) {
        path.unshift(node);
        const p = parent.get(node);
        if (p) {
          edgeIds.unshift(p.edgeId);
          node = p.nodeId;
        } else {
          break;
        }
      }

      steps.push({
        stepNumber: stepNumber++,
        description: `Target found! Path length: ${path.length - 1}`,
        highlightedNodes: path,
        highlightedEdges: edgeIds,
        metadata: { path, found: true },
      });

      return steps;
    }

    const neighbors = adjacency.get(current) || [];
    const newNeighbors: string[] = [];
    const newEdges: string[] = [];

    neighbors.forEach(({ nodeId, edgeId }) => {
      if (!visited.has(nodeId)) {
        visited.add(nodeId);
        queue.push(nodeId);
        parent.set(nodeId, { nodeId: current, edgeId });
        newNeighbors.push(nodeId);
        newEdges.push(edgeId);
      }
    });

    if (newNeighbors.length > 0) {
      steps.push({
        stepNumber: stepNumber++,
        description: `Added ${newNeighbors.length} unvisited neighbor(s) to queue`,
        highlightedNodes: [current, ...newNeighbors],
        highlightedEdges: newEdges,
        metadata: { newNeighbors, queue: [...queue] },
      });
    }
  }

  steps.push({
    stepNumber: stepNumber++,
    description: 'No path found - target is not reachable',
    highlightedNodes: [],
    highlightedEdges: [],
    metadata: { found: false },
  });

  return steps;
}

/**
 * Generate visualization steps for PageRank iterations
 */
export function generatePageRankSteps(
  graph: KnowledgeGraph,
  iterations: number = 10
): AlgorithmStep[] {
  const { entities, relationships } = graph;
  const steps: AlgorithmStep[] = [];
  let stepNumber = 0;

  const damping = 0.85;

  // Build adjacency
  const adjacency = new Map<string, Set<string>>();
  entities.forEach((e) => adjacency.set(e.id, new Set()));
  relationships.forEach((r) => {
    adjacency.get(r.source)?.add(r.target);
    adjacency.get(r.target)?.add(r.source);
  });

  // Initialize scores
  let scores: Record<string, number> = {};
  entities.forEach((e) => (scores[e.id] = 1 / entities.length));

  steps.push({
    stepNumber: stepNumber++,
    description: `Initializing all nodes with equal scores (${(1 / entities.length).toFixed(4)})`,
    highlightedNodes: entities.map((e) => e.id),
    highlightedEdges: [],
    nodeValues: { ...scores },
  });

  for (let i = 0; i < iterations; i++) {
    const newScores: Record<string, number> = {};

    entities.forEach((e) => {
      let sum = 0;
      adjacency.get(e.id)?.forEach((neighbor) => {
        const neighborDegree = adjacency.get(neighbor)?.size || 1;
        sum += scores[neighbor] / neighborDegree;
      });
      newScores[e.id] = (1 - damping) / entities.length + damping * sum;
    });

    scores = newScores;

    // Find top nodes for highlighting
    const sortedNodes = entities
      .map((e) => ({ id: e.id, score: scores[e.id] }))
      .sort((a, b) => b.score - a.score);

    steps.push({
      stepNumber: stepNumber++,
      description: `Iteration ${i + 1}: Redistributed scores. Top node: ${sortedNodes[0]?.id}`,
      highlightedNodes: sortedNodes.slice(0, 3).map((n) => n.id),
      highlightedEdges: [],
      nodeValues: { ...scores },
      metadata: { iteration: i + 1, topNodes: sortedNodes.slice(0, 5) },
    });
  }

  return steps;
}
