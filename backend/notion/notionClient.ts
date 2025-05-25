import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Initialize Notion client
export const notion = new Client({ 
  auth: "ntn_v53494909755icox0SBbZWGdcSr0176qmix43211Lg4916"
});
