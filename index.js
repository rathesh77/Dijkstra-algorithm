const Dijkstra = require('./Dijkstra')
const Graph = require('./Graph')
const stops = require('./metro-stops.json')
const express = require('express')
const app = express()
const cors = require('cors')
let graph = new Graph()
let stations = {}
app.use(cors())


app.listen(8080, () => {
    console.log('app started on port 8080');
    run()
    console.log('graph generated')
})

app.get('/shortest_path/:departure/:destination', (req, res) => {
    const departure = req.params['departure']
    const destination = req.params['destination']
    if (!departure || !destination) {
        res.status(401)
        res.send({ error: 'you need to supply a departure and a destination' })
        return
    }
    console.log(departure, destination)
    let beginMillis = Date.now()
    const { distanceTraveled, path } = Dijkstra.shortestPath(departure, destination, graph)
    if (!path || !distanceTraveled) {
        res.status(401)
        res.send({ error: 'invalid data' })
        return
    }
    console.log(`itinéraire calculé en ${(Date.now()) - beginMillis}ms`)
    res.send({
        distanceTraveled, path: path.map((m) => {
            const { lat, lon, name } = stations[m]
            return { name: m, lat, lon, realName: name }
        })
    })
})

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);  // deg2rad below
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}
async function run() {

    let lines = new Map()
    for (let i = 0; i < stops.length; i++) {
        let currentStop = stops[i]
        for (let j = 0; j < stops[i].lines.length; j++) {
            let currentLine = currentStop.lines[j]
            if (lines.get(currentLine.line)) {
                if (!lines.get(currentLine.line).get(currentLine.position))
                    lines.get(currentLine.line).set(currentLine.position, [{ ...currentStop }])
                else
                    lines.get(currentLine.line).get(currentLine.position).push({ ...currentStop })
                const departure = currentStop.name + ' ' + currentLine.line
                stations[departure] = { name: currentStop.name, lon: currentStop.longitude, lat: currentStop.latitude }

                graph.addNoeud(departure)
                if (currentStop.lines[j - 1]) {
                    graph.addPath(currentStop.name + ' ' + currentStop.lines[j].line, currentStop.name + ' ' + currentStop.lines[j - 1].line, 3000)
                }
                const nextStation = lines.get(currentLine.line).get(currentLine.position + 1)
                const previousStation = lines.get(currentLine.line).get(currentLine.position - 1)
                if (nextStation) {
                    getPath(nextStation, currentStop, currentLine)
                }
                if (previousStation) {
                    getPath(previousStation, currentStop, currentLine)
                }
            }
            else {
                lines.set(currentLine.line, new Map().set(currentLine.position, [{ ...currentStop }]))
                graph.addNoeud(currentStop.name + ' ' + currentLine.line)
            }

        }
    }
}
function getPath(previousStation, currentStop, currentLine) {
    let min = previousStation[0]
    let minDistance = parseFloat((getDistanceFromLatLonInKm(currentStop.latitude, currentStop.longitude, previousStation[0].latitude, previousStation[0].longitude) * 1000).toFixed())
    stations[previousStation[0].name + ' ' + currentLine.line] = { name: previousStation[0].name, lon: previousStation[0].longitude, lat: previousStation[0].latitude }

    for (let k = 1; k < previousStation.length; k++) {
        const destination = previousStation[k].name + ' ' + currentLine.line
        stations[destination] = { name: previousStation[k].name, lon: previousStation[k].longitude, lat: previousStation[k].latitude }
        let distance = parseFloat((getDistanceFromLatLonInKm(currentStop.latitude, currentStop.longitude, previousStation[k].latitude, previousStation[k].longitude) * 1000).toFixed())
        if (minDistance > distance) {
            min = previousStation[k]
            minDistance = distance
        }

    }
    graph.addPath(currentStop.name + ' ' + currentLine.line, min.name + ' ' + currentLine.line, minDistance)
}