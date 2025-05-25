import { useState, useEffect } from 'react';
import Graph from './Graph';
import SearchFilter from './SearchFilter';
import './App.css';

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

type Clusters = {
  byTags: ClusterInfo[];
  byConnections: ClusterInfo[];
};

type GraphData = {
  nodes: PageNode[];
  edges: Edge[];
  clusters?: Clusters;
};

function App() {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [clusteringEnabled, setClusteringEnabled] = useState<boolean>(false);
  const [clusterType, setClusterType] = useState<'tags' | 'connections'>('tags');

  // Load graph data
  useEffect(() => {
    setLoading(true);
    fetch('/graph.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load graph data');
        }
        return response.json();
      })
      .then((data: GraphData) => {
        setGraph(data);
        
        // Extract all unique tags for filtering
        const tags = new Set<string>();
        data.nodes.forEach(node => {
          if (node.tags) {
            node.tags.forEach(tag => tags.add(tag));
          }
        });
        setAvailableTags(Array.from(tags));
        
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading graph data:', err);
        setError('Failed to load graph data. Please try again later.');
        setLoading(false);
      });
  }, []);// Filter graph data based on search input and selected tags
  const getFilteredGraph = () => {
    if (!graph) return null;

    // Start with complete graph
    let filteredNodes = [...graph.nodes];
    let filteredEdges = [...graph.edges];
    
    // Apply search and tag filters
    if (filter || selectedTags.length > 0) {
      const lowerFilter = filter.toLowerCase();
      
      // Filter nodes based on search text and tags
      filteredNodes = graph.nodes.filter((node: PageNode) => {
        const matchesSearch = !filter || node.label.toLowerCase().includes(lowerFilter);
        const matchesTags = selectedTags.length === 0 || 
          (node.tags && selectedTags.some((tag: string) => node.tags?.includes(tag)));
        
        return matchesSearch && matchesTags;
      });
      
      // Get the IDs of filtered nodes for edge filtering
      const nodeIds = new Set(filteredNodes.map(node => node.id));
      
      // Keep edges where both source and target are in the filtered nodes
      filteredEdges = graph.edges.filter((edge: Edge) => 
        nodeIds.has(edge.source) && nodeIds.has(edge.target)
      );
    }
    
    // Apply clustering if enabled and clusters exist
    let activeClusters: ClusterInfo[] | undefined;
    if (clusteringEnabled && graph.clusters) {
      activeClusters = clusterType === 'tags' 
        ? graph.clusters.byTags 
        : graph.clusters.byConnections;
    }
    
    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      clusters: activeClusters
    };
  };

  const handleSearch = (searchText: string) => {
    setFilter(searchText);
  };

  const handleTagSelect = (tags: string[]) => {
    setSelectedTags(tags);
  };
  
  const toggleClustering = () => {
    setClusteringEnabled(!clusteringEnabled);
  };
    const toggleClusterType = () => {
    setClusterType((prev: 'tags' | 'connections') => prev === 'tags' ? 'connections' : 'tags');
  };

  if (loading) {
    return <div className="loading">Loading your knowledge graph...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const filteredGraph = getFilteredGraph();

  return (
    <div className="app">
      <header className="header">
        <h1>Notion Knowledge Graph</h1>
        <div className="controls">
          <SearchFilter 
            onSearch={handleSearch} 
            availableTags={availableTags}
            selectedTags={selectedTags}
            onTagSelect={handleTagSelect}
          />
          <div className="cluster-controls">
            <button 
              className={`cluster-toggle ${clusteringEnabled ? 'active' : ''}`}
              onClick={toggleClustering}
            >
              {clusteringEnabled ? 'Disable Clustering' : 'Enable Clustering'}
            </button>
            {clusteringEnabled && (
              <button 
                className="cluster-type-toggle"
                onClick={toggleClusterType}
              >
                Cluster by: {clusterType === 'tags' ? 'Tags' : 'Connections'}
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="main">
        {filteredGraph ? (
          <Graph graph={filteredGraph} />
        ) : (
          <div className="no-data">No graph data available</div>
        )}
      </main>
      <footer className="footer">
        <p>Click on any node to open the corresponding Notion page</p>
      </footer>
    </div>
  );
}

export default App;
