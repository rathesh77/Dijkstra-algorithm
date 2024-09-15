const Graph = require('./Graph')
/** Class representing the A* algorithm. */
class AStar {

    constructor(graph) {
        this.graph = graph
        this.delimiter = '|'
    }
    /**
     * Returns the most optimal path
     * @param {String} departure 
     * @param {String} destination 
     * @param {Graph} graph
     * @returns {Object} { distanceTraveled, path }
     */
    shortestPath(departure, destination, heuristic) {
        departure = departure +  this.delimiter + this.graph.getNodes().get(departure)[0].info.route_short_name
        destination = destination +  this.delimiter + this.graph.getNodes().get(destination)[0].info.route_short_name
        if (departure == destination)
            return 'starting node and ending node are the same...'
        if (heuristic == null) {
            heuristic = () => 0
        }

        //on declare 2 tableaux : openlist et closedlist
        let openList = [], closedList = [], previousNode = null
        //on ajoute departure à openlist
        const nodes = this.graph.getNodes()
        const destinationNode = this.findNodeByRouteShortName(destination)

        const keyDeparture = this.getStopId(departure)
        nodes.get(keyDeparture)[0].cost = 0
        nodes.get(keyDeparture)[0].fscore = 0
        nodes.get(keyDeparture)[0].previous = null

        openList.push(departure)
        //tant que open list n'est pas vide
        while (openList.length > 0) {
            //on trouve le noeud ayant la plus faible heuristic, et on le retire de openlist
            let current = this.pickOptimalNode(previousNode, openList)
            previousNode = current
            //si current est egal à destination
            const currentStopId = this.getStopId(current)
            if (currentStopId == destinationNode.value) {
                //on reconstruit le chemin (chemin = reconstructPath(D, graph))
                //on arrête le programme car on a trouvé un chemin optimal (en retnournant le chemin)
                return this.reconstructPath(current)
            }
            //pour chaque voisin 'V' du noeud courant "current"
            // current == 'torcy|A'
            const keyCurrent = currentStopId // 'torcy'

            const currentNode = this.findNodeByRouteShortName(current)
            for (const [nodeId, node] of currentNode.getNexts()) {
                const V = nodeId + this.delimiter + node.info.route_short_name
                // Si V est dans closedList, on l'ignore
                if (this.isInList(V, closedList) != -1)
                    continue
                const indexOfVInsideOpenList = this.isInList(V, openList)
                const gscore = currentNode.cost + node.getHeads().get(keyCurrent).weight
                const fscore = gscore + heuristic(node, destinationNode)
                if (indexOfVInsideOpenList == -1 || node.cost > gscore) {
                    //V.Cout = D.cout +  costBetweenDAndCurrent <- costBetweenDAndCurrent = temps qu'on prend pour aller de current vers V
                    node.cost = gscore
                    //V.heuristic =  V.cout + hscore (V, destination)
                    node.fscore = fscore
                    //V.previous = current
                    node.previous = current
                    //on ajoute V à openList
                    if (indexOfVInsideOpenList == -1)
                        this.addNodeToList(V, openList)
                }
            }

            //on ajoute current dans closedList
            closedList.push(current)
        }
        //fin du programme (on a pas trouvé de chemin)

        return -1
    }


    findNodeByRouteShortName = function (nodeId) {
        const route_short_name = this.getStopRouteShortName(nodeId)
        const stopId = this.getStopId(nodeId)
        const nodes = this.graph.getNodes().get(stopId)
        for (const node of nodes) {
            if (node.info.route_short_name == route_short_name)
                return node;
        }
        return null
    }
    pickOptimalNode = function (U, openList) {
        if (U == null)
            return openList.shift()
        for (const V of openList) {
            if (this.getStopRouteShortName(V)== this.getStopRouteShortName(U)) {
                console.log('ame node')
                return openList.splice(openList.indexOf(V), 1)[0];
            }
        }
        return openList.shift()

    }

    /**
     * @param {String} node 
     * @param {Array} list 
     * @param {Graph} g 
     * @returns {String} add node to list
     */
    addNodeToList = function (node, list) {
        const currentNode = this.findNodeByRouteShortName(node)
        const fscore = currentNode.fscore
        for (let i = 0; i < list.length; i++) {
            if (this.findNodeByRouteShortName(list[i]).fscore >= fscore) {
                list.splice(i, 0, node)
                return list
            }
        }
        list.push(node)
        return list.length - 1
    }
    /**
     * @param {String} V node to check presence 
     * @param {Array} list the array to check the presence of V
     * @returns {Number} index of the node inside the array
     */
    isInList = function (V, list) {
        for (let i = 0; i < list.length; i++)
            if (list[i] == V)
                return i
        return -1
    }

    /**
     * Reconstructs a path reversely from a given node
     * @param {String} n the ending node
     * @param {Graph} g graph
     * @returns {Array} path
     */
    reconstructPath = function (n) {
        let curr = this.findNodeByRouteShortName(n)
        const distanceTraveled = curr.cost
        const path = [curr.info]
        while (curr.previous != null) {
            curr = this.findNodeByRouteShortName(curr.previous)
            path.unshift(curr.info)
        }
        return { distanceTraveled, path }
    }

    getStopId(stop) {
        return stop.split(this.delimiter)[0]
    }
    getStopRouteShortName(stop) {
        return stop.split(this.delimiter)[1]

    }
}

module.exports = AStar