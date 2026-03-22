import fs from 'node:fs/promises';
import path from 'node:path';
import type { CommandModule } from 'yargs';

const CONFIG_TEMPLATE = `# apifold.config.yaml
spec: {{SPEC_PATH}}
port: 3000
transport: sse
baseUrl: https://api.example.com
auth:
  type: bearer
  token: \${API_KEY}
filters:
  tags: []
  methods: [get, post]
  paths: []
includeDeprecated: false
logLevel: info
`;

export const initCommand: CommandModule = {
  command: 'init [spec]',
  describe: 'Generate an apifold.config.yaml template',
  builder: (yargs) =>
    yargs.positional('spec', {
      type: 'string',
      default: './openapi.yaml',
      describe: 'Path to OpenAPI spec to reference in config',
    }),
  handler: async (argv) => {
    const specPath = argv['spec'] as string;
    const content = CONFIG_TEMPLATE.replace('{{SPEC_PATH}}', JSON.stringify(specPath));

    const target = path.resolve(process.cwd(), 'apifold.config.yaml');

    try {
      await fs.access(target);
      process.stderr.write(`Config already exists: ${target}\n`);
      process.exit(1);
    } catch {
      // File doesn't exist — safe to create
    }

    await fs.writeFile(target, content, 'utf-8');
    process.stdout.write(`Created ${target}\n`);
  },
};
