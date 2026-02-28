# Metrics to monitor, alerting targets, and scaling recommendations

Recommended metrics
- Socket / application-level:
  - Message round-trip latency (ms): p50, p90, p99 — target p99 < 500ms
  - Connection rate: connects/sec, disconnects/sec
  - Active socket connections (total and per-instance)
  - Message throughput (messages/sec) per namespace/stream
  - Message error rates / failed deliveries

- Node process / host OS:
  - CPU utilization (per-core and total)
  - Memory RSS and heap used (MB)
  - Event loop lag (ms)
  - Garbage collection pause durations
  - FD / socket usage

- Redis:
  - Ops/sec (total + by command)
  - Memory usage and eviction stats
  - Latency (redis_latency_seconds histograms)
  - Connected clients
  - Stream lengths for key streams (e.g., `session:responses`)
  - XREAD/XADD throughput and pending list sizes

How to collect
- Expose Node metrics with `prom-client` and Node.js metrics (process_cpu_user_seconds_total, process_resident_memory_bytes, nodejs_eventloop_lag_seconds).
- Install `node_exporter` and `redis_exporter` and configure Prometheus to scrape them.
- Use Artillery's built-in report (JSON) to capture test summaries: `npx artillery run -o report.json cbt-socketio.yml` then `npx artillery report --output report.html report.json`.
- For OS-level profiling, use `pidstat`, `top`, `htop`, or `docker stats` (if using containers).

Alerting thresholds (example)
- p99 message latency > 500 ms → alert
- Error rate > 1% over 1 minute → alert
- Redis memory usage > 75% of instance memory → alert
- CPU > 80% sustained for 2 minutes → alert

Scaling recommendations
- Socket server scaling:
  - Use multiple Node.js instances behind a load balancer.
  - Use the `@socket.io/redis-adapter` so messages and rooms are synchronized across instances.
  - Prefer sticky sessions only if you need in-memory state per socket; otherwise use Redis adapter and avoid sticky sessions to enable even distribution.
  - For WebSocket/TCP LB, use an L4 load balancer (e.g., NGINX stream, AWS NLB) with health checks.

- Redis sizing and HA:
  - For Streams heavy write workloads, ensure Redis has enough memory and run in cluster mode for scale.
  - Monitor `instantaneous_ops_per_sec` and `used_memory_rss` during tests; scale Redis vertically first, then horizontally (sharding) if needed.
  - Consider writing Stream processing to separate consumer instances to avoid blocking clients.

- Horizontal scale guidance (rough):
  - 200 concurrent sockets is small; keep 1–2 Node instances for redundancy.
  - If message rates increase (hundreds/sec per session), plan ~1000s of sockets per Node process depending on message frequency and CPU. Run tests to determine per-instance capacity.
  - Add 20–30% headroom for GC and peak bursts.

Generating a performance report
- Use Artillery output JSON and the `artillery report` command to create HTML reports.
- Combine with Prometheus scrapes during the test window for time-series charts (CPU/mem/latency). Use Grafana dashboards to visualize p50/p90/p99 over time.
- Include Redis metrics (through `redis_exporter`) and include Stream length and XPENDING/XCLAIM stats.
