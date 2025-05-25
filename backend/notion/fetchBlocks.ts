import { notion } from './notionClient';
import { rateLimit } from '../utils/rateLimiter';

// Type definitions
export type Block = {
  id: string;
  type: string;
  has_children: boolean;
  [key: string]: any;
};

// Fetch blocks for a page with pagination support
export async function fetchBlocksForPage(pageId: string): Promise<Block[]> {
  const blocks: Block[] = [];
  let hasMore = true;
  let cursor: string | undefined = undefined;
  
  console.log(`Fetching blocks for page ${pageId}...`);
  
  while (hasMore) {
    try {
      // Apply rate limiting
      await rateLimit();
      
      // Fetch blocks from Notion
      const response = await notion.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 100
      });
      
      blocks.push(...response.results as Block[]);
      
      // Check if there are more blocks to fetch
      hasMore = response.has_more;
      cursor = response.next_cursor || undefined;
      
    } catch (error) {
      console.error(`Error fetching blocks for page ${pageId}:`, error);
      break;
    }
  }
  
  // Recursively fetch child blocks
  const allBlocks = [...blocks];
  
  for (const block of blocks) {
    if (block.has_children) {
      const childBlocks = await fetchBlocksForPage(block.id);
      allBlocks.push(...childBlocks);
    }
  }
  
  return allBlocks;
}

// Process blocks to extract mentions and other relevant data
export async function processBlocksForPage(pageId: string) {
  const blocks = await fetchBlocksForPage(pageId);
  const mentions: { sourcePageId: string; targetPageId: string; type: 'mention' | 'relation' }[] = [];
  
  // Traverse blocks to find mentions
  for (const block of blocks) {
    extractMentionsFromBlock(block, pageId, mentions);
    
    // Handle database blocks
    if (block.type === 'child_database') {
      const databaseRelations = await processDatabase(block.id, pageId);
      
      // Add database relations as mentions
      for (const relation of databaseRelations) {
        mentions.push({
          sourcePageId: pageId,
          targetPageId: relation.targetPageId,
          type: relation.type
        });
      }
    }
  }
  
  return { blocks, mentions };
}

// Extract mentions from a block
function extractMentionsFromBlock(
  block: Block, 
  sourcePageId: string, 
  mentions: { sourcePageId: string; targetPageId: string; type: 'mention' | 'relation' }[]
) {
  // Handle different block types
  if (block.type === 'paragraph' || 
      block.type === 'heading_1' || 
      block.type === 'heading_2' || 
      block.type === 'heading_3' ||
      block.type === 'bulleted_list_item' ||
      block.type === 'numbered_list_item' ||
      block.type === 'to_do') {
    
    const richText = block[block.type]?.rich_text || [];
    
    for (const text of richText) {
      if (text.type === 'mention' && text.mention.type === 'page') {
        mentions.push({
          sourcePageId,
          targetPageId: text.mention.page.id,
          type: 'mention'
        });
      }
    }
  }
  
  // Handle relation properties in databases
  if (block.type === 'child_database') {
    // We'll handle database relations during processDatabase call
  }
}

// Process a database to extract relation properties
export async function processDatabase(databaseId: string, sourcePageId: string): Promise<{ targetPageId: string; type: 'relation' }[]> {
  const relations: { targetPageId: string; type: 'relation' }[] = [];
  
  try {
    // Apply rate limiting
    await rateLimit();
    
    // Fetch database properties
    const database = await notion.databases.retrieve({ database_id: databaseId });
    
    // Look for relation properties
    const properties = database.properties;
    for (const [key, property] of Object.entries(properties)) {
      // @ts-ignore - The Notion API types are complex
      if (property.type === 'relation') {
        // We found a relation property, now we need to fetch the database items
        let hasMore = true;
        let startCursor: string | undefined = undefined;
        
        while (hasMore) {
          await rateLimit();
          
          // Query the database for pages
          const response = await notion.databases.query({
            database_id: databaseId,
            start_cursor: startCursor,
            page_size: 100
          });
          
          // Process each page's relation properties
          for (const page of response.results) {
            // @ts-ignore - The Notion API types are complex
            const pageProperties = page.properties;
            
            if (pageProperties[key] && 
                // @ts-ignore
                pageProperties[key].type === 'relation' && 
                // @ts-ignore
                Array.isArray(pageProperties[key].relation)) {
              
              // @ts-ignore
              for (const relation of pageProperties[key].relation) {
                if (relation.id) {
                  relations.push({
                    targetPageId: relation.id,
                    type: 'relation'
                  });
                }
              }
            }
          }
          
          hasMore = response.has_more;
          startCursor = response.next_cursor || undefined;
        }
      }
    }
  } catch (error) {
    console.error(`Error processing database ${databaseId}:`, error);
  }
  
  return relations;
}
