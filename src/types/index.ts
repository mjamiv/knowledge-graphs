// Core types for the Knowledge Graph application

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  description?: string;
  properties?: Record<string, string | number | boolean>;
  confidence?: number;
}

export type EntityType =
  | 'person'
  | 'organization'
  | 'location'
  | 'concept'
  | 'event'
  | 'technology'
  | 'document'
  | 'date'
  | 'other';

export interface Relationship {
  id: string;
  source: string; // Entity ID
  target: string; // Entity ID
  type: string;
  description?: string;
  weight?: number;
  confidence?: number;
}

export interface KnowledgeGraph {
  id: string;
  name: string;
  description?: string;
  entities: Entity[];
  relationships: Relationship[];
  metadata: GraphMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface GraphMetadata {
  sourceDocument?: string;
  sourceFileName?: string;
  extractionModel?: string;
  nodeCount: number;
  edgeCount: number;
  entityTypes: Record<EntityType, number>;
  relationshipTypes: Record<string, number>;
}

export interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  averageDegree: number;
  maxDegree: number;
  minDegree: number;
  connectedComponents: number;
  isolatedNodes: number;
  mostConnectedNodes: Array<{ id: string; name: string; degree: number }>;
  degreeDistribution: Record<number, number>;
  clusteringCoefficient: number;
}

export interface CentralityMetrics {
  degree: Record<string, number>;
  betweenness: Record<string, number>;
  closeness: Record<string, number>;
  pageRank: Record<string, number>;
}

export interface PathResult {
  path: string[];
  length: number;
  entities: Entity[];
  relationships: Relationship[];
}

export interface GraphNode {
  id: string;
  name: string;
  type: EntityType;
  val: number;
  color: string;
  description?: string;
  // Position properties added by force-graph
  x?: number;
  y?: number;
  z?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
  color: string;
  curvature?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface DocumentInfo {
  name: string;
  type: 'pdf' | 'docx' | 'txt' | 'md';
  size: number;
  content: string;
  pageCount?: number;
}

export interface ExtractionProgress {
  stage: 'idle' | 'reading' | 'extracting' | 'building' | 'complete' | 'error';
  progress: number;
  message: string;
}

export interface AppSettings {
  openaiApiKey: string;
  extractionModel: 'gpt-5.2' | 'gpt-4o' | 'gpt-4-turbo' | 'gpt-4' | 'gpt-3.5-turbo';
  maxEntities: number;
  visualizationMode: '2d' | '3d';
  showLabels: boolean;
  showRelationshipLabels: boolean;
  nodeSize: 'small' | 'medium' | 'large';
  theme: 'light' | 'dark';
}

export const ENTITY_COLORS: Record<EntityType, string> = {
  person: '#ef4444',
  organization: '#3b82f6',
  location: '#22c55e',
  concept: '#a855f7',
  event: '#f59e0b',
  technology: '#06b6d4',
  document: '#6366f1',
  date: '#ec4899',
  other: '#6b7280',
};

export const DEFAULT_SETTINGS: AppSettings = {
  openaiApiKey: '',
  extractionModel: 'gpt-5.2',
  maxEntities: 100,
  visualizationMode: '3d',
  showLabels: true,
  showRelationshipLabels: false,
  nodeSize: 'medium',
  theme: 'dark',
};

// ============================================
// Extraction Visibility & Logging Types
// ============================================

/** Status of a single chunk extraction */
export type ChunkStatus = 'pending' | 'processing' | 'success' | 'failed' | 'skipped';

/** Result from extracting a single chunk */
export interface ChunkResult {
  chunkIndex: number;
  status: ChunkStatus;
  contentPreview: string;      // First 200 chars of chunk
  contentLength: number;       // Total chars in chunk
  startTime: number;           // Unix timestamp
  endTime?: number;            // Unix timestamp
  durationMs?: number;         // Processing time
  entitiesExtracted: number;
  relationshipsExtracted: number;
  entities: Entity[];          // Raw entities from this chunk
  relationships: RawRelationship[];  // Raw relationships (before ID resolution)
  error?: string;              // Error message if failed
  rawResponse?: string;        // Raw API response for debugging
}

/** Raw relationship before entity ID resolution */
export interface RawRelationship {
  source: string;  // Entity name (not ID)
  target: string;  // Entity name (not ID)
  type: string;
  description?: string;
}

/** Tracks where an entity originated from */
export interface EntityProvenance {
  entityId: string;
  entityName: string;
  sourceChunks: number[];      // Which chunks mentioned this entity
  firstMentionChunk: number;   // First chunk where entity appeared
  mentionCount: number;        // How many times entity was extracted
  mergedFrom?: string[];       // Names that were merged into this entity
  originalDescriptions: string[]; // All descriptions from different chunks
}

/** Statistics about the merging/deduplication process */
export interface MergeStats {
  rawEntityCount: number;           // Total entities before dedup
  uniqueEntityCount: number;        // After name-based dedup
  filteredEntityCount: number;      // After max entity limit
  entitiesDropped: number;          // How many were dropped
  rawRelationshipCount: number;     // Total relationships before dedup
  resolvedRelationshipCount: number; // After entity ID resolution
  uniqueRelationshipCount: number;  // After dedup
  relationshipsDropped: number;     // Dropped (missing entities, self-refs)
  duplicateEntitiesMerged: number;  // Count of duplicates merged
  duplicateRelationshipsMerged: number;
}

/** A single step/event in the extraction timeline */
export interface ExtractionStep {
  timestamp: number;
  stage: ExtractionProgress['stage'];
  message: string;
  details?: Record<string, unknown>;
}

/** Complete extraction log for a graph */
export interface ExtractionLog {
  id: string;
  graphId: string;
  startTime: number;
  endTime?: number;
  totalDurationMs?: number;

  // Document info
  documentName: string;
  documentSize: number;
  documentCharCount: number;

  // Extraction config
  model: string;
  maxEntities: number;
  chunkSize: number;
  chunkOverlap: number;

  // Chunk details
  totalChunks: number;
  chunksSucceeded: number;
  chunksFailed: number;
  chunkResults: ChunkResult[];

  // Merge statistics
  mergeStats: MergeStats;

  // Entity provenance
  entityProvenance: EntityProvenance[];

  // Timeline of events
  timeline: ExtractionStep[];

  // Final counts
  finalEntityCount: number;
  finalRelationshipCount: number;

  // Errors/warnings
  errors: string[];
  warnings: string[];
}

/** Summary stats shown after extraction */
export interface ExtractionSummary {
  processingTimeMs: number;
  chunksProcessed: number;
  chunksFailed: number;

  // Before/after comparison
  rawEntities: number;
  finalEntities: number;
  entitiesMerged: number;
  entitiesFiltered: number;

  rawRelationships: number;
  finalRelationships: number;
  relationshipsDropped: number;

  // Breakdown by type
  entityTypeBreakdown: Record<EntityType, number>;
  topRelationshipTypes: Array<{ type: string; count: number }>;

  // Quality indicators
  avgEntitiesPerChunk: number;
  avgRelationshipsPerChunk: number;
  chunkSuccessRate: number;
}

/** Extended progress with detailed information */
export interface DetailedExtractionProgress extends ExtractionProgress {
  // Chunk progress
  currentChunk?: number;
  totalChunks?: number;
  chunkStatuses?: ChunkStatus[];

  // Running counts
  entitiesFound?: number;
  relationshipsFound?: number;

  // Timing
  startTime?: number;
  estimatedTimeRemaining?: number;

  // Current chunk info
  currentChunkPreview?: string;
}
