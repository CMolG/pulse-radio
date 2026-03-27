---
task_id: ARCH-084
target_agent: auto-feature-engineer-finite
target_module: ecosystem.config.js
priority: medium
status: completed
---

# Create PM2 Ecosystem Configuration File

## Context

The deployment script runs `pm2 restart pulse-radio` with zero configuration visibility. There is no `ecosystem.config.js` or `pm2.config.js`, meaning:
- No documented memory limits (a memory leak could consume all server RAM).
- No restart strategy beyond pm2 defaults.
- No log rotation configuration.
- No environment variable injection from config.
- Process configuration is ad-hoc and undiscoverable.

PM2 ecosystem files are the standard way to declare production process configuration declaratively.

## Directive

1. **Create `ecosystem.config.js`** at project root:
   ```javascript
   module.exports = {
     apps: [{
       name: 'pulse-radio',
       script: 'node_modules/.bin/next',
       args: 'start',
       cwd: '/var/www/pulse-radio',
       env: {
         NODE_ENV: 'production',
         PORT: 3000,
       },
       instances: 1,
       max_memory_restart: '256M',
       autorestart: true,
       watch: false,
       max_restarts: 10,
       restart_delay: 5000,
       log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
       error_file: '/var/log/pulse-radio/error.log',
       out_file: '/var/log/pulse-radio/out.log',
       merge_logs: true,
       kill_timeout: 5000,  // Graceful shutdown window
     }],
   };
   ```

2. **Update `.github/workflows/deploy.yml`**:
   - Replace `pm2 restart pulse-radio` with `pm2 startOrRestart ecosystem.config.js`.

3. **Add log rotation** (if pm2-logrotate is available):
   ```bash
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   pm2 set pm2-logrotate:retain 7
   ```

4. **Document** the PM2 configuration in README or RUNBOOK.

**Boundaries:**
- Do NOT enable cluster mode (Next.js handles its own worker threads).
- Do NOT add secrets to the ecosystem file (use `.env.local` on the server).
- Keep `instances: 1` unless the server has 4+ cores.
- `kill_timeout` should match the graceful shutdown handler in ARCH-078.

## Acceptance Criteria

- [ ] `ecosystem.config.js` exists at project root.
- [ ] Memory limit set to 256MB with auto-restart.
- [ ] Log paths configured with date formatting.
- [ ] Deploy workflow updated to use ecosystem file.
- [ ] `pm2 start ecosystem.config.js` works locally (smoke test).
