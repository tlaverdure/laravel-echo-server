let yargs = require("yargs");
import { Cli } from './cli';

let cli = new Cli();

/**
 * CLI Commands.
 */
var argv = yargs.usage("$0 command")
    .command("init", "Initialize server with a config file.", yargs => cli.init(yargs))
    .command("key:generate", "Generate an app key.", yargs => cli.keyGenerate())
    .command("apikey:generate", "Generate an api key to make api requests.", () => cli.apiKeyGenerate())
    .command("start", "Start up the server.", cli.start)
    .demand(1, "Please provide a valid command.")
    .help("h")
    .alias("h", "help")
    .argv;
