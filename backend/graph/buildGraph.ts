import fs from 'fs';
import path from 'path';
import { extractGraphData } from '../notion/extractGraphData';
import { startSync } from '../notion/fetchPages';
import { generateClusters } from './clustering';

// Main function to build the graph
export async function buildGraph() {
  try {
    console.log('Starting graph build process...');
    
    // Step 1: Sync with Notion to get updated pages
    const pages = await startSync();
    
    if (pages.length === 0) {
      console.log('No pages to process. Graph remains unchanged.');
      return;
    }
    
    // Step 2: Extract graph data from pages
    const { nodes, edges } = await extractGraphData(pages);
    
    console.log(`Built graph with ${nodes.length} nodes and ${edges.length} edges`);
    
    // Step 3: Generate clusters
    const clusters = generateClusters(nodes, edges);
    console.log(`Generated ${clusters.byTags.length} tag clusters and ${clusters.byConnections.length} connection clusters`);
    
    // Step 4: Export as graph.json for the frontend
    const outputDir = path.resolve(__dirname, '../../app/public');
    
    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, 'graph.json');
    fs.writeFileSync(outputPath, JSON.stringify({ 
      nodes, 
      edges,
      clusters: clusters 
    }, null, 2));
    
    console.log(`Graph exported to ${outputPath}`);
    
    // Show a summary about permission issues if there were any
    const unknownNodes = nodes.filter(node => node.type === 'unknown').length;
    if (unknownNodes > 0) {
      console.log(`\nPermission Summary:`);
      console.log(`Found ${unknownNodes} page(s) that couldn't be fully accessed.`);
      console.log(`If you're seeing errors about databases not being found, please ensure all relevant`);
      console.log(`databases and pages are shared with your Notion integration.`);
      console.log(`\nTo share content with your integration:`);
      console.log(`1. Go to the page or database in Notion`);
      console.log(`2. Click "Share" in the top-right corner`);
      console.log(`3. Click "Add people, groups, or integrations"`);
      console.log(`4. Search for and select your integration`);
      console.log(`5. Click "Invite"`);
    }
    
  } catch (error) {
    console.error('Error building graph:', error);
  }
}

// Run the build process if this file is executed directly
if (require.main === module) {
  buildGraph()
    .then(() => console.log('Graph build completed.'))
    .catch(err => console.error('Graph build failed:', err));
}
