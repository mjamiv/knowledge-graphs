import OpenAI from 'openai';
import {
  Entity,
  Relationship,
  KnowledgeGraph,
  EntityType,
  ExtractionProgress,
} from '../types';
import { chunkText } from './documentParser';

interface ExtractionResult {
  entities: Entity[];
  relationships: Relationship[];
}

interface RawEntity {
  name: string;
  type: string;
  description?: string;
}

interface RawRelationship {
  source: string;
  target: string;
  type: string;
  description?: string;
}

/**
 * Extract knowledge graph from document text using OpenAI
 */
export async function extractKnowledgeGraph(
  text: string,
  apiKey: string,
  model: string = 'gpt-4o',
  maxEntities: number = 100,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<KnowledgeGraph> {
  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true, // Required for client-side usage
  });

  onProgress?.({
    stage: 'reading',
    progress: 10,
    message: 'Preparing document for analysis...',
  });

  // Chunk the text if it's too long
  const chunks = chunkText(text, 6000, 200);
  const totalChunks = chunks.length;

  onProgress?.({
    stage: 'extracting',
    progress: 20,
    message: `Analyzing ${totalChunks} text segment${totalChunks > 1 ? 's' : ''}...`,
  });

  // Extract from each chunk
  const allEntities: Map<string, Entity> = new Map();
  const allRelationships: Relationship[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const progress = 20 + ((i + 1) / totalChunks) * 60;

    onProgress?.({
      stage: 'extracting',
      progress,
      message: `Extracting entities from segment ${i + 1}/${totalChunks}...`,
    });

    try {
      const result = await extractFromChunk(openai, chunk, model);

      // Merge entities (deduplicate by normalized name)
      result.entities.forEach((entity) => {
        const normalizedName = entity.name.toLowerCase().trim();
        if (!allEntities.has(normalizedName)) {
          allEntities.set(normalizedName, entity);
        }
      });

      // Add relationships (will deduplicate later)
      allRelationships.push(...result.relationships);
    } catch (error) {
      console.error(`Error extracting from chunk ${i + 1}:`, error);
    }
  }

  onProgress?.({
    stage: 'building',
    progress: 85,
    message: 'Building knowledge graph...',
  });

  // Convert to arrays and limit entities
  let entities = Array.from(allEntities.values());
  if (entities.length > maxEntities) {
    // Prioritize entities that appear in relationships
    const entityInRelationship = new Set<string>();
    allRelationships.forEach((r) => {
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
  }

  // Create entity ID map for relationship resolution
  const entityIdMap = new Map<string, string>();
  entities.forEach((e) => {
    entityIdMap.set(e.name.toLowerCase(), e.id);
  });

  // Resolve and deduplicate relationships
  const relationshipSet = new Set<string>();
  const relationships: Relationship[] = [];

  allRelationships.forEach((r) => {
    const sourceId = entityIdMap.get(r.source.toLowerCase());
    const targetId = entityIdMap.get(r.target.toLowerCase());

    if (sourceId && targetId && sourceId !== targetId) {
      const key = `${sourceId}-${r.type}-${targetId}`;
      if (!relationshipSet.has(key)) {
        relationshipSet.add(key);
        relationships.push({
          ...r,
          id: generateId(),
          source: sourceId,
          target: targetId,
        });
      }
    }
  });

  onProgress?.({
    stage: 'complete',
    progress: 100,
    message: 'Knowledge graph created successfully!',
  });

  // Build metadata
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

  const graphId = generateId();

  return {
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
}

/**
 * Extract entities and relationships from a single text chunk
 */
async function extractFromChunk(
  openai: OpenAI,
  text: string,
  model: string
): Promise<ExtractionResult> {
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

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { entities: [], relationships: [] };
    }

    const parsed = JSON.parse(content) as {
      entities?: RawEntity[];
      relationships?: RawRelationship[];
    };

    // Convert to our format with IDs
    const entities: Entity[] = (parsed.entities || []).map((e) => ({
      id: generateId(),
      name: e.name,
      type: normalizeEntityType(e.type),
      description: e.description,
    }));

    const relationships: Relationship[] = (parsed.relationships || []).map((r) => ({
      id: generateId(),
      source: r.source,
      target: r.target,
      type: r.type.toLowerCase().replace(/\s+/g, '_'),
      description: r.description,
    }));

    return { entities, relationships };
  } catch (error) {
    console.error('OpenAI extraction error:', error);
    return { entities: [], relationships: [] };
  }
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
