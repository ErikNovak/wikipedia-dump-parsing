const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");
const wtf = require("wtf_wikipedia");

const basePath = "../../raw";

//=========================================================
// Find all wikipedia page metadata
//=========================================================

// specify the regex values for retrieving the label and languages
const regex = new RegExp("(\<page\>[\\w\\d\\s\\W\\D\\S]+\<\/page\>)");

async function populateWikipediaPages() {
    const wikipediaPath = path.join(basePath, "wiki");
    // get the list of wikipedia files
    const wikipediaFiles = fs.readdirSync(wikipediaPath).slice(2, 3);


    const parser = new xml2js.Parser();
    for (let wikipediaFile of wikipediaFiles) {
        try {
            // construct the wikipedia file path
            const langWikiPath = path.join(basePath, "wiki", wikipediaFile);

            // since we are dealing with large files, we are going to use
            // file streams to read the file chunk by chunk. Because of this,
            // we will might not get the full row of the file - that is why
            // we need a variable where we will store the remainder of the
            // previous chunk.
            let remainder = "";
            fs.createReadStream(langWikiPath, {
                encoding: "utf8"
            }).on('data', async (chunk) => {
                // convert the data chunk to data
                const wikistring = chunk.toString();
                // find the last newline of the chunk
                const newline = wikistring.lastIndexOf("</page>\n");
                // get all of the full rows gathered by the chunk
                const fullrows = remainder + wikistring.substring(0, newline + 7);
                const xmlPages = regex.exec(fullrows);

                if (!xmlPages) {
                    // assign the reminder of the chunk to the variable
                    remainder = fullrows; return;
                }
                remainder = wikistring.substring(newline + 8);
                // get all of the pages
                let pagesall = xmlPages[1];

                // if no pages were found, skip this part
                if (!pagesall) { return; }
                pagesall = pagesall.split("</page>")
                    .filter((page) => page !== "")
                    .map((page) => `${page}</page>`);

                for (let page of pagesall) {
                    const structure = wtf(page);
                    console.log(structure);
                }
            }).on('error', (err) => {
                console.log(err);
            }).on('close', () => {
                console.log("Read stream closed");
            });

        } catch (error) {
            console.log(error);
        }
    }
}

populateWikipediaPages().catch((error) => console.log);