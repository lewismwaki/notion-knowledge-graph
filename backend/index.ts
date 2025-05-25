import { buildGraph } from './graph/buildGraph';

console.log('Starting Notion Knowledge Graph Sync...');

// Run the graph build process
buildGraph()
  .then(() => {
    console.log('Graph build completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error building graph:', error);
    process.exit(1);
  });
