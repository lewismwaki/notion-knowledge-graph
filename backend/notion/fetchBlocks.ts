import { notion } from './notionClient';
import { rateLimit } from '../utils/rateLimiter';
import { IGNORED_DATABASE_IDS, IGNORE_INLINE_LINKED_DBS, IGNORE_DATABASE_RELATIONS } from './config';

export type Block = {
  id: string;
  type: string;
  has_children: boolean;
  [key: string]: any;
};

export async function fetchBlocksForPage(pageId: string): Promise<Block[]> {
  const blocks: Block[] = [];
  let hasMore = true;
  let cursor: string | undefined = undefined;
  
  console.log(`Fetching blocks for page ${pageId}...`);
  
  while (hasMore) {
    try {
      await rateLimit();
      
      const response = await notion.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 100
      });
      
      blocks.push(...response.results as Block[]);
      
      hasMore = response.has_more;
      cursor = response.next_cursor || undefined;
      
    } catch (error) {
      console.error(`Error fetching blocks for page ${pageId}:`, error);
      break;
    }
  }
  
  // Log database blocks when fetched if we're in debug mode
  const databaseBlocks = blocks.filter(block => block.type === 'child_database');
  if (databaseBlocks.length > 0) {
    console.log(`Found ${databaseBlocks.length} database blocks in page ${pageId}`);
    if (IGNORE_INLINE_LINKED_DBS) {
      console.log(`These database blocks will be ignored due to IGNORE_INLINE_LINKED_DBS=true`);
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
  const skippedDatabases: string[] = [];
  const inlineLinkedDatabases: string[] = [];
  
  // Traverse blocks to find mentions
  for (const block of blocks) {
    extractMentionsFromBlock(block, pageId, mentions);
      // Handle database blocks
    if (block.type === 'child_database') {
      // Skip if the database is in the ignore list
      if (IGNORED_DATABASE_IDS.includes(block.id)) {
        inlineLinkedDatabases.push(block.id);
        console.log(`Ignoring database ${block.id} as it's in the ignored list`);
        continue;
      }
      
      // Skip all inline linked databases if the flag is set
      if (IGNORE_INLINE_LINKED_DBS) {
        inlineLinkedDatabases.push(block.id);
        console.log(`Ignoring database ${block.id} as IGNORE_INLINE_LINKED_DBS is true`);
        continue;
      }
      
      // Skip database relations if the flag is set (only process @mentions)
      if (IGNORE_DATABASE_RELATIONS) {
        inlineLinkedDatabases.push(block.id);
        console.log(`Ignoring database relations for ${block.id} as IGNORE_DATABASE_RELATIONS is true`);
        continue;
      }
      
      try {
        const databaseRelations = await processDatabase(block.id, pageId);
        
        // Add database relations as mentions
        for (const relation of databaseRelations) {
          mentions.push({
            sourcePageId: pageId,
            targetPageId: relation.targetPageId,
            type: relation.type
          });
        }
      } catch (error) {
        skippedDatabases.push(block.id);
        console.warn(`Skipped processing database ${block.id} due to an error`);
      }
    }
  }
  
  if (skippedDatabases.length > 0) {
    console.log(`Note: ${skippedDatabases.length} database(s) were skipped while processing page ${pageId}`);
  }
  
  if (inlineLinkedDatabases.length > 0) {
    console.log(`Note: ${inlineLinkedDatabases.length} inline linked database(s) were ignored while processing page ${pageId}`);
  }
  
  return { blocks, mentions };
}

// Extract @mention connections from a block (ignores database relations)
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
    }  }
  
  // Note: Database relations are handled separately in processBlocksForPage
  // This function only extracts @mention connections between pages
  // If IGNORE_DATABASE_RELATIONS is true, only @mentions will be processed
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
  } catch (error: any) {
    // Check for specific "object_not_found" error
    if (error.code === 'object_not_found') {
      console.warn(`Database not accessible: ${databaseId}. This database needs to be shared with your integration.`);
      console.warn(`To fix this issue:
      1. Go to the database in Notion
      2. Click "Share" in the top-right corner
      3. Click "Add people, groups, or integrations"
      4. Search for and select your integration
      5. Click "Invite"`);    } else {
      console.error(`Error processing database ${databaseId}:`, error);
    }
  }
  
  return relations;
}
  
