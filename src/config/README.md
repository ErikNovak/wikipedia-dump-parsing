# Configuration

This folder contains the configuration files.

## Environment Variables

To avoid storing vulnerable data in the repository (such as authentication tokens
and secrets) we have adopted the `.env` approach to feed the vulnerable data to
different components of the platform.

This approach requires the `dotenv` module (which is installed by running the
`npm install` command) and an `.env` file saved in this folder. One must create the
`.env` file by hand since it is ignored in the project.

### .env
What follows is an example of the `.env` file. To get the right tokens contact
one of the developers contributing to this project.


```bash
##################################
# PostgreSQL configs
##################################

# postgres database
PG_DATABASE=postgres-database
# postgres password
PG_PASSWORD=postgres-password

##################################
# wikipedia raw files configs
##################################

# NOTE: The variable paths start at the root of the project

# the path to the entities file (example is present)
WIKIPEDIA_ENTITIES_FILE_PATH=./raw/wikidata-20200220-truthy-BETA.nt
# the path to the folder containing the wiki pages files
WIKIPEDIA_PAGES_FOLDER_PATH=./raw/wiki
```

