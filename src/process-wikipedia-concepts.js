const fs = require("fs");
const path = require("path");

// configuration data
const config = require('./config/config');
// postgresql connection to the database
const pg = require('./library/postgresQL')(config.pg);
// the module used for streaming and processing
// large files in chunks
const Transform = require("stream").Transform;

/**
 * @description The Wikipedia Concept processing and storing class.
 */
class StoreWikiConcept extends Transform {
    /**
     * @description Constructor function.
     * @param {Object} params - The constructor parameters.
     * @param {String} params.file - The file name.
     */
    constructor(params) {
        super(params);
        // get the option attributes
        const { file } = params;
        // output the options of the store wiki page
        this.remainder = "";
        this.file = file;
        // specify the regex values for retrieving the label and languages
        this.regex = new RegExp("<(http:\/\/www.wikidata.org/entity/([\\w\\d]+))> <http:\/\/schema.org\/name> \"(\.+)\"@(\\w{2,3}) .");
        // initializes the success and failure count
        this.successCount = 0;
        this.failureCount = 0;
        // output the initialization status
        console.log(`StoreWikiConcept [${file}] initialized`);
    }

    /**
     * @description Processes the XML file in chunks.
     * @param {String} chunk - The XML file chunk.
     * @param {String} encoding - The encoding of the file.
     * @param {Function} cb - The callback function to signify when to process the next chunk.
     */
    async _transform(chunk, encoding, cb) {
        // convert the data chunk to data
        const wikistring = chunk.toString();
        // find the last newline of the chunk
        const newline = wikistring.lastIndexOf("\n");
        // get all of the full rows gathered by the chunk
        const fullrows = this.reminder + wikistring.substring(0, newline);
        // assign the reminder of the chunk to the variable
        this.reminder = wikistring.substring(newline + 1);

        // split the full chunk into rows
        const rows = fullrows.split("\n");

        if (!rows) { return cb(); }

        for (let row of rows) {
            try {
                const connection = row.match(this.regex);
                if (!connection) { continue; }
                const [
                    first,
                    conceptURL,
                    conceptID,
                    wikiPageName,
                    wikiPageLang,
                    ...rest
                ] = connection;

                const wikiID = `"${wikiPageName}"@${wikiPageLang}`;

                /////////////////////////////////////////////////
                // store wikipedia entity to database
                /////////////////////////////////////////////////

                const entity = {
                    concept_id: conceptID,
                    concept_url: conceptURL
                };
                // add new entity to record
                if (!(await pg.select({ concept_id: conceptID }, "entities")).length) {
                    // insert non-existing entity
                    await pg.insert(entity, "entities");
                }

                /////////////////////////////////////////////////
                // establish link between entity and page
                /////////////////////////////////////////////////

                const linking = await Promise.all([
                    pg.select({ concept_id: conceptID }, "entities"),
                    pg.select({ wiki_id: wikiID }, "pages")
                ]);
                // if both the entity and page are present in the database
                if (linking[0].length && linking[1].length) {
                    const entityID = linking[0][0].id;
                    const pageID = linking[1][0].id;
                    // create the link object
                    const link = {
                        entity_id: entityID,
                        page_id: pageID,
                        concept_id: conceptID,
                        wiki_id: wikiID
                    };
                    try {
                        await pg.insert(link, "entities_pages");
                    } catch (error) {
                        console.log(error);
                    }
                }
                // log the successful storage
                this.successCount++;
                if (this.successCount % 10000 === 0) {
                    console.log("Processing file:", this.file, this.successCount);
                }
            } catch (error) {
                this.failureCount++;
                console.log("Error:", error.message.split("\n")[0]);
            }
        }
        return cb();
    }
}

//=========================================================
// Go through the wikipedia concept linkage
//=========================================================

/**
 * @description Processes the wikipedia entities in parallel.
 */
async function processWikipediaEntities() {
    const wikidataPath = path.join("../", config.wikipedia.entities_file_path);
    // create store wikipedia concepts instance
    const storeWikiConcepts = new StoreWikiConcept({
        file: wikidataPath
    })
    // since we are dealing with large files, we are going to use
    // file streams to read the file chunk by chunk. Because of this,
    // we will might not get the full row of the file - that is why
    // we need a variable where we will store the remainder of the
    // previous chunk.
    fs.createReadStream(wikidataPath, {
        encoding: "utf8"
    })
    .pipe(storeWikiConcepts)
    .on('end', (error) => {
        if (error) {
            console.log("Something went wrong:");
            console.log(error);
        }
        console.log("Read stream ENDED");
        console.log("-------------------------------------");
        console.log("FINISHED");
        console.log("File:", storeWikiConcepts.file);
        console.log("    Success:", storeWikiConcepts.successCount);
        console.log("    Failure:", storeWikiConcepts.failureCount);
        console.log("-------------------------------------");
    }).on('close', () => {
        console.log("Read stream CLOSED");
        console.log("-------------------------------------");
        console.log("FINISHED");
        console.log("File:", storeWikiConcepts.file);
        console.log("    Success:", storeWikiConcepts.successCount);
        console.log("    Failure:", storeWikiConcepts.failureCount);
        console.log("-------------------------------------");
    });
}
// execute the wikipedia entities process
processWikipediaEntities().catch(console.log);