/**
 * Configuration for Notion graph extraction
 * 
 * This file contains settings that control how the Notion API client
 * behaves when extracting data from your Notion workspace.
 * 
 * RECOMMENDED SETTINGS:
 * - Set IGNORE_INLINE_LINKED_DBS = true to skip databases embedded within pages
 * - Set IGNORE_DATABASE_RELATIONS = false to keep your main database processing
 * - Use @mentions for explicit connections between pages
 * - Use tags for clustering and organization
 */

// Array of database IDs to ignore when building the graph
// You can add specific database IDs here if you want to exclude them
// Example: ['1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p']
export const IGNORED_DATABASE_IDS: string[] = [];

// Flag to ignore all inline linked databases (child_database blocks)
// When set to true, inline database blocks within pages will be skipped
// This keeps your main database but ignores linked databases embedded in pages
export const IGNORE_INLINE_LINKED_DBS = true;

// Flag to control database relation processing
// When set to false, database relations from your main database will be processed
// When set to true, only @mention connections will be used for graph edges
export const IGNORE_DATABASE_RELATIONS = false;
