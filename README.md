# PenTest Network Scanner

Full stack app for managing projects, companies, targets, scans, services, and vulnerabilities.  
Runs entirely on the host so local tools like `nmap` and `nuclei` can execute. PostgreSQL and (optionally) Nginx are expected to be installed locally.

## Overview
- Project -> Company -> Targets (IPs/domains) hierarchy.
- Hosts/services/vulnerabilities tables with filters, search, and bulk actions.
- Presets for common tools plus custom commands.
- JSON import with preview and selection before saving.
- Domain + IP stored separately with auto resolve.
- Vulnerability parsing and auto import for vuln type presets.

## Stack
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express
- DB: PostgreSQL (Drizzle ORM)
- Proxy: Nginx (local, optional)
- Execution: Scans run on the host

## Quick start (Kali / Linux)
### 1) Requirements
- Node.js 20+
- PostgreSQL (local)
- Nginx (local, optional)
- Local tools installed: `nmap`, `nuclei`, `nikto`, `wpscan`, etc.

### 2) Database setup (first run)
```sh
sudo -u postgres psql
```
```sql
CREATE USER ui_user WITH PASSWORD 'ui_password';
CREATE DATABASE ui_thoughts OWNER ui_user;
```

### 3) One shot deploy
```sh
./script/deploy.sh
```

This script:
1. Installs dependencies
2. Builds client and server
3. Tries to start PostgreSQL and checks readiness
4. Applies DB schema (`db:push`)
5. Starts the app on the host

### 4) Open the UI
- `http://localhost` (if you set up Nginx)
- `http://localhost:5000` (direct)

## Nginx (optional)
Use this if you want `http://localhost` without `:5000`:
```nginx
server {
    listen 80;
    server_name _;
    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Scripts
- `./script/deploy.sh`: build + DB readiness + schema + start app
- `./script/host-start.sh`: run app directly (assumes build exists)
- `./script/stop.sh`: stop the app using PID file

## Environment variables
You can override defaults before running:
```sh
export DB_HOST=127.0.0.1
export DB_PORT=55432
export DB_USER=ui_user
export DATABASE_URL=postgres://ui_user:ui_password@127.0.0.1:55432/ui_thoughts
export PORT=5000
```

## Data model
- Project -> contains Companies
- Company -> contains Hosts (IP + Domain)
- Host -> contains Services
- Service -> can have Vulnerabilities

## Scanning flow
1. Select project -> company -> targets
2. Pick a preset or enter a custom command
3. Command runs on the host
4. Results are parsed and stored:
   - Ports/services -> `services` table
   - Vulnerabilities -> `vulnerabilities` table (vuln type presets)

## Presets and outputType
Presets have `outputType`:
- `services`: ports/services table
- `vuln`: vulnerabilities table
- `raw`: raw output only

The server auto detects vuln presets by category/command and backfills old presets on startup.

## Importing scan JSON
- Use the Import file button to load JSON
- UI shows preview and lets you choose what to add
- Unselected data is discarded

## Common commands
```sh
# Start app manually (host)
./script/host-start.sh

# Rebuild
npm run build

# DB schema sync
npm run db:push
```

## Logs
```sh
tail -n 200 logs/app.log
```

## Troubleshooting
### UI not opening at localhost
```sh
tail -n 200 logs/app.log
```

### Tools not available
Tools not found on the host are disabled in the UI.  
Install the tool and restart the app.

### Scan results not imported
Only presets with `outputType = vuln` auto import into vulnerabilities.  
Use the Presets page to check or update output type.
# User-Interface-Thoughts-main-v2
# User-Interface-Thoughts-main-v2
# User-Interface-Thoughts-main-v2
