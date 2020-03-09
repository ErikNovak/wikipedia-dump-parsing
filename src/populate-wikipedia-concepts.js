const fs = require("fs");
const path = require("path");

const basePath = "../../raw";

//=========================================================
// Go through the wikipedia concept linkage
//=========================================================

// assign the path to the wikidata file
const wikidata = "wikidata-20200220-truthy-BETA.nt";
const wikidataPath = path.join(basePath, wikidata);

// specify the regex values for retrieving the label and languages
const regex = new RegExp("<(http:\/\/www.wikidata.org/entity/[\\w\\d]+)> <http:\/\/schema.org\/name> \"(\.+)\"@(\\w{2,3}) .");

// since we are dealing with large files, we are going to use
// file streams to read the file chunk by chunk. Because of this,
// we will might not get the full row of the file - that is why
// we need a variable where we will store the remainder of the
// previous chunk.
let remainder = "";
fs.createReadStream(wikidataPath, {
    encoding: "utf8"
}).on('data', (chunk) => {
    // convert the data chunk to data
    const wikistring = chunk.toString();
    // find the last newline of the chunk
    const newline = wikistring.lastIndexOf("\n");

    // get all of the full rows gathered by the chunk
    const fullrows = remainder + wikistring.substring(0, newline);
    // assign the reminder of the chunk to the variable
    remainder = wikistring.substring(newline + 1);

    // TODO: split the full chunk into rows
    for (let row of fullrows.split("\n")) {
        const connection = row.match(regex);
        if (connection) {
            const conceptWikiId = connection[1];
            const conceptName = connection[2];
            const conceptLang = connection[3];
            const conceptID = `"${conceptName}"@${conceptLang}`;
            console.log(conceptWikiId, conceptID, conceptName, conceptLang);
        }
    }
}).on('error', (err) => {
    console.log(err);
}).on('close', () => {
    console.log("Read stream closed");
});
