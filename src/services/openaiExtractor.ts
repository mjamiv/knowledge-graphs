import OpenAI from 'openai';
import {
  Entity,
  Relationship,
  KnowledgeGraph,
  EntityType,
  ExtractionProgress,
  ExtractionLog,
  ChunkResult,
  ChunkStatus,
  EntityProvenance,
  MergeStats,
  ExtractionStep,
  DetailedExtractionProgress,
  RawRelationship,
} from '../types';
import { chunkText } from './documentParser';

interface RawEntity {
  name: string;
  type: string;
  description?: string;
}

interface RawRelationshipInput {
  source: string;
  target: string;
  type: string;
  description?: string;
}

/** Result from the extraction including the graph and detailed log */
export interface ExtractionResultWithLog {
  graph: KnowledgeGraph;
  log: ExtractionLog;
}

/** Callbacks for detailed progress updates */
export interface ExtractionCallbacks {
  onProgress?: (progress: ExtractionProgress) => void;
  onDetailedProgress?: (progress: DetailedExtractionProgress) => void;
  onChunkComplete?: (result: ChunkResult) => void;
  onTimelineEvent?: (event: ExtractionStep) => void;
}

const CHUNK_SIZE = 6000;
const CHUNK_OVERLAP = 200;

/**
 * Extract knowledge graph from document text using OpenAI
 * Returns both the graph and a detailed extraction log
 */
export async function extractKnowledgeGraphWithLog(
  text: string,
  apiKey: string,
  model: string = 'gpt-4o',
  maxEntities: number = 100,
  documentName: string = 'document',
  documentSize: number = 0,
  callbacks: ExtractionCallbacks = {}
): Promise<ExtractionResultWithLog> {
  const { onProgress, onDetailedProgress, onChunkComplete, onTimelineEvent } = callbacks;

  const startTime = Date.now();
  const logId = generateId();
  const timeline: ExtractionStep[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Helper to add timeline events
  const addTimelineEvent = (stage: ExtractionProgress['stage'], message: string, details?: Record<string, unknown>) => {
    const event: ExtractionStep = { timestamp: Date.now(), stage, message, details };
    timeline.push(event);
    onTimelineEvent?.(event);
  };

  // Helper to report progress
  const reportProgress = (
    stage: ExtractionProgress['stage'],
    progress: number,
    message: string,
    extra?: Partial<DetailedExtractionProgress>
  ) => {
    onProgress?.({ stage, progress, message });
    onDetailedProgress?.({ stage, progress, message, startTime, ...extra });
  };

  addTimelineEvent('reading', 'Starting extraction process');

  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  reportProgress('reading', 5, 'Preparing document for analysis...');
  addTimelineEvent('reading', `Document: ${documentName}, ${text.length.toLocaleString()} characters`);

  // Chunk the text
  const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);
  const totalChunks = chunks.length;

  addTimelineEvent('reading', `Split into ${totalChunks} chunks`, {
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
    totalChunks,
  });

  reportProgress('extracting', 10, `Analyzing ${totalChunks} text segment${totalChunks > 1 ? 's' : ''}...`, {
    totalChunks,
    currentChunk: 0,
    chunkStatuses: chunks.map(() => 'pending' as ChunkStatus),
  });

  // Initialize chunk tracking
  const chunkResults: ChunkResult[] = [];
  const chunkStatuses: ChunkStatus[] = chunks.map(() => 'pending');

  // Raw extraction storage (before dedup)
  const rawEntitiesByChunk: Entity[][] = [];
  const rawRelationshipsByChunk: RawRelationship[][] = [];
  let totalRawEntities = 0;
  let totalRawRelationships = 0;

  // Extract from each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkStartTime = Date.now();
    chunkStatuses[i] = 'processing';

    const progress = 10 + ((i + 1) / totalChunks) * 65;
    reportProgress('extracting', progress, `Extracting from segment ${i + 1}/${totalChunks}...`, {
      currentChunk: i + 1,
      totalChunks,
      chunkStatuses: [...chunkStatuses],
      entitiesFound: totalRawEntities,
      relationshipsFound: totalRawRelationships,
      currentChunkPreview: chunk.slice(0, 100) + '...',
    });

    addTimelineEvent('extracting', `Processing chunk ${i + 1}/${totalChunks}`, {
      chunkIndex: i,
      chunkLength: chunk.length,
    });

    const chunkResult: ChunkResult = {
      chunkIndex: i,
      status: 'processing',
      contentPreview: chunk.slice(0, 200),
      contentLength: chunk.length,
      startTime: chunkStartTime,
      entitiesExtracted: 0,
      relationshipsExtracted: 0,
      entities: [],
      relationships: [],
    };

    try {
      const { entities, relationships, rawResponse } = await extractFromChunkDetailed(openai, chunk, model);

      chunkResult.status = 'success';
      chunkResult.endTime = Date.now();
      chunkResult.durationMs = chunkResult.endTime - chunkStartTime;
      chunkResult.entitiesExtracted = entities.length;
      chunkResult.relationshipsExtracted = relationships.length;
      chunkResult.entities = entities;
      chunkResult.relationships = relationships;
      chunkResult.rawResponse = rawResponse;

      chunkStatuses[i] = 'success';

      // Store raw results
      rawEntitiesByChunk.push(entities);
      rawRelationshipsByChunk.push(relationships);
      totalRawEntities += entities.length;
      totalRawRelationships += relationships.length;

      addTimelineEvent('extracting', `Chunk ${i + 1} complete: ${entities.length} entities, ${relationships.length} relationships`, {
        chunkIndex: i,
        entitiesExtracted: entities.length,
        relationshipsExtracted: relationships.length,
        durationMs: chunkResult.durationMs,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      chunkResult.status = 'failed';
      chunkResult.endTime = Date.now();
      chunkResult.durationMs = chunkResult.endTime - chunkStartTime;
      chunkResult.error = errorMsg;

      chunkStatuses[i] = 'failed';
      errors.push(`Chunk ${i + 1} failed: ${errorMsg}`);

      addTimelineEvent('error', `Chunk ${i + 1} failed: ${errorMsg}`, { chunkIndex: i, error: errorMsg });

      // Store empty results for this chunk
      rawEntitiesByChunk.push([]);
      rawRelationshipsByChunk.push([]);
    }

    chunkResults.push(chunkResult);
    onChunkComplete?.(chunkResult);
  }

  // Building phase - merge and deduplicate
  reportProgress('building', 80, 'Merging entities and building graph...', {
    entitiesFound: totalRawEntities,
    relationshipsFound: totalRawRelationships,
  });
  addTimelineEvent('building', 'Starting entity deduplication and merge');

  // Track entity provenance
  const entityProvenanceMap = new Map<string, EntityProvenance>();
  const allEntities = new Map<string, Entity>();

  // Process entities from all chunks
  for (let chunkIdx = 0; chunkIdx < rawEntitiesByChunk.length; chunkIdx++) {
    const chunkEntities = rawEntitiesByChunk[chunkIdx];

    for (const entity of chunkEntities) {
      const normalizedName = entity.name.toLowerCase().trim();

      if (allEntities.has(normalizedName)) {
        // Update provenance for existing entity
        const provenance = entityProvenanceMap.get(normalizedName)!;
        provenance.sourceChunks.push(chunkIdx);
        provenance.mentionCount++;
        if (entity.description && !provenance.originalDescriptions.includes(entity.description)) {
          provenance.originalDescriptions.push(entity.description);
        }
      } else {
        // New entity
        allEntities.set(normalizedName, entity);
        entityProvenanceMap.set(normalizedName, {
          entityId: entity.id,
          entityName: entity.name,
          sourceChunks: [chunkIdx],
          firstMentionChunk: chunkIdx,
          mentionCount: 1,
          originalDescriptions: entity.description ? [entity.description] : [],
        });
      }
    }
  }

  const uniqueEntityCount = allEntities.size;
  const duplicatesMerged = totalRawEntities - uniqueEntityCount;

  addTimelineEvent('building', `Entity deduplication: ${totalRawEntities} → ${uniqueEntityCount} (${duplicatesMerged} duplicates merged)`);

  // Apply entity limit
  let entities = Array.from(allEntities.values());
  let entitiesDropped = 0;

  if (entities.length > maxEntities) {
    // Collect all raw relationships for prioritization
    const allRawRelationships = rawRelationshipsByChunk.flat();

    // Prioritize entities that appear in relationships
    const entityInRelationship = new Set<string>();
    allRawRelationships.forEach((r) => {
      entityInRelationship.add(r.source.toLowerCase());
      entityInRelationship.add(r.target.toLowerCase());
    });

    entities = entities
      .sort((a, b) => {
        const aInRel = entityInRelationship.has(a.name.toLowerCase()) ? 1 : 0;
        const bInRel = entityInRelationship.has(b.name.toLowerCase()) ? 1 : 0;
        return bInRel - aInRel;
      })
      .slice(0, maxEntities);

    entitiesDropped = uniqueEntityCount - entities.length;
    warnings.push(`Entity limit reached: dropped ${entitiesDropped} entities (kept ${maxEntities})`);
    addTimelineEvent('building', `Applied entity limit: ${uniqueEntityCount} → ${maxEntities} (${entitiesDropped} dropped)`);
  }

  // Create entity ID map for relationship resolution
  const entityIdMap = new Map<string, string>();
  entities.forEach((e) => {
    entityIdMap.set(e.name.toLowerCase(), e.id);
  });

  // Resolve and deduplicate relationships
  reportProgress('building', 90, 'Resolving relationships...');
  addTimelineEvent('building', 'Starting relationship resolution');

  const allRawRelationships = rawRelationshipsByChunk.flat();
  const relationshipSet = new Set<string>();
  const relationships: Relationship[] = [];
  let unresolvedRelationships = 0;
  let selfReferenceRelationships = 0;
  let duplicateRelationships = 0;

  allRawRelationships.forEach((r) => {
    const sourceId = entityIdMap.get(r.source.toLowerCase());
    const targetId = entityIdMap.get(r.target.toLowerCase());

    if (!sourceId || !targetId) {
      unresolvedRelationships++;
      return;
    }

    if (sourceId === targetId) {
      selfReferenceRelationships++;
      return;
    }

    const key = `${sourceId}-${r.type}-${targetId}`;
    if (relationshipSet.has(key)) {
      duplicateRelationships++;
      return;
    }

    relationshipSet.add(key);
    relationships.push({
      id: generateId(),
      source: sourceId,
      target: targetId,
      type: r.type.toLowerCase().replace(/\s+/g, '_'),
      description: r.description,
    });
  });

  addTimelineEvent('building', `Relationship resolution complete: ${relationships.length} resolved`, {
    totalRaw: totalRawRelationships,
    resolved: relationships.length,
    unresolved: unresolvedRelationships,
    selfReferences: selfReferenceRelationships,
    duplicates: duplicateRelationships,
  });

  // Build merge statistics
  const mergeStats: MergeStats = {
    rawEntityCount: totalRawEntities,
    uniqueEntityCount,
    filteredEntityCount: entities.length,
    entitiesDropped,
    rawRelationshipCount: totalRawRelationships,
    resolvedRelationshipCount: relationships.length + unresolvedRelationships + selfReferenceRelationships,
    uniqueRelationshipCount: relationships.length,
    relationshipsDropped: unresolvedRelationships + selfReferenceRelationships + duplicateRelationships,
    duplicateEntitiesMerged: duplicatesMerged,
    duplicateRelationshipsMerged: duplicateRelationships,
  };

  // Build entity type counts
  const entityTypes: Record<EntityType, number> = {
    person: 0,
    organization: 0,
    location: 0,
    concept: 0,
    event: 0,
    technology: 0,
    document: 0,
    date: 0,
    other: 0,
  };
  entities.forEach((e) => {
    entityTypes[e.type] = (entityTypes[e.type] || 0) + 1;
  });

  const relationshipTypes: Record<string, number> = {};
  relationships.forEach((r) => {
    relationshipTypes[r.type] = (relationshipTypes[r.type] || 0) + 1;
  });

  // Complete
  const endTime = Date.now();
  const totalDurationMs = endTime - startTime;

  reportProgress('complete', 100, `Extracted ${entities.length} entities and ${relationships.length} relationships`);
  addTimelineEvent('complete', `Extraction complete in ${(totalDurationMs / 1000).toFixed(1)}s`, {
    totalEntities: entities.length,
    totalRelationships: relationships.length,
    durationMs: totalDurationMs,
  });

  // Build the graph
  const graphId = generateId();
  const graph: KnowledgeGraph = {
    id: graphId,
    name: `Knowledge Graph ${new Date().toLocaleDateString()}`,
    description: `Extracted using ${model}`,
    entities,
    relationships,
    metadata: {
      extractionModel: model,
      nodeCount: entities.length,
      edgeCount: relationships.length,
      entityTypes,
      relationshipTypes,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Build the extraction log
  const chunksSucceeded = chunkResults.filter((r) => r.status === 'success').length;
  const chunksFailed = chunkResults.filter((r) => r.status === 'failed').length;

  // Update provenance with final entity IDs
  const entityProvenance: EntityProvenance[] = [];
  entities.forEach((entity) => {
    const normalizedName = entity.name.toLowerCase().trim();
    const prov = entityProvenanceMap.get(normalizedName);
    if (prov) {
      entityProvenance.push({
        ...prov,
        entityId: entity.id, // Update to final ID
      });
    }
  });

  const log: ExtractionLog = {
    id: logId,
    graphId,
    startTime,
    endTime,
    totalDurationMs,
    documentName,
    documentSize,
    documentCharCount: text.length,
    model,
    maxEntities,
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
    totalChunks,
    chunksSucceeded,
    chunksFailed,
    chunkResults,
    mergeStats,
    entityProvenance,
    timeline,
    finalEntityCount: entities.length,
    finalRelationshipCount: relationships.length,
    errors,
    warnings,
  };

  return { graph, log };
}

/**
 * Legacy function for backward compatibility
 */
export async function extractKnowledgeGraph(
  text: string,
  apiKey: string,
  model: string = 'gpt-4o',
  maxEntities: number = 100,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<KnowledgeGraph> {
  const result = await extractKnowledgeGraphWithLog(
    text,
    apiKey,
    model,
    maxEntities,
    'document',
    0,
    { onProgress }
  );
  return result.graph;
}

/**
 * Extract entities and relationships from a single text chunk with detailed response
 */
async function extractFromChunkDetailed(
  openai: OpenAI,
  text: string,
  model: string
): Promise<{ entities: Entity[]; relationships: RawRelationship[]; rawResponse: string }> {
  const systemPrompt = `You are a knowledge graph extraction expert. Your task is to analyze text and extract entities and relationships to build a knowledge graph.

Extract the following:
1. ENTITIES: Named entities with their types. Types should be one of: person, organization, location, concept, event, technology, document, date, other
2. RELATIONSHIPS: Connections between entities with relationship types

Return your response as valid JSON with this exact structure:
{
  "entities": [
    {"name": "Entity Name", "type": "entity_type", "description": "Brief description"}
  ],
  "relationships": [
    {"source": "Source Entity Name", "target": "Target Entity Name", "type": "relationship_type", "description": "Brief description"}
  ]
}

Guidelines:
- Extract meaningful entities (not generic words)
- Use consistent naming for the same entity
- Relationship types should be concise verbs or verb phrases (e.g., "works_for", "located_in", "created_by")
- Only include relationships where both entities are in your entities list
- Be thorough but avoid duplicates`;

  const userPrompt = `Extract entities and relationships from this text:\n\n${text}`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content || '{}';

  const parsed = JSON.parse(content) as {
    entities?: RawEntity[];
    relationships?: RawRelationshipInput[];
  };

  // Convert to our format with IDs
  const entities: Entity[] = (parsed.entities || []).map((e) => ({
    id: generateId(),
    name: e.name,
    type: normalizeEntityType(e.type),
    description: e.description,
  }));

  const relationships: RawRelationship[] = (parsed.relationships || []).map((r) => ({
    source: r.source,
    target: r.target,
    type: r.type.toLowerCase().replace(/\s+/g, '_'),
    description: r.description,
  }));

  return { entities, relationships, rawResponse: content };
}

/**
 * Normalize entity type string to valid EntityType
 */
function normalizeEntityType(type: string): EntityType {
  const normalized = type.toLowerCase().trim();

  const typeMap: Record<string, EntityType> = {
    person: 'person',
    people: 'person',
    human: 'person',
    individual: 'person',
    organization: 'organization',
    org: 'organization',
    company: 'organization',
    institution: 'organization',
    location: 'location',
    place: 'location',
    city: 'location',
    country: 'location',
    concept: 'concept',
    idea: 'concept',
    theory: 'concept',
    event: 'event',
    occurrence: 'event',
    technology: 'technology',
    tech: 'technology',
    software: 'technology',
    tool: 'technology',
    document: 'document',
    file: 'document',
    paper: 'document',
    date: 'date',
    time: 'date',
    datetime: 'date',
  };

  return typeMap[normalized] || 'other';
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Test the OpenAI API connection
 */
export async function testApiConnection(apiKey: string): Promise<boolean> {
  try {
    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    await openai.models.list();
    return true;
  } catch {
    return false;
  }
}
