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
