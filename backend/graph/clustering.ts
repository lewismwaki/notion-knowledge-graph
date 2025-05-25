// Clustering logic for graph nodes
import { PageNode, Edge } from '../notion/extractGraphData';

// Type for cluster information
export type ClusterInfo = {
  id: string;
  label: string;
  nodes: string[]; // Node IDs
};

// Cluster nodes by tags
export function clusterByTags(nodes: PageNode[]): ClusterInfo[] {
  const clusters: Map<string, string[]> = new Map();
  const uncategorized: string[] = [];
  
  // Group nodes by tags
  for (const node of nodes) {
    if (node.tags && node.tags.length > 0) {
      // Add node to each of its tag clusters
      for (const tag of node.tags) {
        if (!clusters.has(tag)) {
          clusters.set(tag, []);
        }
        clusters.get(tag)!.push(node.id);
      }
    } else {
      // Add to uncategorized
      uncategorized.push(node.id);
    }
  }
  
  // Convert to ClusterInfo array
  const result: ClusterInfo[] = [];
  
  // Add tag-based clusters
  for (const [tag, nodeIds] of clusters.entries()) {
    result.push({
      id: `tag-${tag.replace(/\s+/g, '-').toLowerCase()}`,
      label: tag,
      nodes: nodeIds
    });
  }
  
  // Add uncategorized cluster if needed
  if (uncategorized.length > 0) {
    result.push({
      id: 'uncategorized',
      label: 'Uncategorized',
      nodes: uncategorized
    });
  }
  
  return result;
}

// Cluster nodes by connections (community detection)
export function clusterByConnections(nodes: PageNode[], edges: Edge[]): ClusterInfo[] {
  // Simple community detection algorithm:
  // 1. Calculate connection strength for each pair of nodes
  // 2. Group nodes that are strongly connected
  
  // Map each node ID to its index in the nodes array for quick lookup
  const nodeIdToIndex = new Map<string, number>();
  nodes.forEach((node, index) => {
    nodeIdToIndex.set(node.id, index);
  });
  
  // Create adjacency matrix
  const n = nodes.length;
  const adjacencyMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  // Fill adjacency matrix
  for (const edge of edges) {
    const sourceIndex = nodeIdToIndex.get(edge.source);
    const targetIndex = nodeIdToIndex.get(edge.target);
    
    if (sourceIndex !== undefined && targetIndex !== undefined) {
      adjacencyMatrix[sourceIndex][targetIndex] += 1;
      adjacencyMatrix[targetIndex][sourceIndex] += 1; // Undirected graph
    }
  }
  
  // Simple community detection (based on connection count)
  const communities: number[][] = [];
  const visited = new Set<number>();
  
  // Threshold for considering nodes connected
  const THRESHOLD = 1;
  
  // Helper function for DFS
  function dfs(nodeIndex: number, community: number[]) {
    visited.add(nodeIndex);
    community.push(nodeIndex);
    
    for (let i = 0; i < n; i++) {
      if (!visited.has(i) && adjacencyMatrix[nodeIndex][i] >= THRESHOLD) {
        dfs(i, community);
      }
    }
  }
  
  // Find communities
  for (let i = 0; i < n; i++) {
    if (!visited.has(i)) {
      const community: number[] = [];
      dfs(i, community);
      communities.push(community);
    }
  }
  
  // Convert to ClusterInfo
  return communities.map((community, index) => {
    const communityNodes = community.map(nodeIndex => nodes[nodeIndex].id);
    return {
      id: `community-${index}`,
      label: `Group ${index + 1}`,
      nodes: communityNodes
    };
  });
}

// Main function to generate clusters
export function generateClusters(nodes: PageNode[], edges: Edge[]): { 
  byTags: ClusterInfo[]; 
  byConnections: ClusterInfo[]; 
} {
  return {
    byTags: clusterByTags(nodes),
    byConnections: clusterByConnections(nodes, edges)
  };
}
