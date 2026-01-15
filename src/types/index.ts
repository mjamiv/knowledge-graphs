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
  extractionModel: 'gpt-4o' | 'gpt-4-turbo' | 'gpt-4' | 'gpt-3.5-turbo';
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
  extractionModel: 'gpt-4o',
  maxEntities: 100,
  visualizationMode: '3d',
  showLabels: true,
  showRelationshipLabels: false,
  nodeSize: 'medium',
  theme: 'dark',
};
