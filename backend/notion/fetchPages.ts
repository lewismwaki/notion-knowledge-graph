import { notion } from './notionClient';
import fs from 'fs';
import path from 'path';
import { rateLimit } from '../utils/rateLimiter';
import { processBlocksForPage } from './fetchBlocks';

// Type definitions
type SyncState = {
  lastSyncTime: string;
  processedPages: Record<string, string>; // pageId -> lastEditedTime
}

// Load sync state if exists
const syncStatePath = path.resolve(__dirname, '../../syncState.json');
let syncState: SyncState = { 
  lastSyncTime: new Date(0).toISOString(), 
  processedPages: {} 
};

if (fs.existsSync(syncStatePath)) {
  try {
    syncState = JSON.parse(fs.readFileSync(syncStatePath, 'utf8'));
  } catch (error) {
    console.error('Error loading sync state:', error);
  }
}

// Save sync state
const saveSyncState = () => {
  syncState.lastSyncTime = new Date().toISOString();
  fs.writeFileSync(syncStatePath, JSON.stringify(syncState, null, 2));
};

// Recursively fetch pages starting from root page
async function fetchPageAndChildren(pageId: string, visitedPages = new Set<string>()): Promise<any[]> {
  if (visitedPages.has(pageId)) {
    return [];
  }
  
  visitedPages.add(pageId);
  console.log(`Processing page ${pageId}...`);
  
  try {
    // Apply rate limiting
    await rateLimit();
    
    // Fetch the page
    const page = await notion.pages.retrieve({ page_id: pageId });
    
    // Check if page has been updated since last sync
    // @ts-ignore - The Notion API types are complex
    const lastEditedTime = page.last_edited_time;
    
    const needsUpdate = !syncState.processedPages[pageId] || 
                        syncState.processedPages[pageId] !== lastEditedTime;
    
    if (needsUpdate) {
      // Update sync state
      syncState.processedPages[pageId] = lastEditedTime;
      
      // Fetch child blocks to find child pages
      const { blocks } = await processBlocksForPage(pageId);
      
      // Find child page references
      const childPageIds = new Set<string>();
      for (const block of blocks) {
        if (block.type === 'child_page') {
          childPageIds.add(block.id);
        }
      }
      
      // Recursively fetch child pages
      const childPages = [];
      for (const childId of childPageIds) {
        const children = await fetchPageAndChildren(childId, visitedPages);
        childPages.push(...children);
      }
      
      return [page, ...childPages];
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching page ${pageId}:`, error);
    return [];
  }
}

// Fetch all pages with pagination support
export async function fetchAllPages() {
  const pages: any[] = [];
  
  console.log('Fetching pages from Notion...');
  
  // Get the root page ID from environment variables
  const rootPageId = "1fd13edac11f803b9ff1e4220dfca3a9";
  
  if (!rootPageId) {
    console.error('NOTION_ROOT_PAGE_ID is not defined in .env file');
    return [];
  }
  
  try {
    // Start recursive fetching from the root page
    const pagesFromRoot = await fetchPageAndChildren(rootPageId);
    pages.push(...pagesFromRoot);
    
    console.log(`Fetched ${pages.length} pages from root page hierarchy`);
    
    // Additionally fetch recent updates using search API to catch any standalone pages
    let hasMore = true;
    let cursor: string | undefined = undefined;
    
    while (hasMore) {
      try {
        // Apply rate limiting
        await rateLimit();
        
        // Fetch pages from Notion
        const response = await notion.search({
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time'
          },
          filter: {
            property: 'object',
            value: 'page'
          },
          start_cursor: cursor,
          page_size: 100
        });
        
        // Process pages and check if they're updated since last sync
        const filteredPages = response.results.filter(page => {
          // @ts-ignore - The Notion API types are complex
          const lastEditedTime = page.last_edited_time;
          const pageId = page.id;
          
          // Skip pages we've already processed
          if (pages.some(p => p.id === pageId)) {
            return false;
          }
          
          // Check if page has been updated since last sync
          if (!syncState.processedPages[pageId] || 
              syncState.processedPages[pageId] !== lastEditedTime) {
            // Update sync state
            syncState.processedPages[pageId] = lastEditedTime;
            return true;
          }
          return false;
        });
        
        pages.push(...filteredPages);
        hasMore = response.has_more;
        cursor = response.next_cursor || undefined;
        
        console.log(`Fetched batch of ${response.results.length} pages, ${filteredPages.length} need updating`);
        
      } catch (error) {
        console.error('Error fetching pages:', error);
        break;
      }
    }
  } catch (error) {
    console.error('Error in fetchAllPages:', error);
  }
  
  // Save the updated sync state
  saveSyncState();
  
  console.log(`Total pages to process: ${pages.length}`);
  return pages;
}
  
// Main function to initiate page fetching
export async function startSync() {
  const pages = await fetchAllPages();
  return pages;
}
