# Load tests for MANAS360 CBT

This folder contains load-test artifacts to simulate and measure 100 concurrent CBT sessions (100 patients + 100 therapists), Redis stress tests, and guidance for metrics and scaling.

Files:
- `artillery/cbt-socketio.yml` — Artillery script that simulates socket.io clients (patients + therapists), heartbeats, answer messages, and reconnect storms.
- `artillery/processor.js` — helper functions used by the Artillery script.
- `redis/redis-stress.sh` — simple Redis Streams and redis-benchmark stress scripts.
- `metrics.md` — recommended metrics and Prometheus/Grafana guidance.

Quick start (requires Node + npm and Artillery):

1. Install Artillery locally (recommended):

```bash
cd load-tests/artillery
npm install
npx artillery run cbt-socketio.yml
```

2. Run Redis stress test (ensure you point to the correct host/port):

```bash
cd load-tests/redis
bash redis-stress.sh
```

See `metrics.md` for what to monitor and scaling recommendations.
