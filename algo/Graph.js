const Node = require('./Node')
/** Class representing a non-oriented graph. */
class Graph {

    /**
     * Creates a graph.
     */
    constructor() {

        this.nodes = new Map()
    }

    /**
     * returns the nodes part of the graph.
     */
    getNodes() {
        return this.nodes
    }
    /**
     * adds a node to the graph
     * @param {String} value 
     * @returns {Node} the node that got added
     */
    addNode(value, info) {
        if (this.nodes.has(value)) {
            this.nodes.get(value).info = info
            return this.nodes.get(value)
        }
        const newNode = new Node(value, info)
        this.nodes.set(value, newNode)
        return newNode
    }
    
    /**
     * adds a bidirectional weighted path between source node and dest node
     * @param {String} source 
     * @param {String} dest 
     * @param {Number} weight 
     * @returns {Array}
     */
    addPath(source, dest, weight, sourceInfo, arrivalInfo) {
        //console.log(source, dest, weight, sourceInfo, arrivalInfo)
        if (weight == null) {
            console.log('ajoutez un weight...')
            return
        }
        const sourceNode = this.addNode(source, sourceInfo);
        const arrivalNode = this.addNode(dest, arrivalInfo);

        sourceNode.addNext(arrivalNode, +weight)
        arrivalNode.addNext(sourceNode, +weight)

        return [sourceNode, arrivalNode]
    }

}

module.exports = Graph