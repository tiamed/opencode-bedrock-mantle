# Bedrock Mantle Sync Tool

A lightweight Node.js utility that fetches the list of models from the AWS **Bedrock Mantle** API and synchronises them with an OpenCode configuration file.

## Features
- **Fetches** Bedrock Mantle models (with retry logic).
- **Transforms** models to the OpenCode schema (`id`, `name`, `provider`, `endpoint`, `capabilities`).
- **Updates** a local JSON config (default `config.json`).
- No Git integration – you handle version control yourself.
- Supports `--dry-run` and `--debug` flags.

## Prerequisites
- Node 18+ (native `fetch` is used). Both Node 22 and Node 24 work.
- An AWS Bearer token with permission to call the Bedrock Mantle endpoint.

## Environment Variables
| Variable | Description |
|---|---|
| `AWS_BEARER_TOKEN_BEDROCK` | **Required** – the AWS token for the Bedrock Mantle API. |
| `OPENCODE_CONFIG_PATH` | Optional – path to the OpenCode config file (defaults to `config.json`). |
| `BEDROCK_REGION` | Optional – AWS region (default `us-east-1`). |

## Usage
```bash
# Set your token (or export it in your shell)
export AWS_BEARER_TOKEN_BEDROCK=your_token_here

# Run the tool
node sync-models.js
```

### Flags
- `--dry-run` – prints what would change without writing the file.
- `--debug` – prints additional diagnostic information.

## Example Workflow
1. Clone the repo.
2. Install dependencies (none required – only Node built‑ins).
3. Create a `config.json` (or rely on the default) with a `models` array.
4. Run the script – it will fetch, transform, and update the file.
5. Commit any changes to your repository (Git is not invoked by the script).

## License
MIT – feel free to adapt and reuse.
