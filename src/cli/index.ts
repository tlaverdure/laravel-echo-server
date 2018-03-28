import { Cli } from './cli';

let cli = new Cli();

let yargs = require('yargs')
    .usage("Usage: laravel-echo-server <command> [options]")
    .command("start",               "Starts the server.",                            yargs => cli.start(yargs))
    .command("stop",                "Stops the server.",                             yargs => cli.stop(yargs))
    .command(["configure", "init"], "Creates a custom config file.",                 yargs => cli.configure(yargs)) // Has an alias of "init" for backwards compatibility, remove in next version
    .command("client:add [id]",     "Register a client that can make api requests.", yargs => cli.clientAdd(yargs))
    .command("client:remove [id]",  "Remove a registered client.",                   yargs => cli.clientRemove(yargs))
    .demandCommand(1, "Please provide a valid command.")
    .help("help")
    .alias("help", "h");

yargs.$0 = '';

var argv = yargs.argv;
