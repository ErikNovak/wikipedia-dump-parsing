// external modules
const pg = require("pg");

// //////////////////////////////////////////////
// Class definition
// //////////////////////////////////////////////

class PostgreSQL {
    /**
     * Initialize postgresql pool connections.
     * @param {Object} config - The postgres config object.
     * @param {String} config.user - The user logging in.
     * @param {String} config.database - The database name.
     * @param {String} config.password - The password the user used to log in.
     * @param {String} config.host - Domain host/where to find postgres database.
     * @param {String} config.port - Host port.
     * @param {String} config.max - Maximum number of connections it can handle.
     * @param {String} config.idleTimeoutMillis - Duration the connection is established before idle.
     */
    constructor(config) {
        this.config = config;
        // initilizes client pool
        this._initializePool();
    }

    /**
     * Closes the connections.
     * @returns {Null}
     */
    async close() {
        let self = this;
        return await self.pool.end();
    }

    /**
     * Initializes client pool used for connecting to the database.
     * @private
     */
    _initializePool() {
        let self = this;
        // create a pool of connections
        self.pool = new pg.Pool(self.config);
        // put event handler
        self.pool.on("error", err => {
            // TODO: handle the error acordingly
            console.error("idle client error", err.message, err.stack);
        });
    }

    /**
     * Extracts the keys and values used for querying.
     * @param {Object} params - The object containing the parameters.
     * @returns {Object} Containing the query parameters, values and the number of query parameters.
     * @private
     */
    _extractQueryParams(params, idx) {
        // prepare query and params
        let keys = [];
        let values = [];
        // check what are the conditions
        for (let key in params) {
            // check if key-value is object
            if (params[key] instanceof Object) {
                for (let kkey in params[key]) {
                    keys.push(`${key}->>'${kkey}'=$${idx}`);
                    idx++;
                    values.push(params[key][kkey]);
                }
            } else {
                // the key-values are primary values
                keys.push(`${key}=$${idx}`);
                idx++;
                values.push(params[key]);
            }
        }
        // return the key-values
        return { keys, values, idx };
    }

    /**
     * Extracts the condition rules.
     * @param {Object | Object[]} whereParams - The conditions used after the WHERE statement.
     * @param {Number} idx - The starting number for parameter indexing.
     * @returns {Object} Containing the conditions and the statement values.
     * @private
     */
    _getConditions(whereParams, idx) {
        let condition;
        let params = [];
        if (whereParams instanceof Array) {
            condition = [];
            // get all conditions together
            for (let param of whereParams) {
                // extract the conditions and values, concat in an array
                let { keys, values, idx: idy } = this._extractQueryParams(param, idx);
                idx = idy;
                condition.push(`(${keys.join(" AND ")})`);
                params = params.concat(values);
            }
            // join the conditions
            condition = condition.join(" OR ");
        } else {
            let { keys, values, idx: idy } = this._extractQueryParams(
                whereParams,
                idx
            );
            idx = idy;
            // join the conditions and prepare the params
            condition = keys.join(" AND ");
            params = params.concat(values);
        }
        return { condition, params, idx };
    }

    /**
     * Gets the values and conditions from the parameters.
     * @param {Object} values - The query values.
     * @param {Number} idx - The number of the first value.
     * @returns {Object} The object containing the condition, parameters and last id.
     */
    _getValues(values, idx) {
        // prepare query and params
        let condition = [];
        let params = [];
        // check what are the conditions
        for (let key in values) {
            // the key-values are primary values
            condition.push(`${key}=$${idx}`);
            idx++;
            params.push(values[key]);
        }
        // return the key-values
        return { condition, params, idx };
    }

    /**
     * Executes the query given the values.
     * @param {String} query - The query statement.
     * @param {Array} params - The values used in the statement.
     * @param {Function} callback - The callback function.
     */
    async execute(statement, params) {
        const client = await this.pool.connect();
        // execute statement
        let results;
        if (params.length === 0) {
            results = await client.query(statement);
        } else {
            results = await client.query(statement, params);
        }
        // release the client
        client.release();
        // return the results
        return results ? results.rows : [];
    }

    /**
     * Inserts the object in the database.
     * @param {Object} values - The object containing the keys and values.
     * @param {String} table - Table name.
     * @param {Function} callback - The callback function.
     */
    async insert(values, table) {
        // get the object keys
        let keys = Object.keys(values);
        // prepare query and params
        let query = `INSERT INTO ${table}(${keys.join(",")}) VALUES
            (${[...Array(keys.length).keys()]
                .map(id => `$${id + 1}`)
                .join(",")}) RETURNING *`;
        let params = [];
        for (let key of keys) {
            params.push(values[key]);
        }
        return await this.execute(query, params);
    }

    /**
     * Finds the rows in the database.
     * @param {Object | Object[]} conditions - The conditions used to find the rows.
     * @param {String} table - Table name.
     * @param {Function} callback - The callback function.
     */
    async select(conditions, table) {
        let { condition, params } = this._getConditions(conditions, 1);
        let query;
        if (params.length == 0) {
            query = `SELECT * FROM ${table}`;
        } else {
            query = `SELECT * FROM ${table} WHERE ${condition}`;
        }
        return await this.execute(query, params);
    }

    /**
     * Updates the rows in the database.
     * @param {Object} values - The values used for updating the rows.
     * @param {Object | Object[]} conditions - The conditions used to find the rows.
     * @param {String} table - Table name.
     * @param {Function} callback - The callback function.
     */
    async update(values, conditions, table) {
        // get the values used to update the records
        let {
            condition: valueConditions,
            params: valueParams,
            idx
        } = this._getValues(values, 1);
        // get conditions
        let { condition, params } = this._getConditions(conditions, idx);
        params = valueParams.concat(params);

        // prepare query and params
        let query = `UPDATE ${table} SET ${valueConditions.join(
            ", "
        )} WHERE ${condition} RETURNING *`;
        return await this.execute(query, params);
    }

    /**
     * Deletes the rows in the database.
     * @param {Object | Object[]} conditions - The conditions used to find the rows.
     * @param {String} table - Table name.
     * @param {Function} callback - The callback function.
     */
    async delete(conditions, table) {
        // get the conditions
        let { condition, params } = this._getConditions(conditions, 1);
        let query = `DELETE FROM ${table} WHERE ${condition}`;
        // run query
        return await this.execute(query, params);
    }

    /**
     * Upserts (updates or inserts) the row in the database.
     * @param {Object} values - The values of the row.
     * @param {String} table - Table name.
     */
    async upsert(values, conditions, table) {
        // get the object keys
        let keys = Object.keys(values);
        // get the values used to update the records
        let { condition, params } = this._getValues(values, 1);

        let conditionKeys = Object.keys(conditions);
        if (conditionKeys.length > 1) {
            // TODO: handle the error accordingly
            console.log(`Error in postgresql.js, too many conditions ${conditions}.`);
            return;
        }
        let query = `INSERT INTO ${table} (${keys.join(",")}) VALUES (${[
            ...Array(keys.length).keys()
        ]
            .map(id => `$${id + 1}`)
            .join(",")})
            ON CONFLICT (${conditionKeys}) DO UPDATE SET ${condition.join(
                ", "
            )}`;
        // run query
        return await this.execute(query, params);
    }
}

module.exports = function (config) {
    return new PostgreSQL(config);
};
