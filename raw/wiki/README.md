# RAW Wikipedia Pages Articles Folder

This folder contains the files of the raw wikipedia pages articles.

## Download Files

The Wikipedia Dump Files can be found on this page: https://dumps.wikimedia.org

For a given language, one can find the collection of all wikipedia data dumps on the
following link format: `https://dumps.wikimedia.org/{lang}wiki` where the `lang`
is the ISO 639-1 language code (e.g. `en` for English, `sl` for Slovene, etc).

This is the list of the top Wikipedias (per number of articles).

| Language | ISO 639-1 | URL                                            |
| -------- | --------- | -----------------------------------------------|
| German   | de        | https://dumps.wikimedia.org/dewiki/            |
| English  | en        | https://dumps.wikimedia.org/dewiki/            |
| Spanish  | es        | https://dumps.wikimedia.org/eswiki/            |
| French   | fr        | https://dumps.wikimedia.org/frwiki/            |
| Italian  | it        | https://dumps.wikimedia.org/itwiki/            |
| Russian  | ru        | https://dumps.wikimedia.org/ruwiki/            |
| Slovene  | sl        | https://dumps.wikimedia.org/slwiki/            |

### File Selection

Once the version of the dump is selected, download the file that is under the section
with the title
**Recombine articles, templates, media/file descriptions, and primary meta-pages.**

The file name should be similar to `{lang}wiki-{YYYYmmDD}-pages-articles.xml.bz2`, where
`lang` is the language of the wikipedia pages, and `YYYYmmDD` is the year-month-date of the
data dump.

These files are usually large (1-20 GB) and are zipped. Once you download the zipped
files, extract them in this folder. An example of the extracted file is
`enwiki-20200220-pages-articles.xml.bz2.`

