const express = require('express')
const app = express()
const cors = require('cors')

const AStar = require('./algo/AStar')
const Graph = require('./algo/Graph')

const Postgres = require('./db/Postgres')
const StopTimes = require('./models/stop_times.model')
const Transfers = require('./models/transfers.model')
const Stops = require('./models/stops.model')
app.use(cors())

let graph = new Graph()
const heuristic = function (n1, n2, g) {
    
    const getDistanceFromLatLonInKm = function(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;
        return d;
    }

    const deg2rad = function(deg) {
        return deg * (Math.PI / 180)
    }
    try {
        const begin = g.getNodes().get(n1)
        const end = g.getNodes().get(n2)

        const lat1 = begin.info.stop_lat
        const lon1 = begin.info.stop_lon
        const lat2 = end.info.stop_lat
        const lon2 = end.info.stop_lon
        const dist = getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2)

        const avgSpeedOfPublicTransports = (begin.value + '').length == 4 ? 42/3600 : 20/3600 // km/s
        const approxTravelTime = dist / avgSpeedOfPublicTransports
        return approxTravelTime
    } catch(e) {
        //console.log(e)
        return 0
    }
}
app.listen(8080, async () => {
    await Postgres.init()
    await buildTreeFromDeparture()
    console.log(graph.getNodes().get(1670))
    console.log('app started on port 8080');
})

app.get('/shortest_path/:departure/:destination', async (req, res) => {
    const departure = (req.params['departure'])
    const destination = (req.params['destination'])
    console.log(departure, destination)
    if (!graph.getNodes().has(departure) || !graph.getNodes().has(destination)) {
        res.send({ error: 'starting or ending stop not found' })
        return
    }
    const time = Date.now()

    const { path, distanceTraveled } = AStar.shortestPath(departure, destination, graph, heuristic)
    console.log(path, (distanceTraveled / 60) + " minutes")
    if (path == undefined) {
        res.send({ error: 'error' })
        return
    }
    const detailedPath = []
    for (const p of path) {
        const { stop_id } = await Stops.findById(p)
        detailedPath.push(graph.getNodes().get(stop_id).getInfo())
    }
    console.log(`temps total pris par l'algorithme : ${((Date.now() - time) / 1000) / 60} minute.s`)

    res.send({ distanceTraveled, detailedPath })
})


function deg2rad(deg) {
    return deg * (Math.PI / 180)
}
async function buildTreeFromDeparture() {
    const stopTimes = await StopTimes.getAll()
    const transfers = await Transfers.getAll()
    let dictionary = new Map()
    for (const t of transfers) {
        let {min_transfer_time, from_stop_name, from_route_short_name, to_route_short_name,from_stop_desc, to_stop_name, to_stop_desc, from_stop_id, to_stop_id, from_stop_lat, from_stop_lon, to_stop_lat, to_stop_lon } = t
        const sourceInfo = {
            stop_name: from_stop_name,
            stop_desc: from_stop_desc,
            stop_lat: from_stop_lat,
            stop_lon: from_stop_lon,
            route_short_name: from_route_short_name
        }
        const destInfo = {
            stop_name: to_stop_name,
            stop_desc: to_stop_desc,
            stop_lat: to_stop_lat,
            stop_lon: to_stop_lon,
            route_short_name: to_route_short_name
        }
        if (min_transfer_time == 0)
            min_transfer_time = 1
        graph.addPath(
            from_stop_id,
            to_stop_id,
            min_transfer_time,
            sourceInfo,
            destInfo

        )
    }
    for (const st of stopTimes) {
        const { stop_id, stop_name, stop_desc, stop_lat, stop_lon, trip_id, stop_sequence, departure_time, route_short_name} = st
        const sourceInfo = {
            stop_name,
            stop_desc,
            stop_lat,
            stop_lon,
            route_short_name
        }
        const hasTrip = dictionary.has(trip_id)
        graph.addNode(stop_id, sourceInfo)

        if (hasTrip) {

            const trip = dictionary.get(trip_id)
            const hasPreviousStop = trip.has(stop_sequence - 1)
            const hasNextStop = trip.has(stop_sequence + 1)
            if (hasNextStop) {
                const nextStop = trip.get(stop_sequence + 1)
                
                const destInfo = {
                    stop_name: nextStop.stop_name,
                    stop_desc: nextStop.stop_desc,
                    stop_lat: nextStop.stop_lat,
                    stop_lon: nextStop.stop_lon,
                    departure_time: nextStop.time,
                    route_short_name: nextStop.route_short_name

                }
                graph.addPath(
                    stop_id,
                    nextStop.stop_id,
                    Math.abs(getSecondsFromLocalTime(destInfo.departure_time) - getSecondsFromLocalTime(departure_time)) ,
                    sourceInfo,
                    destInfo
                )
            }
            if (hasPreviousStop) {
                const previousStop = trip.get(stop_sequence - 1)

                const destInfo = {
                    stop_name: previousStop.stop_name,
                    stop_desc: previousStop.stop_desc,
                    stop_lat: previousStop.stop_lat,
                    stop_lon: previousStop.stop_lon,
                    departure_time: previousStop.time,
                    route_short_name: previousStop.route_short_name

                }
                graph.addPath(
                    stop_id,
                    previousStop.stop_id,
                    Math.abs(getSecondsFromLocalTime(destInfo.departure_time) - getSecondsFromLocalTime(departure_time)),
                    sourceInfo,
                    destInfo
                )
            }
            trip.set(stop_sequence, { stop_id, stop_name, stop_desc, stop_lat, stop_lon, time: departure_time, route_short_name })

        } else {
            dictionary.set(trip_id, new Map())
            dictionary.get(trip_id).set(stop_sequence, { stop_id, stop_name, stop_desc, stop_lat, stop_lon, time: departure_time , route_short_name})
        }

    }
    /*let testNode = graph.getNodes().get('IDFM:monomodalStopPlace:43239') // IDFM:22552 IDFM:26070 IDFM:30014 IDFM:461495
     testNode.getNexts().forEach(element => {
        console.log(element.info)

    });*/
}


function getSecondsFromLocalTime(time){
    return time.split(':').reduce((a, b, i) => i == 0 ? (+b * 3600) : i == 1 ? (a + (+b * 60)) : (+a + +b), 0)
}