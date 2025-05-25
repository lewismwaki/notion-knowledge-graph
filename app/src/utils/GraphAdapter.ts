import Graph from 'graphology';
import Attributes from 'graphology-types';

// The original Graph from graphology does not have TypeScript types correctly defined
// This adapter provides a workaround for TypeScript type checking
class GraphAdapter {
  private graph: Graph;

  constructor() {
    this.graph = new Graph();
  }

  addNode(id: string, attributes: any): void {
    // @ts-ignore - Graphology types are incomplete
    this.graph.addNode(id, attributes);
  }

  addEdge(source: string, target: string, attributes: any): void {
    // @ts-ignore - Graphology types are incomplete
    this.graph.addEdge(source, target, attributes);
  }

  hasNode(id: string): boolean {
    // @ts-ignore - Graphology types are incomplete
    return this.graph.hasNode(id);
  }

  getNodeAttributes(id: string): Attributes {
    // @ts-ignore - Graphology types are incomplete
    return this.graph.getNodeAttributes(id);
  }

  getEdgeAttributes(id: string): Attributes {
    // @ts-ignore - Graphology types are incomplete
    return this.graph.getEdgeAttributes(id);
  }

  forEachNode(callback: (node: string, attributes: Attributes) => void): void {
    // @ts-ignore - Graphology types are incomplete
    this.graph.forEachNode(callback);
  }

  forEachEdge(callback: (edge: string, attributes: Attributes, source: string, target: string) => void): void {
    // @ts-ignore - Graphology types are incomplete
    this.graph.forEachEdge(callback);
  }

  setNodeAttribute(node: string, attribute: string, value: any): void {
    // @ts-ignore - Graphology types are incomplete
    this.graph.setNodeAttribute(node, attribute, value);
  }

  setEdgeAttribute(edge: string, attribute: string, value: any): void {
    // @ts-ignore - Graphology types are incomplete
    this.graph.setEdgeAttribute(edge, attribute, value);
  }

  someNeighbor(node: string, callback: (node: string, neighbor: string) => boolean): boolean {
    // @ts-ignore - Graphology types are incomplete
    return this.graph.someNeighbor(node, callback);
  }

  extremities(edge: string): { source: string; target: string } {
    // @ts-ignore - Graphology types are incomplete
    const source = this.graph.source(edge);
    // @ts-ignore - Graphology types are incomplete
    const target = this.graph.target(edge);
    return { source, target };
  }

  // Get the underlying graph for use with Sigma
  getGraph(): Graph {
    return this.graph;
  }
}

export default GraphAdapter;
