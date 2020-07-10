/************************************************
 * Creates the postgresql database to store
 * OER materials, user activities and other
 * data used in the platform.
 */

/////////////////////////////////////////////////
// Modules and configurations
/////////////////////////////////////////////////

// configuration data
const config = require('../config/config');
// postgresql connection to the database
const pg = require('../library/postgresQL')(config.pg);

/////////////////////////////////////////////////
// Script parameters
/////////////////////////////////////////////////

// get schema
const schema  = config.pg.schema;

// Statement for checking if the provided schema exists
const schemaExistsString = `
    SELECT exists(
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name = '${schema}')
    AS schema_exists;
`;

// Statement for creating the provided schema
const createSchemaString = `CREATE schema ${schema};`;

// Statement for retrieving the current database version
const checkVersion = `SELECT version FROM ${schema}.database_version`;

// Statement for checking if the tables exist
const tablesExistString = `
    SELECT *
    FROM information_schema.tables
    WHERE table_schema = '${schema}'
`;

/**
 * @description An object containing the schematics of the non-updated database.
 * @type {Object} database.tables
 * @property {String} oer_materials - The statement to create the table
 * containing basic OER material information.
 * @property {String} materials_contents - The statement to create the table
 * containing extracted OER material information via services.
 * @property {String} episodes - The statement to create the table containing if
 * an OER material is an episode of some sequence of lectures.
 * @property {String} series - The statement to create the table containing
 * series information.
 * @property {String} urls - The statement to create the table connecting the
 * `oer_materials`, `providers` and `contains` tables.
 * @property {String} providers - The statement to create the table containing
 * provider information.
 * @property {String} contains - The statement to create a link between the
 * provider url and material url.
 * @property {String} features_public - The statement to create a table
 * containing public features used in different services.
 * @property {String} features_private - The statement to create a table
 * containing private features used in different services.
 * @property {String} user_activities - The table for storing user activity
 * data.
 * @property {String} cookies - The table containing the cookie information
 * of different users.
 * @property {String} database_version - The table containing information about
 * the current version of the database.
 */
const dbCreates = {

    pages:
        `CREATE TABLE ${schema}.pages (
            id              serial PRIMARY KEY,
            wiki_id         varchar UNIQUE,
            url             varchar UNIQUE,
            lang            varchar,
            title           varchar NOT NULL,
            categories      varchar (1000) ARRAY,
            text            varchar NOT NULL,
            refs            jsonb ARRAY
        );

        ALTER TABLE ${schema}.pages
            OWNER TO ${config.pg.user};

        CREATE INDEX pages_id
            ON ${schema}.pages(id);

        CREATE INDEX pages_wiki_id
            ON ${schema}.pages(wiki_id);

        CREATE INDEX pages_url
            ON ${schema}.pages(url);


        COMMENT ON TABLE ${schema}.pages
            IS 'The wikipedia pages table';

        COMMENT ON COLUMN ${schema}.pages.id
            IS 'The record ID';

        COMMENT ON COLUMN ${schema}.pages.wiki_id
            IS 'The wiki page ID';

        COMMENT ON COLUMN ${schema}.pages.url
            IS 'The wiki page url';

        COMMENT ON COLUMN ${schema}.pages.title
            IS 'The wiki page title';

        COMMENT ON COLUMN ${schema}.pages.categories
            IS 'The wiki page categories';

        COMMENT ON COLUMN ${schema}.pages.text
            IS 'The wiki page full text';

        COMMENT ON COLUMN ${schema}.pages.refs
            IS 'The list of wiki page references';`,



    entities:
        `CREATE TABLE ${schema}.entities (
            id              serial PRIMARY KEY,
            concept_id      varchar UNIQUE
        );

        ALTER TABLE ${schema}.entities
            OWNER TO ${config.pg.user};

        CREATE INDEX entities_id
            ON ${schema}.entities(id);

        CREATE INDEX entities_concept_id
            ON ${schema}.entities(concept_id);


        COMMENT ON TABLE ${schema}.entities
            IS 'The wikipedia entities table';

        COMMENT ON COLUMN ${schema}.entities.id
            IS 'The record ID';

        COMMENT ON COLUMN ${schema}.entities.concept_id
            IS 'The wiki entity ID';`,


    entities_pages:
        `CREATE TABLE ${schema}.entities_pages (
            entity_id    varchar NOT NULL,
            page_id      varchar NOT NULL,

            PRIMARY KEY (entity_id, page_id),

            FOREIGN KEY (entity_id) REFERENCES ${schema}.entities(concept_id) ON UPDATE CASCADE,
            FOREIGN KEY (page_id)   REFERENCES ${schema}.pages(wiki_id)       ON UPDATE CASCADE
        );

        ALTER TABLE ${schema}.entities_pages
            OWNER TO ${config.pg.user};

        CREATE INDEX entities_pages_entity_id
            ON ${schema}.entities_pages(entity_id);

        CREATE INDEX entities_pages_page_id
            ON ${schema}.entities_pages(page_id);


        COMMENT ON TABLE ${schema}.entities_pages
            IS 'The table joining the entity and page records';

        COMMENT ON COLUMN ${schema}.entities_pages.entity_id
            IS 'The wiki entity ID';

        COMMENT ON COLUMN ${schema}.entities_pages.page_id
            IS 'The wiki page ID';`,



    database_version:
        `CREATE TABLE ${schema}.database_version (
            version     integer PRIMARY KEY,
            date        timestamp with time zone DEFAULT NOW()
        );

        ALTER TABLE ${schema}.database_version
            OWNER TO ${config.pg.user};

        CREATE INDEX database_version_id
            ON ${schema}.database_version(version);

        CREATE FUNCTION update_date_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.date = now();
            RETURN NEW;
        END;
        $$ LANGUAGE 'plpgsql';

        CREATE TRIGGER update_database_version_date
            BEFORE UPDATE ON ${schema}.database_version
            FOR EACH ROW
            EXECUTE PROCEDURE update_date_column();


        COMMENT ON TABLE ${schema}.database_version
            IS 'The database version table';

        COMMENT ON COLUMN ${schema}.database_version.version
            IS 'The version number of the database';

        COMMENT ON COLUMN ${schema}.database_version.date
            IS 'The time when the database was update to the provided version';`,

};


/**
 * @description The object describing the database changes done since
 * the previous version.
 * @typedef {Object} db_update
 * @property {Number} version - Indicates the version of the updated database.
 * @property {String} update - An SQL query describing the changes in the
 * database for that version.
 */

/**
 * @description The array containing database updates.
 * @type {db_update[]}
 */
const databaseUpdates = [{
    version: 1,
    update: `
        ALTER TABLE ${schema}.entities
        ADD COLUMN concept_url varchar;
    `
}, {
    version: 2,
    update: `
        ALTER TABLE ${schema}.entities_pages
        RENAME COLUMN entity_id TO concept_id;
        ALTER TABLE ${schema}.entities_pages
        RENAME COLUMN page_id TO wiki_id;
        ALTER TABLE ${schema}.entities_pages
        ADD COLUMN entity_id integer,
        ADD COLUMN page_id integer;
        ALTER TABLE ${schema}.entities_pages
        ALTER COLUMN entity_id SET NOT NULL,
        ALTER COLUMN page_id SET NOT NULL;

    `
}, {
    version: 3,
    update: `
        ALTER TABLE ${schema}.pages
        ADD COLUMN concepts jsonb,
        ADD COLUMN embeddings jsonb;

    `
}];

// get the requested database version
const pgVersion = config.pg.version === '*' ?
                databaseUpdates.length :
                config.pg.version;


/////////////////////////////////////////////////
// Helper functions
/////////////////////////////////////////////////


/**
 * @description Initializes the schema creation process.
 * @returns {Promise} A promise that will create the requested schema.
 */
async function prepareSchema() {
    // returns row containing boolean true if schema in config exists, false otherwise
    try {
        const result = await pg.execute(schemaExistsString, []);
        if (result[0].schema_exists) {
            console.log("Schema already exists");
            return null;
        }
        console.log(`Creating new schema=${schema.toUpperCase()}`);
        await pg.execute(createSchemaString, []);
        console.log("Schema prepared");
        return null;
    } catch (error) {
        console.log(`Error creating schema= ${error.message}`);
        return error;
    }
} // prepareSchema()


/**
 * @describe Checks and creates non-existing database tables.
 * @returns {Promise} A promise that will check and create non-existing
 * database tables.
 */
async function prepareTables() {

    try {
        // check if the tables exist in the database
        const result = await pg.execute(tablesExistString, []);

        // delete already existing tables from dbCreates object
        for (let i = 0; i < result.length; i++) {
            const tableName = result[i].table_name;
            delete dbCreates[tableName];
        }

        // create a list of all non-existing tables to loop through with async
        let tableNames = Object.keys(dbCreates);
        for (const tableName of tableNames) {
            const sqlStatement = dbCreates[tableName];
            await pg.execute(sqlStatement, []);
        }
        return null;
    } catch (error) {
        console.log(error);
        return error;
    }
} // prepareTables()


/**
 * Updates DB to version specified in config.json
 * To implement an update, add following block:
 * doUpdate(X, '<SQL STRING>');
 * X -> Update level ( 1 more than previous)
 * <SQL STRING> -> SQL statement for update.
 * For multiple statements, it's possible to separate them with semi-colon-';'
 *
 * @returns Version DB was updated to
 */

/**
 * @description Updates the database tables.
 * @returns {Promise} The promise of updating the database tables.
 */
async function updateTables () {

    /////////////////////////////////////////////////
        // Internal helper functions
        /////////////////////////////////////////////////

        /**
         * @description Updates the database version.
         * @param {Number | String} _version - The current database version.
         */
        async function updateDatabaseVersion (_version) {
            try {
                const version = parseInt(_version);

                console.log(`Updating database version : v${version} => v${version + 1}`);

                // create an SQL statement for updating database version
                let query = `UPDATE ${schema}.database_version
                                SET version = ${version + 1}
                                WHERE version = ${version};`;

                if (version === 0) {
                    query = `INSERT INTO ${schema}.database_version (version) VALUES (1);`;
                }

                // execute the version update statement
                await pg.execute(query, []);
                return null;
            } catch (error) {
                console.log(error);
                return error;
            }
        }


        /**
         * @describe Updates the database with the provided SQL statement.
         * @param {Number} _version - The current version in consideration.
         * @param {String} _sql - The SQL statement to be executed.
         * @param {Function} callback - The function executed at the end of the process.
         */
        async function updateDatabaseTables(_version, _sql, _vCurrent, _vGoal) {
            if (_vCurrent < _version && _version <= _vGoal) {
                try {
                    if (_sql !== '') {
                        console.log("Executing command:");
                        console.log(_sql);
                        await pg.execute(_sql, []);
                        console.log("Execution complete");
                    }
                    await  updateDatabaseVersion(_vCurrent);
                    _vCurrent++;
                    return null;
                } catch (error) {
                    console.log(error);
                    return error;
                }

            } else { return null; }

        } // updateDatabase(_version, _sql, callback)


    try {
        // setup the goal and the maximum database version
        const vGoal = parseInt(pgVersion);
        const vMax = databaseUpdates.length ? databaseUpdates[databaseUpdates.length - 1].version : 0;
        let vCurrent = 0;

        console.log(`About to update DB to version ${vGoal} out of max version: ${vMax}`);

        /////////////////////////////////////////////////
        // Function execution
        /////////////////////////////////////////////////

        // returns a row containing integer version of DB
        const result = await pg.execute(checkVersion, []);
        // were there any versions already stored
        if (result.length > 0) {
            // get the latest version
            vCurrent = result.map(rec => rec.version)
                .reduce((prev, curr) => Math.max(prev, curr), 0);
        }
        console.log(`Current version is ${vCurrent}`);

        for (let dbUpdate of databaseUpdates) {
            const { version, update } = dbUpdate;
            await updateDatabaseTables(version, update, vCurrent, vGoal);
        }
        return null;
    } catch (error) {
        console.log(error);
        return error;
    }
} // updateTables()


/**
 * @description Executes the whole database creation and update process.
 * @param {Function} [callback] - The function executed at the end of the process.
 */
async function createDatabase() {
    console.log('Checking whether to update database');
    await prepareSchema();
    console.log("Schema prepared");
    await prepareTables();
    console.log("Tables prepared");
    await updateTables();
    console.log("Tables updated");
    await pg.close();
    console.log("Pool closed");
} // startDBCreate(callback)


/////////////////////////////////////////////////
// Script export
/////////////////////////////////////////////////

exports.createDatabase = createDatabase;