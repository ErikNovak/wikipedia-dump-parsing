const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");
const wtf = require("wtf_wikipedia");
// import wikipedia components
const wikipedia = require("./library/wikipedia");

// configuration data
const config = require('./config/config');
// postgresql connection to the database
const pg = require('./library/postgresQL')(config.pg);
// the module used for streaming and processing
// large files in chunks
const Transform = require("stream").Transform;

/**
 * @description The Wikipedia Page processing and storing class.
 */
class StoreWikiPage extends Transform {
    /**
     * @description Constructor function.
     * @param {Object} params - The constructor parameters.
     * @param {String} params.language - The language of the file.
     * @param {String} params.file - The file name.
     */
    constructor(params) {
        super(params);
        // get the option attributes
        const { language, file } = params;
        // output the options of the store wiki page
        this.remainder = "";
        this.language = language;
        this.file = file;
        // initialize the XML parser
        this.parser = new xml2js.Parser();
        // specify the regex values for retrieving the label and languages
        this.regex = new RegExp("(\<page\>[\\w\\d\\s\\W\\D\\S]+\<\/page\>)");
        // initializes the success and failure count
        this.successCount = 0;
        this.failureCount = 0;
        // output the initialization status
        console.log(`StoreWikiPage [${file}][${language}] initialized`);
    }

    /**
     * @description Processes the XML file in chunks.
     * @param {String} chunk - The XML file chunk.
     * @param {String} encoding - The encoding of the file.
     * @param {Function} cb - The callback function to signify when to process the next chunk.
     */
    async _transform(chunk, encoding, cb) {
        // convert the data chunk to data
        chunk = chunk.toString();
        // find the last newline of the chunk
        const newline = chunk.lastIndexOf("</page>\n");
        // get all of the full rows gathered by the chunk
        const fullrows = this.remainder + chunk.substring(0, newline + 7);
        let pages = this.regex.exec(fullrows);

        if (!pages) {
            // assign the reminder of the chunk to the variable
            this.remainder = fullrows;
            return cb();
        }
        this.remainder = chunk.substring(newline + 8);
        // get all of the pages
        pages = pages[1];
        // if no pages were found, skip this part
        if (!pages) { return cb(); }
        pages = pages.split("</page>")
            .filter((page) => page !== "")
            .map((page) => `${page}</page>`);

        for (let page of pages) {
            try {
                const {
                    page: {
                        revision,
                        title
                    }
                } = await this.parser.parseStringPromise(page);
                // get the wikipedia data
                const { data } = wtf(revision[0].text[0]._);
                // if the data type is redirect, skip
                if (["redirect"].includes(data.type)) {
                    continue;
                }
                // prepare wikipedia page information
                const wikiId = `"${title[0]}"@${this.language}`;
                const wikiPage = new wikipedia.Page(wikiId, this.language, title[0], data);
                // create the wikipedia object to be stored in the database
                const wiki = {
                    wiki_id: wikiPage.id,
                    lang: this.language,
                    url: wikiPage.pageURL,
                    title: wikiPage.title,
                    categories: wikiPage.categories,
                    text: wikiPage.text,
                    refs: wikiPage.references,
                    //structure: wikiPage.sections
                };

                // add new entity to record
                if (!(await pg.select({ wiki_id: wikiPage.id }, "pages")).length) {
                    // insert the wikipedia object into the database
                    await pg.insert(wiki, "pages");
                }
                // log the successful storage
                this.successCount++;
                if (this.successCount % 100000 === 0) {
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
// Find all wikipedia page metadata
//=========================================================

// set the language regex object
const langRegex = new RegExp("(\\w+)wiki-");

/**
 * @description Processes the wikipedia pages in parallel.
 */
async function processWikipediaPages() {
    // set the destination of the raw wikipedia page files
    const wikipediaPath = path.join("../", config.wikipedia.pages_folder_path);
    // get the list of wikipedia files
    const wikipediaFiles = fs.readdirSync(wikipediaPath);
    // iterate through the wikipedia files
    for (let wikipediaFile of wikipediaFiles) {
        if (wikipediaFile.includes("bz2") || wikipediaFile === "README.md") {
            // the file is a zipped version, skip it
            continue;
        }
        // construct the wikipedia file path
        const langWikiPath = path.join(wikipediaPath, wikipediaFile);
        // get the wikipedia pages language
        const language = langRegex.exec(wikipediaFile)[1];
        // create the wikipedia
        const storeWikiPage = new StoreWikiPage({
            file: langWikiPath,
            language
        });
        // since we are dealing with large files, we are going to use
        // file streams to read the file chunk by chunk. Because of this,
        // we will might not get the full row of the file - that is why
        // we need a variable where we will store the remainder of the
        // previous chunk.
        fs.createReadStream(langWikiPath, {
            encoding: "utf8"
        })
        .pipe(storeWikiPage)
        .on('end', (error) => {
            if (error) {
                console.log("Something went wrong:");
                console.log(error);
            }
            console.log("Read stream ENDED");
            console.log("-------------------------------------");
            console.log("FINISHED");
            console.log("File:", storeWikiPage.file);
            console.log("    Success:", storeWikiPage.successCount);
            console.log("    Failure:", storeWikiPage.failureCount);
            console.log("-------------------------------------");
        }).on('close', () => {
            console.log("Read stream CLOSED");
            console.log("-------------------------------------");
            console.log("FINISHED");
            console.log("File:", storeWikiPage.file);
            console.log("    Success:", storeWikiPage.successCount);
            console.log("    Failure:", storeWikiPage.failureCount);
            console.log("-------------------------------------");
        });
    }
}
// execute the wikipedia page process
processWikipediaPages().catch(console.log);