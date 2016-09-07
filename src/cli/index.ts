let yargs = require("yargs");
import { Cli } from './cli';

let cli = new Cli();

/**
 * CLI Commands.
 */
var argv = yargs.usage("$0 command")
    .command("init", "Initialize server with a config file.", yargs => cli.init(yargs))
    .command("key:generate", "Generate an app key.", yargs => cli.keyGenerate())
    .command("referrer:add", "Register a referrer that can make api requests.", () => cli.referrerAdd(yargs))
    .command("referrer:remove", "Remove a referrer that has been registered.", yargs => cli.referrerRemove(yargs))
    .command("start", "Start up the server.", cli.start)
    .demand(1, "Please provide a valid command.")
    .help("h")
    .alias("h", "help")
    .argv;
