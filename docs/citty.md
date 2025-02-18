Import:

// ESM
import { defineCommand, runMain } from "citty";

// CommonJS
const { defineCommand, runMain } = require("citty");
Define main command to run:

import { defineCommand, runMain } from "citty";

const main = defineCommand({
meta: {
name: "hello",
version: "1.0.0",
description: "My Awesome CLI App",
},
args: {
name: {
type: "positional",
description: "Your name",
required: true,
},
friendly: {
type: "boolean",
description: "Use friendly greeting",
},
},
run({ args }) {
console.log(`${args.friendly ? "Hi" : "Greetings"} ${args.name}!`);
},
});

runMain(main);
Utils
defineCommand
defineCommand is a type helper for defining commands.

runMain
Runs a command with usage support and graceful error handling.

createMain
Create a wrapper around command that calls runMain when called.

runCommand
Parses input args and runs command and sub-commands (unsupervised). You can access result key from returnd/awaited value to access command's result.

parseArgs
Parses input arguments and applies defaults.

renderUsage
Renders command usage to a string value.

showUsage
Renders usage and prints to the console
