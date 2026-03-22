#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { serveCommand } from './commands/serve.js';
import { transformCommand } from './commands/transform.js';
import { validateCommand } from './commands/validate.js';
import { initCommand } from './commands/init.js';

yargs(hideBin(process.argv))
  .scriptName('apifold')
  .command(serveCommand)
  .command(transformCommand)
  .command(validateCommand)
  .command(initCommand)
  .demandCommand(1, 'You must provide a command. Run --help for usage.')
  .strict()
  .help()
  .alias('h', 'help')
  .version(false)
  .parse();
