// ---------------------------------------------------
// Wikipedia Components
//
// This module contains the wikipedia components
// which are used to access the different elements
// of a wikipedia page.
// ---------------------------------------------------

/**
 * @description Creates an object out of the array.
 * @param {Object[]} array - The array of objects with the same attributes.
 * @param {String} attribute - The name of the attribute to group by.
 * @returns {Object} The object containing the array elements.
 */
function createObject(array, attribute) {
    const obj = {};
    for (const element of array) {
        obj[element[attribute]] = element;
    }
    return obj;
}

// ------------------------------------
// Wikipedia Page Components
// ------------------------------------

/**
 * @description Image class.
 */
class Image {
    /**
     * @description Constructor object.
     * @param {Object} image - The image object.
     * @param {Object} image.data - The image data.
     * @param {Object} image.data.caption - The image caption object.
     * @param {Object} image.data.caption.data - The caption data.
     * @param {String} image.data.caption.data.caption - The caption text.
     * @param {String} image.data.file - The name of the image file.
     */
    constructor(image) {
        const {
            data: {
                caption: {
                    data: {
                        caption: imageCaption
                    }
                },
                file
            }
        } = image;
        this.file = file;
        this.caption = imageCaption;
    }
}

/**
 * @description Reference class.
 */
class Reference {
    /**
     * @description Constructor object.
     * @param {Object} reference - The reference object.
     * @param {Object} reference.data - The reference data.
     */
    constructor(reference) {
        const { data } = reference;
        this.reference = data;
    }
}

/**
 * @description Link class.
 */
class Link {
    /**
     * @description Constructor object.
     * @param {Object} link - The link object.
     * @param {String} link.page - The link page.
     * @param {String} link.text - The link text.
     * @param {String} language - The language of the link.
     */
    constructor(link, language=null) {
        const { page, text } = link;
        this.page = page;
        this.text = text;
        this.language = language;
        this.url = this.generateURL();
    }

    /**
     * @description Generates the link URL.
     * @returns {String} The link URL.
     */
    generateURL() {
        return this.language && this.page
            ? `https://${this.language}.wikipedia.org/wiki/${this.page.replace(/ /g, "_")}`
            : null;
    }
}

/**
 * @description Sentence class.
 */
class Sentence {
    /**
     * @description Constructor object.
     * @param {Object} sentence - The sentence object.
     * @param {Object} sentence.data - The sentence data.
     * @param {String} sentence.data.text - The sentence text.
     * @param {String[]} sentence.data.links - The list of links found in the text.
     * @param {String} [language=null] - The language of the sentence.
     */
    constructor(sentence, language=null) {
        const {
            data: {
                text,
                links
            }
        } = sentence;

        this.text = text;
        this.links = links
            ? links.map((l) => new Link(l, language))
            : [];
    }
}

/**
 * @description List class.
 */
class List {
    /**
     * @description Constructor object.
     * @param {Object} list - The list object.
     * @param {Object} list.data - The list data.
     * @param {Object[]} list.data.sentences - The array of sentence objects.
     * @param {String} [language=null] - The language of the section.
     */
    constructor(list, language=null) {
        const {
            data: sentences
        } = list;
        // the sentence objects
        this.sentences = sentences.map((s) => new Sentence(s, language));
    }

    /**
     * @description Gets the sentences.
     * @returns {Sentence[]} The list of sentences.
     */
    sentences() {
        return this.sentences;
    }

    /**
     * @description Get all sentence texts.
     * @returns {String} The text of all sentences in the list.
     */
    get text() {
        return this.sentences.map((s) => s.text).join("\n");
    }

    /**
     * @description Gets the links of the list.
     * @returns {Link[]} The array of links.
     */
    get links() {
        const links = this.sentences
            .map((s) => s.links)
            .filter((l) => l.length)
            .reduce((prev, curr) => prev.concat(curr), []);
        // return unique links
        return Object.values(createObject(links, "url"));
    }
}

/**
 * @description Paragraph class.
 */
class Paragraph {
    /**
     * @description Constructor function.
     * @param {Object} paragraph - The paragraph object.
     * @param {Object} paragraph.data - The paragraph data.
     * @param {Object[]} paragraph.data.sentences - The list of sentence object.
     * @param {Object[]} paragraph.data.lists - The list of wikipedia list objects.
     * @param {Object[]} paragraph.data.images - The list of images in the paragraph.
     * @param {String} [language=null] - The language of the section.
     */
    constructor(paragraph, language=null) {
        const {
            data: {
                sentences,
                lists,
                images
            }
        } = paragraph;

        this.lists = lists.map((l) => new List(l, language));
        this.sentences = sentences.map((s) => new Sentence(s, language));
        this.images = images.map((i) => new Image(i));
    }

    /**
     * @description Checks if the paragraph contains text.
     * @returns {Boolean} True, if the paragraph contains text.
     *      Otherwise, False.
     */
    hasText() {
        return this.sentences.length || this.lists.length;
    }

    /**
     * @description Gets the text found in the paragraph.
     * @returns {String} The text extracted from sentences and lists.
     */
    get text() {
        const sentences = this.sentences.map((s) => s.text).join(" ");
        const lists = this.lists.map((l) => l.text).join("\n");
        return sentences + (lists.length ? "\n\n" + lists : "");
    }

    /**
     * @description Gets the links of the paragraph.
     * @returns {Link[]} The array of links.
     */
    get links() {
        const links = this.lists.concat(this.sentences)
            .map((s) => s.links)
            .filter((l) => l.length)
            .reduce((prev, curr) => prev.concat(curr), []);
        // return unique links
        return Object.values(createObject(links, "url"));
    }
}

/**
 * @description Section class.
 */
class Section {
    /**
     * @description Constructor function.
     * @param {Object} section - The section object.
     * @param {Number} section.depth - The section depth.
     * @param {Object} section.data - The section data.
     * @param {String} section.data.title - The title of the section.
     * @param {Object[]} section.data.references - The list of reference objects.
     * @param {Object[]} section.data.paragraphs - The list of paragraph objects.
     * @param {String} [language=null] - The language of the section.
     */
    constructor(section, language=null) {
        const {
            depth,
            data: {
                title,
                references,
                paragraphs
            }
        } = section;

        this.depth = depth;
        this.title = title;
        this.paragraphs = paragraphs.map((p) => new Paragraph(p, language));
        this.references = references.map((r) => new Reference(r, language));
    }

    /**
     * @description Checks if the section has references.
     * @returns {Boolean} True, if the section has references. Otherwise, False.
     */
    hasRefs() {
        return this.references.length;
    }

    /**
     * @description Gets the text found in the section.
     * @returns {String} The text extracted from title and paragraphs.
     */
    get text() {
        const title = this.title !== "" ? this.title + "\n\n" : "";
        const paragraphs = this.paragraphs
            .filter((p) => p.hasText())
            .map((p) => p.text).join("\n\n")
        // return the title and paragraphs
        return title + paragraphs;
    }

    /**
     * @description Gets the links of the section.
     * @returns {Link[]} The array of links.
     */
    get links() {
        const links = this.paragraphs
            .map((s) => s.links)
            .filter((l) => l.length)
            .reduce((prev, curr) => prev.concat(curr), []);
        // return unique links
        return Object.values(createObject(links, "url"));
    }
}

/**
 * @description Page class.
 */
class Page {
    /**
     * @description Constructor function.
     * @param {String} id - The wikipedia page id.
     * @param {String} language - The language of the wikipedia page.
     * @param {String} title - The title of the wikipedia page.
     * @param {Object} content - The content of the wikipedia page.
     * @param {String} [content.redirectTo] - The URL to which the page redirects to.
     * @param {String} content.type - The type of the wikipedia page.
     * @param {String[]} content.categories - The categories of the wikipedia page.
     * @param {Object[]} content.coordinates - The coordinates of the wikipedia page.
     * @param {Object[]} content.sections - The sections of the wikipedia page.
     */
    constructor(id, language, title, content) {
        const {
            categories,
            coordinates,
            redirectTo,
            sections,
            type
        } = content;

        this.id = id;
        this.type = type;
        this.title = title;
        this.language = language;
        this.categories = categories;
        this.coordinates = coordinates;
        this.redirectTo = redirectTo;
        this.sections = sections.map((s) => new Section(s, language));
        this.pageURL = `https://${this.language}.wikipedia.org/wiki/${this.title.replace(/ /g, "_")}`;
    }

    /**
     * @description Gets the list of all references on the wikipedia page.
     * @returns {String[]} The list of references.
     */
    get references() {
        return this.sections
            .filter((s) => s.hasRefs())
            .map((s) => s.references)
            .map((r) => r.reference)
            .reduce((prev, curr) => prev.concat(curr), []);
    }

    /**
     * @description Gets the text (content) of the wikipedia page.
     * @returns {String} The text found on the wikipedia page.
     */
    get text() {
        const sections = this.sections
            .map((s) => s.text)
            .join("\n\n\n");

        return this.title + "\n\n" + sections;
    }

    /**
     * @description Gets the links of the wikipedia page.
     * @returns {Link[]} The array of links.
     */
    get links() {
        const links = this.sections
            .map((s) => s.links)
            .filter((l) => l.length)
            .reduce((prev, curr) => prev.concat(curr), []);
        // return unique links
        return Object.values(createObject(links, "url"));
    }
}

// export wikipedia page components
module.exports = {
    Reference,
    Sentence,
    List,
    Paragraph,
    Section,
    Page
}