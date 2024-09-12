/** Class representing a node entity. */
class Node {
    /**
     * Creates a node
     * @param {String} value
     * @param {any} [info]
     */
    constructor(value, info) {
        /*
            heads format : [ 'headsValue' : {heads, weight} ]
        */
        this.heads = new Map()
        this.value = value
        this.info = info == undefined ? null : info
        this.nexts = new Map()
    }
    /**
     * returns a Map of predecessors neighbors
     * @returns {Map<String, Node>} 
     */
    getHeads() {
        return this.heads
    }
    /**
     * returns the current Node's value
     * @returns {String} 
     */
    getValue() {
        return this.value
    }
    /**
     * returns optional information of the current node
     * @returns {any} 
     */
    getInfo() {
        return this.info
    }
    /**
     * returns a Map of successor neighbors
     * @returns {Map<String, Node>} 
     */
    getNexts() {
        return this.nexts
    }
    /**
     * adds a neightbor to the current node
     * @param {Node} node 
     * @param {Number} weight
     * @returns {Map<String, Node>} returns the array of neighbors
     */
    addNext(node, weight) {
        node.getHeads().set(this.getValue(),{ weight })
        this.nexts.set(node.getValue(), node)
        return this.nexts
    }
}

module.exports = Node
