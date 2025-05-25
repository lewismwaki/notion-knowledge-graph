import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Notion client
export const notion = new Client({ 
  auth: process.env.NOTION_TOKEN 
});
