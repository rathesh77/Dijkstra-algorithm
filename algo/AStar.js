const Graph = require('./Graph')
/** Class representing the A* algorithm. */
class AStar {
    /**
     * Returns the most optimal path
     * @param {String} departure 
     * @param {String} arrival 
     * @param {Graph} graph
     * @returns {Object} { distanceTraveled, path }
     */
    static shortestPath(departure, arrival, g, heuristic) {
        if (departure == arrival)
            return 'starting node and ending node are the same...'
        if (heuristic == null) {
            heuristic = () => 0
        }

        //on declare 2 tableaux : openlist et closedlist
        let openList = [], closedList = [], previousNode = null
        //on ajoute departure à openlist
        const nodes = g.getNodes()
        const arrivalNode = AStar.findNodeByRouteShortName(arrival.split('|')[1], nodes.get(arrival.split('|')[0]) )
        
        const keyDeparture = departure.split('|')[0]
        nodes.get(keyDeparture)[0].cost = 0
        nodes.get(keyDeparture)[0].fscore = 0
        nodes.get(keyDeparture)[0].previous = null

        openList.push(departure)
        //tant que open list n'est pas vide
        while (openList.length > 0) {
            //on trouve le noeud ayant la plus faible heuristic, et on le retire de openlist
            let current = AStar.pickOptimalNode(previousNode, g, openList)
            previousNode = current
            //si current est egal à arrival
            if (current.split('|')[0] == arrivalNode.value) {
                //on reconstruit le chemin (chemin = reconstructPath(D, graph))
                //on arrête le programme car on a trouvé un chemin optimal (en retnournant le chemin)
                return AStar.reconstructPath(current, g)
            }
            //pour chaque voisin 'V' du noeud courant "current"
            // current == 'torcy|A'
            const keyCurrent = current.split('|')[0] // 'torcy'
            const currentRouteShortName = current.split('|')[1] // 'A'

            const currentNode = AStar.findNodeByRouteShortName(currentRouteShortName, nodes.get(keyCurrent))
            for (const [stop_id, node] of currentNode.getNexts()) {
                const V = stop_id + '|' + node.info.route_short_name
                // Si V est dans closedList, on l'ignore
                if (AStar.isInList(V, closedList) != -1)
                    continue
                const indexOfVInsideOpenList = AStar.isInList(V, openList)
                const gscore = currentNode.cost + node.getHeads().get(keyCurrent).weight
                const fscore = gscore + heuristic(node, arrivalNode, g)
                if (indexOfVInsideOpenList == -1 || node.cost > gscore) {
                    //V.Cout = D.cout +  costBetweenDAndCurrent <- costBetweenDAndCurrent = temps qu'on prend pour aller de current vers V
                    node.cost = gscore
                    //V.heuristic =  V.cout + hscore (V, arrival)
                    node.fscore = fscore
                    //V.previous = current
                    node.previous = current
                    //on ajoute V à openList
                    if (indexOfVInsideOpenList == -1)
                        AStar.addNodeToList(V, openList, g)
                }
            }
            
            //on ajoute current dans closedList
            closedList.push(current)
        }
        //fin du programme (on a pas trouvé de chemin)

        return -1
    }
}

AStar.findNodeByRouteShortName = function(route_short_name, nodes) {
    for (const node of nodes) {
        if (node.info.route_short_name == route_short_name)
            return node;
    }
    return null
}
AStar.pickOptimalNode = function (U, graph, openList) {    
    if (U == null)
        return openList.shift()
    for (const V of openList) {
        if (V.split('|')[1] == U.split('|')[1]) {
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
 AStar.addNodeToList = function (node, list, g) {
    const nodes = g.getNodes()
    const stop_id = node.split('|')[0]
    const routeShortName = node.split('|')[1]
    const currentNode = AStar.findNodeByRouteShortName(routeShortName, nodes.get(stop_id))
    const fscore = currentNode.fscore
    for (let i = 0; i < list.length; i++) {
        const key = list[i].split('|')[1]
        const nodeId = list[i].split('|')[0]
        if (AStar.findNodeByRouteShortName(key, nodes.get(nodeId)).fscore >= fscore) {
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
AStar.isInList = function (V, list) {
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
AStar.reconstructPath = function (n, g) {
    const nodes = g.getNodes()
    let curr = AStar.findNodeByRouteShortName(n.split('|')[1], nodes.get(n.split('|')[0]))
    const distanceTraveled = curr.cost
    const path = [curr.value + '|' + curr.info.route_short_name]
    while (curr.previous != null) {
        curr = AStar.findNodeByRouteShortName(curr.previous.split('|')[1], nodes.get(curr.previous.split('|')[0]))
        path.unshift(curr.value + '|' + curr.info.route_short_name)
    }
    return { distanceTraveled, path }
}

module.exports = AStar