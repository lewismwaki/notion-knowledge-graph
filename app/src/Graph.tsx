import { useEffect, useRef } from 'react';
import { Sigma } from 'sigma';
import GraphAdapter from './utils/GraphAdapter';
import Attributes  from 'graphology-types';
import './Graph.css';

// Type definitions for graph data
type PageNode = {
  id: string;
  label: string;
  url: string;
  tags?: string[];
  type?: string;
  lastEdited?: string;
};

type Edge = {
  source: string;
  target: string;
  type: 'mention' | 'relation';
};

type ClusterInfo = {
  id: string;
  label: string;
  nodes: string[]; // Node IDs
};

type GraphData = {
  nodes: PageNode[];
  edges: Edge[];
  clusters?: ClusterInfo[];
};

type GraphProps = {
  graph: GraphData;
};

// Node color mapping by type
const TYPE_COLORS: Record<string, string> = {
  'page': '#6889FF',
  'database_item': '#FF6868',
  'referenced': '#68FF7B',
  'unknown': '#C0C0C0'
};

// Color palette for clusters
const CLUSTER_COLORS = [
  '#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6', 
  '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D',
  '#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A', 
  '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC'
];

// Calculate node size based on number of connections
function calculateNodeSize(graph: GraphData, nodeId: string): number {
  const baseSize = 5;
  const connections = graph.edges.filter(
    edge => edge.source === nodeId || edge.target === nodeId
  ).length;
  
  return baseSize + Math.min(Math.sqrt(connections) * 2, 15);
}

const GraphComponent: React.FC<GraphProps> = ({ graph }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear previous graph
    if (sigmaRef.current) {
      sigmaRef.current.kill();
      sigmaRef.current = null;
    }
    
    // Create new graph instance
    const graphAdapter = new GraphAdapter();
    
    // Create a map for node clustering
    const nodeClusterMap = new Map<string, number>();
    
    // Apply clustering if available
    if (graph.clusters && graph.clusters.length > 0) {
      graph.clusters.forEach((cluster: ClusterInfo, index: number) => {
        // Assign cluster index to each node in the cluster
        cluster.nodes.forEach(nodeId => {
          nodeClusterMap.set(nodeId, index);
        });
      });
    }
    
    // Add nodes
    graph.nodes.forEach(node => {
      const size = calculateNodeSize(graph, node.id);
      let color = TYPE_COLORS[node.type || 'page'] || '#6889FF';
      
      // Apply cluster coloring if node is in a cluster
      if (nodeClusterMap.has(node.id)) {
        const clusterIndex = nodeClusterMap.get(node.id)!;
        color = CLUSTER_COLORS[clusterIndex % CLUSTER_COLORS.length];
      }
      
      graphAdapter.addNode(node.id, {
        label: node.label,
        size,
        color,
        url: node.url,
        x: Math.random(),  // Random initial positions
        y: Math.random()
      });
    });
    
    // Add edges
    graph.edges.forEach((edge, index) => {
      // Skip if source or target doesn't exist
      if (!graphAdapter.hasNode(edge.source) || !graphAdapter.hasNode(edge.target)) {
        return;
      }
      
      const edgeId = `e${index}`;
      graphAdapter.addEdge(edge.source, edge.target, {
        id: edgeId,
        size: edge.type === 'relation' ? 2 : 1,
        color: edge.type === 'relation' ? '#FF0000' : '#999999'
      });
    });
    
    // Initialize Sigma
    const sigma = new Sigma(graphAdapter.getGraph(), containerRef.current, {
      renderEdgeLabels: false,
      labelRenderedSizeThreshold: 1,
      minCameraRatio: 0.1,
      maxCameraRatio: 10
    });
    
    // Handle node click to open Notion page
    sigma.on('clickNode', (event) => {
      const nodeAttributes = graphAdapter.getNodeAttributes(event.node) as Attributes & {url?: string};
      if (nodeAttributes.url) {
        window.open(nodeAttributes.url, '_blank');
      }
    });
    
    // Handle hover effects
    sigma.on('enterNode', (event) => {
      const nodeId = event.node;
      graphAdapter.forEachNode((node: string) => {
        if (node === nodeId) {
          graphAdapter.setNodeAttribute(node, 'highlighted', true);
        } else {
          const isConnected = graphAdapter.someNeighbor(nodeId, (_: string, neighbor: string) => neighbor === node);
          if (isConnected) {
            graphAdapter.setNodeAttribute(node, 'highlighted', true);
          } else {
            graphAdapter.setNodeAttribute(node, 'color', '#E5E5E5');
            graphAdapter.setNodeAttribute(node, 'highlighted', false);
          }
        }
      });
      
      graphAdapter.forEachEdge((edge: string) => {
        const { source, target } = graphAdapter.extremities(edge);
        
        if (source === nodeId || target === nodeId) {
          graphAdapter.setEdgeAttribute(edge, 'highlighted', true);
        } else {
          graphAdapter.setEdgeAttribute(edge, 'color', '#ECECEC');
          graphAdapter.setEdgeAttribute(edge, 'highlighted', false);
        }
      });
    });
    
    sigma.on('leaveNode', () => {
      // Reset node colors
      graphAdapter.forEachNode((node: string) => {
        const nodeData = graphAdapter.getNodeAttributes(node) as PageNode & Attributes;
        
        // Get original color (either from type or cluster)
        let color = TYPE_COLORS[nodeData.type || 'page'] || '#6889FF';
        
        // Apply cluster coloring if node is in a cluster
        if (nodeClusterMap.has(node)) {
          const clusterIndex = nodeClusterMap.get(node)!;
          color = CLUSTER_COLORS[clusterIndex % CLUSTER_COLORS.length];
        }
        
        graphAdapter.setNodeAttribute(node, 'color', color);
        graphAdapter.setNodeAttribute(node, 'highlighted', false);
      });
      
      // Reset edge colors
      graphAdapter.forEachEdge((edge: string) => {
        const edgeData = graphAdapter.getEdgeAttributes(edge);
        const edgeType = (edgeData as any).type || 'mention';
        const color = edgeType === 'relation' ? '#FF0000' : '#999999';
        graphAdapter.setEdgeAttribute(edge, 'color', color);
        graphAdapter.setEdgeAttribute(edge, 'highlighted', false);
      });
    });
    
    sigmaRef.current = sigma;
    
    // Cleanup
    return () => {
      if (sigmaRef.current) {
        sigmaRef.current.kill();
        sigmaRef.current = null;
      }
    };
  }, [graph]);
  
  return (
    <div className="graph-container" ref={containerRef}></div>
  );
};

export default GraphComponent;
