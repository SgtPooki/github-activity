import { parseArgs } from 'node:util';

const cliOptions = {
  'hours': {
    type: 'string',
    alias: 'h',
    description: 'Number of hours to look back for activity',
    default: '24'
  },
  'user': {
    type: 'string',
    alias: 'u',
    description: 'GitHub username to fetch activity for',
    // we will determine currently authenticated user if not passed.
    demandOption: false
  }
}
const { values: { hours: argvHours, user }} = parseArgs({ options: cliOptions })

const hours = Number(argvHours)

export {
  hours,
  user
}

