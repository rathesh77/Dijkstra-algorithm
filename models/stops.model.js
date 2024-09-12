const Postgres = require('../db/Postgres')
const Transfers = require('./transfers.model')
class Stops {

    static async getAll() {
        const result = await Postgres.client.query(
            `
                SELECT
                    stop_id, stop_name, stop_lon, stop_lat, stop_desc
                FROM
                    stops
            `

        )
        return result.rows
    }

    static async findById(stopId) {
        const result = await Postgres.client.query(
            `
                SELECT
                    *
                FROM
                    ${this.tableName}
                WHERE
                    stop_id = '${stopId}'
            `

        )
        return result.rows[0]
    }

    static async getDirectTransfersFromStations() {
        const result = await Postgres.client.query(
            `
            SELECT 
                s1.stop_name AS departure, 
                s2.stop_name AS arrival, 
                s1.stop_lat AS depLat, s1.stop_lon AS depLon, 
                s2.stop_lat AS arrLat, s2.stop_lon AS arrLon,  
                t.min_transfer_time
            FROM 
                ${this.tableName} AS s1, 
                ${this.tableName} AS s2, 
                ${Transfers.tableName} AS t
            WHERE 
                s1.stop_id = t.from_stop_id
                AND s2.stop_id = t.to_stop_id
            LIMIT 50
            `
        )
        return result.rows
    }

}
/**
 *  @type {String}
 */
Stops.tableName = 'stops'

module.exports = Stops