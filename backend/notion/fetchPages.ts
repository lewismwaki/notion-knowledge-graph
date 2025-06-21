import { notion } from './notionClient';
import fs from 'fs';
import path from 'path';
import { rateLimit } from '../utils/rateLimiter';
import { processBlocksForPage } from './fetchBlocks';

type SyncState = {
  lastSyncTime: string;
  processedPages: Record<string, string>;
}
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

const saveSyncState = () => {
  syncState.lastSyncTime = new Date().toISOString();
  fs.writeFileSync(syncStatePath, JSON.stringify(syncState, null, 2));
};

async function fetchPageAndChildren(pageId: string, visitedPages = new Set<string>()): Promise<any[]> {
  if (visitedPages.has(pageId)) {
    return [];
  }
  
  visitedPages.add(pageId);
  console.log(`Processing page ${pageId}...`);
  
  try {
    await rateLimit();
    
    const page = await notion.pages.retrieve({ page_id: pageId });
    
    // @ts-ignore - The Notion API types are complex
    const lastEditedTime = page.last_edited_time;
      const needsUpdate = !syncState.processedPages[pageId] || 
                        syncState.processedPages[pageId] !== lastEditedTime;
    
    if (needsUpdate) {
      syncState.processedPages[pageId] = lastEditedTime;
      
      const { blocks } = await processBlocksForPage(pageId);
      
      const childPageIds = new Set<string>();
      for (const block of blocks) {
        if (block.type === 'child_page') {
          childPageIds.add(block.id);
        }
      }
      
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

export async function fetchAllPages() {
  const pages: any[] = [];
  
  console.log('Fetching pages from Notion...');
  
  const rootPageId = "1fd13edac11f803b9ff1e4220dfca3a9";
  
  if (!rootPageId) {
    console.error('NOTION_ROOT_PAGE_ID is not defined in .env file');
    return [];
  }
  
  try {
    const pagesFromRoot = await fetchPageAndChildren(rootPageId);
    pages.push(...pagesFromRoot);
    
    console.log(`Fetched ${pages.length} pages from root page hierarchy`);
    
    let hasMore = true;
    let cursor: string | undefined = undefined;
      while (hasMore) {
      try {
        await rateLimit();
        
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
        
        const filteredPages = response.results.filter(page => {
          // @ts-ignore - The Notion API types are complex
          const lastEditedTime = page.last_edited_time;
          const pageId = page.id;
          
          if (pages.some(p => p.id === pageId)) {
            return false;
          }
          
          if (!syncState.processedPages[pageId] || 
              syncState.processedPages[pageId] !== lastEditedTime) {
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
  } catch (error) {    console.error('Error in fetchAllPages:', error);
  }
  
  saveSyncState();
  
  console.log(`Total pages to process: ${pages.length}`);
  return pages;
}
  
export async function startSync() {
  const pages = await fetchAllPages();
  return pages;
}
