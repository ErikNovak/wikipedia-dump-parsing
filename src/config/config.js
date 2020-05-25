/************************************************
 * Project Configurations
 */

// external modules
const path = require('path');

// import configured node variables
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// get process environment
const env = process.env.NODE_ENV || 'dev';

// the common configurations
module.exports = {
    environment: env,
    pg: {
        host: process.env.PG_HOST || '127.0.0.1',
        port: parseInt(process.env.PG_PORT) || 5432,
        database: process.env.PG_DATABASE || 'wikipedia',
        max: parseInt(process.env.PG_MAX) || 10,
        idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT_MILLIS) || 30000,
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD,
        schema: process.env.PG_SCHEMA || 'public',
        version: process.env.PG_VERSION || '*'
    },
    wikipedia: {
        entities_file_path: process.env.WIKIPEDIA_ENTITIES_FILE_PATH,
        pages_folder_path: process.env.WIKIPEDIA_PAGES_FOLDER_PATH
    }


};

