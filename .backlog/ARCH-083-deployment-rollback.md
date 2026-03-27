---
task_id: ARCH-083
target_agent: auto-optimizer-finite
target_module: .github/workflows/deploy.yml
priority: critical
status: pending
---

# Add Deployment Rollback & Post-Deploy Health Verification

## Context

The current deployment pipeline (`.github/workflows/deploy.yml`) is a one-way linear process:
```
git pull → npm install → npm run build → pm2 restart
```

There is:
- **No rollback capability**: A broken build reaches production with zero recovery path.
- **No health check verification**: The deploy succeeds even if the app crashes on startup.
- **No build tagging**: No way to identify which git SHA is deployed.
- **No backup**: Previous working version is overwritten.

A single bad commit deployed to production requires manual SSH intervention to recover — unacceptable for a 100K+ user app.

> **Dependency**: Requires ARCH-033 (Health Check Endpoint) to be implemented for full post-deploy verification. Can be deployed without it (use basic HTTP 200 check on root page).

## Directive

1. **Add git tag on successful builds**:
   ```yaml
   - name: Tag deployment
     run: |
       git tag -a "deploy-$(date +%Y%m%d-%H%M%S)" -m "Deployed from CI"
       git push origin --tags
   ```

2. **Backup previous build before overwriting**:
   ```yaml
   - name: Backup current build
     run: |
       cp -r .next .next.backup 2>/dev/null || true
   ```

3. **Add post-deploy health check**:
   ```yaml
   - name: Verify deployment health
     run: |
       sleep 5  # Wait for pm2 restart
       curl --fail --max-time 10 http://localhost:3000/ || {
         echo "Health check failed! Rolling back..."
         # Rollback steps here
         exit 1
       }
   ```

4. **Add rollback script** (`scripts/rollback.sh`):
   ```bash
   #!/bin/bash
   # Restore previous build
   rm -rf .next
   mv .next.backup .next
   pm2 restart pulse-radio
   echo "Rollback complete"
   ```

5. **Document rollback procedure** in a `RUNBOOK.md` or inline comments.

**Boundaries:**
- Do NOT implement blue-green or canary deployments (too complex for single-server setup).
- Do NOT change the SSH/pm2 deployment method (keep it simple).
- Keep rollback to 1 previous version (not a full version history).
- Health check should timeout after 10 seconds and fail fast.

## Acceptance Criteria

- [ ] Successful deployments are tagged with timestamp in git.
- [ ] Previous `.next` build is backed up before overwriting.
- [ ] Post-deploy health check runs and fails the pipeline if app is unresponsive.
- [ ] Rollback script exists and is documented.
- [ ] Failed deploys trigger automatic rollback.
- [ ] Existing deploy workflow still works for happy path.
