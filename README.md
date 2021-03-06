# Wikipedia Dump Parsing

This repository contains the libraries and scripts for parsing Wikipedia dumps.

## Prerequisites

- PostgreSQL version 10 or greater (one can download and install it [here](https://www.postgresql.org/download/))
- NodeJS version 10 or greater

    To test that your nodejs version is correct, run `node --version` in the command line.

## Install

To install the project run

```
npm install
```

## Configuration

1. **Create Environment Variable File.** Create `.env` file in the `src/config` folder.
    See instructions described in [here](./src/config).

2. **Prepare PostgreSQL.** Prepare the PostgreSQL database.

    - Create a new database by running
        ```bash
        # enter the postgresql console
        psql
        # create a new database
        postgres=# CREATE DATABASE wikipedia;
        # go out of the postgresql console
        postgres=# \q
        ```

    - Create the appropriate PostgreSQL tables by running
        ```bash
        npm run postgres:create
        ```

3. **Download Wikipedia Dump.** To do this, follow the instructions:

    - Downloading Wikipedia entities [README](./raw/README.md).
    - Downloading Wikipedia pages [README](./raw/wiki/README.md).

## Processing

### Processing Wikipedia Pages

To process the Wikipedia pages, execute the following commands:

```bash
cd src/
node process-wikipedia-pages
```

This will populate the database with all available Wikipedia pages in the `./raw/wiki/` folder.

**NOTE:** This will take a lot of time.


### Processing Wikipedia Entities

When the Wikipedia pages process is finished, execute the following commands to start processing entities:

```bash
cd src/
node process-wikipedia-concepts
```

This will populate the database with all Wikipedia entities AND link them to the Wikipedia pages.

**NOTE:** This will take a lot of time.
