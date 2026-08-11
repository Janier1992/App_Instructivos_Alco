---
name: insforge-backend
description: Build agent-native PostgreSQL backends with database, auth, storage, edge functions, compute, hosting, and AI model gateway using InsForge. Use when provisioning, managing, or querying InsForge.
license: MIT
---

# InsForge Agent-Native Backend Development

## Purpose
Guide AI coding agents and developers in interacting with and operating InsForge backend infrastructure. InsForge is designed to be managed directly by AI agents using CLI tools and MCP servers.

## When to Use
- Managing backend infrastructure in projects using InsForge.
- Creating PostgreSQL schemas, tables, and executing queries.
- Setting up GoTrue authentication and MinIO-based storage.
- Deploying Edge Functions (Deno) and configuring the AI model gateway.
- Interacting with the CLI or fetching internal platform documentation.

## How to Use

### 1. CLI Authentication
InsForge CLI must always be run using `npx`; do not install it globally.

#### Autonomous Registration (ID-JAG)
If running inside a provider that supports WorkOS ID-JAG:
1.confirm user consent.
2. Mint the ID-JAG token and post it to:
   ```http
   POST https://api.insforge.dev/agent/auth
   ```
3. Use the returned API key (`uak_...`) to log the CLI in:
   ```bash
   npx @insforge/cli login --user-api-key uak_xxxxxxxx
   ```

#### Standard CLI Login
```bash
npx @insforge/cli login
```

### 2. Linking and Verifying
```bash
# Link the current directory to your InsForge project
npx @insforge/cli link

# Verify the currently authenticated project and user
npx @insforge/cli current

# Discover project metadata and configured infrastructure
npx @insforge/cli metadata
```

### 3. Fetching Documentation via CLI
You can view internal docs directly from the terminal:
```bash
# List all available documents
npx @insforge/cli docs

# Show general instructions
npx @insforge/cli docs instructions

# Show database TypeScript documentation
npx @insforge/cli docs db typescript

# Show authentication Swift documentation
npx @insforge/cli docs auth swift

# Show storage REST API documentation
npx @insforge/cli docs storage rest-api
```

### 4. SDK Integration
For application code, install the official InsForge SDK:
```bash
npm install @insforge/sdk
```

#### TypeScript Integration Example
```typescript
import { createClient } from '@insforge/sdk'

// Initialize InsForge client
const insforge = createClient({
  projectUrl: process.env.INSFORGE_PROJECT_URL!,
  anonKey: process.env.INSFORGE_ANON_KEY!
})

// Database query example
export async function fetchItems() {
  const { data, error } = await insforge
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })
    
  if (error) throw error
  return data
}
```

## Best Practices
- ⚡ **Always use `npx`**: Always run CLI commands prefixed with `npx @insforge/cli` to ensure version matching.
- 🤖 **Agent-First Workflow**: Leverage MCP capabilities to allow the coding assistant to autonomously write schemas and configure storage buckets.
- 💡 **Metadata Discovery**: Run `npx @insforge/cli metadata` at the start of a task to know exactly what tables and services are available.
