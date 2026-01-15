// Educational explanations for graph metrics
// Each metric includes what it measures, how to interpret values, and why agents use it

export interface MetricExplanation {
  metricName: string;
  shortDescription: string;
  fullDescription: string;
  interpretation: {
    high: string;
    low: string;
  };
  agentUseCase: string;
  example: string;
  relatedMetrics: string[];
  formula?: string;
}

export const METRIC_EXPLANATIONS: Record<string, MetricExplanation> = {
  // Basic Graph Metrics
  density: {
    metricName: 'Graph Density',
    shortDescription: 'Ratio of actual edges to maximum possible edges',
    fullDescription:
      'Density measures how interconnected your knowledge graph is. A fully connected graph has density of 1.0, while a graph with no edges has density of 0. Most real-world knowledge graphs are sparse (density < 0.1).',
    interpretation: {
      high: 'The knowledge is highly interconnected; entities have many relationships. Good for finding connections but may indicate over-extraction.',
      low: 'The knowledge is sparse; entities are relatively isolated. May indicate under-extraction or naturally disconnected topics.',
    },
    agentUseCase:
      'Agents use density to assess knowledge coverage. Dense subgraphs indicate well-documented domains where queries can be confidently answered. Sparse regions may require external knowledge sources.',
    example:
      'A company org chart graph might have low density (mostly hierarchical), while a "concepts in machine learning" graph would have higher density (many interconnections).',
    relatedMetrics: ['averageDegree', 'clusteringCoefficient'],
    formula: 'density = 2E / (N × (N-1))',
  },

  averageDegree: {
    metricName: 'Average Degree',
    shortDescription: 'Mean number of connections per node',
    fullDescription:
      'The average degree tells you how many relationships each entity has on average. It gives a quick sense of connectivity without being skewed by hub nodes.',
    interpretation: {
      high: 'Entities are well-connected on average. Information can flow through multiple paths.',
      low: 'Most entities have few connections. The graph may be tree-like or have many isolated nodes.',
    },
    agentUseCase:
      'Agents use average degree to estimate query complexity. High average degree means more context to consider per hop, but also more redundant paths for validation.',
    example:
      'In a social network knowledge graph, average degree might be 50-100. In a strict taxonomy, it might be 2-3.',
    relatedMetrics: ['density', 'maxDegree'],
  },

  clusteringCoefficient: {
    metricName: 'Clustering Coefficient',
    shortDescription: 'Tendency of nodes to form tightly-knit groups',
    fullDescription:
      'The clustering coefficient measures transitivity: if A connects to B and C, how likely are B and C also connected? High clustering indicates community structure.',
    interpretation: {
      high: 'Strong community structure; entities form tight clusters. "Friends of friends are friends."',
      low: 'Entities connect across different groups; less tribal structure. More like a star or tree topology.',
    },
    agentUseCase:
      'Agents use clustering to identify topic boundaries. High-clustering regions represent coherent domains where local context is sufficient. Cross-cluster queries need bridge concepts.',
    example:
      'Academic papers in the same subfield show high clustering. Interdisciplinary research papers have lower local clustering.',
    relatedMetrics: ['communityCount', 'modularity'],
  },

  connectedComponents: {
    metricName: 'Connected Components',
    shortDescription: 'Number of separate subgraphs with no connections between them',
    fullDescription:
      'Connected components are isolated islands in your knowledge graph. Each component can only answer questions about entities within it.',
    interpretation: {
      high: 'Knowledge is fragmented into many separate topics. May indicate extraction from diverse documents.',
      low: 'Most entities are reachable from each other. Knowledge is well-integrated.',
    },
    agentUseCase:
      'Agents check components before pathfinding. If source and target are in different components, there is no connecting path—the agent must acknowledge this gap.',
    example:
      'Extracting from both a biology textbook and a history book might create 2 components with no overlap.',
    relatedMetrics: ['isolatedNodes', 'diameter'],
  },

  // Centrality Metrics
  degree: {
    metricName: 'Degree Centrality',
    shortDescription: 'Number of direct connections normalized by graph size',
    fullDescription:
      'Degree centrality is the simplest measure of importance: how many relationships does this entity have? It identifies entities that are directly involved in many relationships.',
    interpretation: {
      high: 'This entity is a hub—directly connected to many others. Often a key concept or important actor.',
      low: 'This entity is peripheral with few direct connections. May be specialized or tangential.',
    },
    agentUseCase:
      'Agents start exploration from high-degree nodes to quickly gather broad context. High-degree entities often appear in answers to general questions.',
    example:
      'In a technology knowledge graph, "artificial intelligence" likely has high degree centrality, connecting to many related concepts.',
    relatedMetrics: ['inDegree', 'outDegree', 'betweenness'],
    formula: 'degree(v) = |neighbors(v)| / (N - 1)',
  },

  inDegree: {
    metricName: 'In-Degree Centrality',
    shortDescription: 'Number of incoming edges (others pointing to this node)',
    fullDescription:
      'In-degree counts how many other entities reference this one. In a directed knowledge graph, entities with high in-degree are "authorities"—widely cited or referenced.',
    interpretation: {
      high: 'Authority node: Many other entities point to this one. Trustworthy source of information.',
      low: 'Few entities reference this one. May be a source rather than a destination in the knowledge flow.',
    },
    agentUseCase:
      'Agents treat high in-degree entities as authoritative sources. When validating claims, agents prioritize information from authority nodes.',
    example:
      'In a citation network, seminal papers have high in-degree. In an org chart, executives have high in-degree (many "reports_to" edges).',
    relatedMetrics: ['outDegree', 'pageRank'],
  },

  outDegree: {
    metricName: 'Out-Degree Centrality',
    shortDescription: 'Number of outgoing edges (this node pointing to others)',
    fullDescription:
      'Out-degree counts how many entities this one references. Entities with high out-degree are "hubs"—they connect to many other concepts.',
    interpretation: {
      high: 'Hub node: This entity references many others. Good starting point for exploration.',
      low: 'This entity is focused, referencing few others. May be a leaf or specialized concept.',
    },
    agentUseCase:
      'Agents use high out-degree nodes as starting points for breadth-first exploration. These hubs provide quick access to diverse related entities.',
    example:
      'A "Table of Contents" entity would have high out-degree. An overview article references many specific topics.',
    relatedMetrics: ['inDegree', 'degree'],
  },

  betweenness: {
    metricName: 'Betweenness Centrality',
    shortDescription: 'How often this node lies on shortest paths between other nodes',
    fullDescription:
      'Betweenness centrality identifies bridge nodes that connect different parts of the graph. Removing high-betweenness nodes would disconnect communities.',
    interpretation: {
      high: 'Bridge node: Critical for connecting different parts of the knowledge graph. Information flows through this entity.',
      low: 'This entity is within a cluster, not connecting different parts. Removing it wouldn\'t fragment the graph.',
    },
    agentUseCase:
      'Agents query bridge nodes to understand how topics connect. High-betweenness entities often explain "why X relates to Y" for distant concepts.',
    example:
      '"Machine learning" might bridge "statistics" and "software engineering" communities. "Energy policy" might bridge "climate science" and "economics".',
    relatedMetrics: ['closeness', 'pageRank'],
    formula: 'betweenness(v) = Σ (σst(v) / σst) for all s,t pairs',
  },

  closeness: {
    metricName: 'Closeness Centrality',
    shortDescription: 'Average distance to all other nodes in the graph',
    fullDescription:
      'Closeness centrality measures how quickly you can reach all other entities from this one. High closeness means this entity is "central" in the network topology.',
    interpretation: {
      high: 'Central node: Can reach most other entities quickly. Good overview point for the domain.',
      low: 'Peripheral node: Far from many other entities. May be in a corner of the knowledge graph.',
    },
    agentUseCase:
      'Agents use high-closeness nodes for efficient knowledge retrieval. Starting from central nodes minimizes the hops needed to reach any information.',
    example:
      'In a company knowledge graph, the CEO entity might have high closeness—few hops to any department.',
    relatedMetrics: ['harmonic', 'betweenness'],
    formula: 'closeness(v) = (N-1) / Σ d(v,u) for all u',
  },

  harmonic: {
    metricName: 'Harmonic Centrality',
    shortDescription: 'Sum of inverse distances to all other nodes',
    fullDescription:
      'Harmonic centrality is like closeness but handles disconnected graphs better. It sums 1/distance instead of inverting the sum, so unreachable nodes contribute 0 instead of making the metric undefined.',
    interpretation: {
      high: 'Well-positioned node: Close to many entities, even in a graph with isolated components.',
      low: 'Distant from most entities, possibly in a small isolated component.',
    },
    agentUseCase:
      'Agents prefer harmonic centrality when knowledge graphs may be incomplete or have isolated topics. It gives meaningful values even with disconnected components.',
    example:
      'Useful when merging knowledge graphs from different documents that may not fully connect.',
    relatedMetrics: ['closeness', 'eigenvector'],
    formula: 'harmonic(v) = Σ (1/d(v,u)) / (N-1)',
  },

  pageRank: {
    metricName: 'PageRank',
    shortDescription: 'Importance based on who links to you (recursive)',
    fullDescription:
      'PageRank, famously used by Google, determines importance recursively: an entity is important if important entities link to it. It simulates a random walker on the graph.',
    interpretation: {
      high: 'High-authority entity: Referenced by other important entities. Core concept in the domain.',
      low: 'Peripheral entity: Either isolated or only connected to unimportant entities.',
    },
    agentUseCase:
      'Agents use PageRank to identify the most authoritative entities for a topic. When summarizing a knowledge graph, high-PageRank entities should be mentioned.',
    example:
      '"Deep learning" might have high PageRank in an AI knowledge graph because many important concepts (CNNs, transformers, etc.) link to it.',
    relatedMetrics: ['eigenvector', 'inDegree'],
    formula: 'PR(v) = (1-d)/N + d × Σ PR(u)/degree(u)',
  },

  eigenvector: {
    metricName: 'Eigenvector Centrality',
    shortDescription: 'Importance based on neighbors\' importance',
    fullDescription:
      'Eigenvector centrality is the mathematical foundation for PageRank. A node\'s score is proportional to the sum of its neighbors\' scores, found via matrix eigenvector computation.',
    interpretation: {
      high: 'Connected to other important nodes. Part of the core cluster of influence.',
      low: 'Isolated from important nodes, even if directly connected to many unimportant ones.',
    },
    agentUseCase:
      'Agents use eigenvector centrality when quality of connections matters more than quantity. It helps identify core concepts even if they have few but important links.',
    example:
      'A foundational theory paper might have lower degree but high eigenvector centrality if its few citations are from landmark papers.',
    relatedMetrics: ['pageRank', 'katz'],
  },

  katz: {
    metricName: 'Katz Centrality',
    shortDescription: 'Considers all paths with exponential decay',
    fullDescription:
      'Katz centrality generalizes eigenvector centrality by adding a base score to all nodes and using an attenuation factor. It counts all paths, not just direct neighbors.',
    interpretation: {
      high: 'Many paths lead to this entity, either directly or through chains of connections.',
      low: 'Few paths reach this entity; it may be in a sparse or peripheral region.',
    },
    agentUseCase:
      'Agents use Katz centrality when both direct and indirect influence matters. Useful for finding entities that are reachable through many different paths.',
    example:
      'In a knowledge graph of historical events, a pivotal event might have high Katz score due to many causal chains passing through it.',
    relatedMetrics: ['eigenvector', 'pageRank'],
    formula: 'katz(v) = α × Σ A_uv × katz(u) + β',
  },

  // Topology Metrics
  diameter: {
    metricName: 'Network Diameter',
    shortDescription: 'Longest shortest path between any two nodes',
    fullDescription:
      'The diameter is the maximum number of hops needed to get between the two most distant nodes. It defines the "size" of your knowledge graph in terms of traversal.',
    interpretation: {
      high: 'Knowledge is spread out; some concepts are many hops apart. May need deep reasoning chains.',
      low: 'Knowledge is compact; any two concepts connect within few hops. "Small world" property.',
    },
    agentUseCase:
      'Agents use diameter to estimate reasoning complexity. High diameter means multi-hop questions may require long inference chains.',
    example:
      'A well-integrated knowledge graph might have diameter 4-6. A sparse or linear graph might have diameter > 10.',
    relatedMetrics: ['averagePathLength', 'radius'],
  },

  averagePathLength: {
    metricName: 'Average Path Length',
    shortDescription: 'Mean shortest path distance between all node pairs',
    fullDescription:
      'The average path length tells you how many hops you typically need to get between random entities. Lower is better for efficient knowledge retrieval.',
    interpretation: {
      high: 'On average, entities are far apart. Queries may need many reasoning steps.',
      low: 'Small-world property: most entities connect within few hops. Efficient for reasoning.',
    },
    agentUseCase:
      'Agents estimate query cost using average path length. Lower values mean faster answers with fewer API calls for multi-hop reasoning.',
    example:
      'Social networks famously have average path ~6 ("six degrees of separation"). Knowledge graphs vary widely.',
    relatedMetrics: ['diameter', 'closeness'],
  },

  // Community Metrics
  communityCount: {
    metricName: 'Community Count',
    shortDescription: 'Number of detected topic clusters',
    fullDescription:
      'Communities are groups of densely connected entities that are sparsely connected to other groups. The count indicates how many distinct topics or domains exist.',
    interpretation: {
      high: 'Knowledge spans many distinct topics with clear boundaries.',
      low: 'Knowledge is unified around few core topics or is highly interconnected.',
    },
    agentUseCase:
      'Agents use community count to understand domain breadth. Multi-community queries may need careful context management.',
    example:
      'A knowledge graph from a textbook might have one community per chapter topic.',
    relatedMetrics: ['modularity', 'clusteringCoefficient'],
  },

  modularity: {
    metricName: 'Modularity',
    shortDescription: 'Quality score for community detection (0-1)',
    fullDescription:
      'Modularity measures how well the detected communities separate the graph. Higher modularity means clear community boundaries; lower means the communities are not well-defined.',
    interpretation: {
      high: 'Strong community structure: The detected groups are meaningful and well-separated.',
      low: 'Weak community structure: Entities don\'t naturally cluster into distinct groups.',
    },
    agentUseCase:
      'Agents use modularity to decide whether to use community-aware reasoning. High modularity suggests queries can be scoped to communities.',
    example:
      'Modularity > 0.3 typically indicates meaningful community structure.',
    relatedMetrics: ['communityCount', 'clusteringCoefficient'],
    formula: 'Q = (1/2m) × Σ [A_ij - k_i×k_j/2m] × δ(c_i, c_j)',
  },
};

// Algorithm explanations for the visualization system
export interface AlgorithmExplanation {
  name: string;
  shortDescription: string;
  fullDescription: string;
  steps: string[];
  complexity: string;
  agentRelevance: string;
}

export const ALGORITHM_EXPLANATIONS: Record<string, AlgorithmExplanation> = {
  bfs: {
    name: 'Breadth-First Search (BFS)',
    shortDescription: 'Explores graph level by level from a starting point',
    fullDescription:
      'BFS systematically explores all neighbors at the current depth before moving to nodes at the next depth level. It finds the shortest unweighted path between two nodes.',
    steps: [
      'Start at the source node and add it to a queue',
      'Remove the first node from the queue',
      'If it\'s the target, reconstruct and return the path',
      'Otherwise, add all unvisited neighbors to the queue',
      'Mark the current node as visited',
      'Repeat until queue is empty or target found',
    ],
    complexity: 'O(V + E) where V = nodes, E = edges',
    agentRelevance:
      'Agents use BFS to find the shortest reasoning chain between concepts. When explaining "how X relates to Y", BFS gives the most direct connection without unnecessary detours.',
  },

  dijkstra: {
    name: 'Dijkstra\'s Algorithm',
    shortDescription: 'Finds shortest weighted path between nodes',
    fullDescription:
      'Dijkstra\'s algorithm extends BFS to handle edge weights. It always explores the node with the smallest total distance from the source, guaranteeing the optimal weighted path.',
    steps: [
      'Initialize all distances to infinity except source (0)',
      'Add source to priority queue with distance 0',
      'Extract node with minimum distance',
      'For each neighbor, calculate distance through current node',
      'If shorter than known distance, update and add to queue',
      'Repeat until target reached or queue empty',
    ],
    complexity: 'O((V + E) log V) with priority queue',
    agentRelevance:
      'Agents use Dijkstra when relationship confidence matters. By using inverse confidence as weight, agents find the most reliable reasoning path, not just the shortest.',
  },

  pagerank: {
    name: 'PageRank',
    shortDescription: 'Iteratively computes node importance',
    fullDescription:
      'PageRank simulates a random walker that follows links with probability d (damping factor) or jumps to a random node with probability 1-d. After many iterations, the probability of being at each node converges to its PageRank score.',
    steps: [
      'Initialize all nodes with equal score (1/N)',
      'For each iteration:',
      '  For each node, sum scores from neighbors divided by their degree',
      '  Apply damping: new_score = (1-d)/N + d × sum',
      'Repeat until scores converge (stop changing)',
    ],
    complexity: 'O(iterations × E)',
    agentRelevance:
      'Agents use PageRank to identify authoritative entities. When summarizing knowledge or answering broad questions, high-PageRank entities should be prioritized in the response.',
  },

  louvain: {
    name: 'Louvain Community Detection',
    shortDescription: 'Optimizes modularity to find communities',
    fullDescription:
      'The Louvain algorithm finds communities by greedily optimizing modularity. It repeatedly moves nodes to neighboring communities if doing so increases modularity, then aggregates communities into super-nodes.',
    steps: [
      'Initialize each node as its own community',
      'For each node, evaluate modularity gain of joining each neighbor\'s community',
      'Move node to community with maximum gain (if positive)',
      'Repeat until no moves improve modularity',
      'Aggregate communities into super-nodes and repeat',
    ],
    complexity: 'O(N log N) typically, but can vary',
    agentRelevance:
      'Agents use community detection to partition knowledge by topic. When a query spans multiple communities, agents know they need to synthesize information from different domains.',
  },

  labelPropagation: {
    name: 'Label Propagation',
    shortDescription: 'Spreads community labels through the network',
    fullDescription:
      'Label propagation is a simple community detection algorithm. Each node adopts the most common label among its neighbors, and this process repeats until labels stabilize.',
    steps: [
      'Assign each node a unique label',
      'Shuffle nodes randomly',
      'For each node, count neighbor labels',
      'Adopt the most frequent neighbor label',
      'Repeat until labels stop changing',
    ],
    complexity: 'O(E × iterations)',
    agentRelevance:
      'Agents use label propagation for quick, approximate community detection. It\'s faster than Louvain for large graphs where exact boundaries aren\'t critical.',
  },
};

// Helper function to get explanation for a metric
export function getMetricExplanation(metricKey: string): MetricExplanation | undefined {
  return METRIC_EXPLANATIONS[metricKey];
}

// Helper function to get all metric names grouped by category
export function getMetricsByCategory(): Record<string, string[]> {
  return {
    'Basic Graph Metrics': ['density', 'averageDegree', 'clusteringCoefficient', 'connectedComponents'],
    'Degree Centrality': ['degree', 'inDegree', 'outDegree'],
    'Path-Based Centrality': ['betweenness', 'closeness', 'harmonic'],
    'Influence Centrality': ['pageRank', 'eigenvector', 'katz'],
    'Network Topology': ['diameter', 'averagePathLength'],
    'Community Structure': ['communityCount', 'modularity'],
  };
}
