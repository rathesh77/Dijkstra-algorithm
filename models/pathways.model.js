const Postgres = require('../db/Postgres')

const Routes = require('./routes.model.js')
const Trips = require('./trips.model.js')
const Stops = require('./stops.model.js')

class Pathways {
    /**
     * @param tableName {String}
     *  
     */
    static async getAll() {
        const result = await Postgres.client.query(
            `
            SELECT 
              from_stop_id,
              to_stop_id,
              is_bidirectional,
              traversal_time
            FROM
              pathways

            `
        )
        return result.rows
    }
 
}

/**
 *  @type {String}
 */
Pathways.tableName = 'pathways'

module.exports = Pathways