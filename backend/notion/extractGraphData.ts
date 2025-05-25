import { notion } from './notionClient';
import { processBlocksForPage } from './fetchBlocks';
import { normalizeId } from '../utils/idNormalizer';
import { rateLimit } from '../utils/rateLimiter';

// Type definitions for graph data
export type PageNode = {
  id: string;
  label: string;
  url: string;
  tags?: string[];
  type?: string;
  lastEdited?: string;
};

export type Edge = {
  source: string;
  target: string;
  type: 'mention' | 'relation';
};

// Extract data from Notion pages to build graph nodes and edges
export async function extractGraphData(pages: any[]) {
  const nodes: PageNode[] = [];
  const edges: Edge[] = [];
  const nodeMap = new Map<string, PageNode>();
  
  console.log(`Extracting graph data from ${pages.length} pages...`);
  
  for (const page of pages) {
    try {
      // Apply rate limiting
      await rateLimit();
      
      // Get page metadata
      const pageId = normalizeId(page.id);
      const title = await getPageTitle(page);
      const url = page.url;
      
      // Create node for the page
      const node: PageNode = {
        id: pageId,
        label: title,
        url,
        lastEdited: page.last_edited_time
      };
      
      // Add tags if available (for database items)
      if (page.properties) {
        const tags = extractTags(page);
        if (tags.length > 0) {
          node.tags = tags;
        }
        
        // Add page type based on parent database
        if (page.parent?.database_id) {
          node.type = 'database_item';
        } else {
          node.type = 'page';
        }
      }
      
      // Store node in map for deduplication
      nodeMap.set(pageId, node);
      
      // Process blocks to extract mentions
      const { mentions } = await processBlocksForPage(page.id);
      
      // Add edges for mentions
      for (const mention of mentions) {
        const sourceId = normalizeId(mention.sourcePageId);
        const targetId = normalizeId(mention.targetPageId);
        
        // Add edge
        edges.push({
          source: sourceId,
          target: targetId,
          type: mention.type
        });
        
        // If target page is not in our list, we should fetch its basic metadata
        if (!nodeMap.has(targetId)) {
          try {
            await rateLimit();
            const targetPage = await notion.pages.retrieve({ page_id: mention.targetPageId });
            const targetTitle = await getPageTitle(targetPage);
            
            nodeMap.set(targetId, {
              id: targetId,
              label: targetTitle,
              url: "TODO: add url",
              type: 'referenced'
            });
          } catch (error) {
            console.error(`Error fetching referenced page ${targetId}:`, error);
            // Still add a minimal node even if we can't fetch details
            nodeMap.set(targetId, {
              id: targetId,
              label: 'Unknown Page',
              url: `https://notion.so/${targetId.replace(/-/g, '')}`,
              type: 'unknown'
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error processing page ${page.id}:`, error);
    }
  }
  
  // Convert node map to array
  nodes.push(...nodeMap.values());
  
  return { nodes, edges };
}

// Helper function to extract tags from a page
function extractTags(page: any): string[] {
  const tags: string[] = [];
  
  // Look for multi-select or select properties that might contain tags
  if (page.properties) {
    for (const [key, value] of Object.entries(page.properties)) {
      // @ts-ignore - The Notion API types are complex
      if (value.type === 'multi_select' && Array.isArray(value.multi_select)) {
        // @ts-ignore
        tags.push(...value.multi_select.map((tag: any) => tag.name));
      } 
      // @ts-ignore
      else if (value.type === 'select' && value.select?.name) {
        // @ts-ignore
        tags.push(value.select.name);
      }
    }
  }
  
  return tags;
}

// Helper function to get page title
async function getPageTitle(page: any): Promise<string> {
  // For pages with properties (database items)
  if (page.properties) {
    // Try to find a title property
    for (const [key, value] of Object.entries(page.properties)) {
      // @ts-ignore - The Notion API types are complex
      if (value.type === 'title' && Array.isArray(value.title)) {
        // @ts-ignore
        return value.title.map((part: any) => part.plain_text).join('');
      }
    }
  }
  
  // For regular pages, get the title from page content
  try {
    await rateLimit();
    const response = await notion.blocks.children.list({
      block_id: page.id,
      page_size: 1
    });
    
    if (response.results.length > 0) {
      const firstBlock = response.results[0];
      // @ts-ignore
      if (firstBlock.type === 'heading_1' && firstBlock.heading_1?.rich_text) {
        // @ts-ignore
        return firstBlock.heading_1.rich_text.map((part: any) => part.plain_text).join('');
      }
    }
  } catch (error) {
    console.error(`Error getting title for page ${page.id}:`, error);
  }
  
  // Fallback title
  return `Untitled (${page.id.substring(0, 8)})`;
}
