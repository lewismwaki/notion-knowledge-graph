import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env file
dotenv.config();

// Check for Notion API token in environment variables
const NOTION_API_TOKEN = process.env.NOTION_API_TOKEN;

if (!process.env.NOTION_API_TOKEN) {
  console.warn('Warning: NOTION_API_TOKEN not found in environment variables. Using fallback token.');
  console.warn('For better security, consider adding your token to a .env file:');
  console.warn('NOTION_API_TOKEN=your_secret_token');
  
  // Create .env file template if it doesn't exist
  const envPath = path.resolve(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, 'NOTION_API_TOKEN=your_secret_token\n');
    console.warn(`.env template created at ${envPath}`);
  }
}

// Initialize Notion client
export const notion = new Client({ 
  auth: NOTION_API_TOKEN
});
