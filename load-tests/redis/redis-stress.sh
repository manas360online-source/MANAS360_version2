#!/usr/bin/env bash
# Simple Redis stress helper: runs redis-benchmark and produces XADD load for streams
# Usage: bash redis-stress.sh [host] [port] [num_producers] [messages_per_producer]

HOST=${1:-127.0.0.1}
PORT=${2:-6379}
PRODUCERS=${3:-4}
MSG_PER=${4:-5000}

echo "Redis host=${HOST} port=${PORT} producers=${PRODUCERS} msgs_per_producer=${MSG_PER}"

echo "Running redis-benchmark (common ops)"
redis-benchmark -h "$HOST" -p "$PORT" -n 100000 -c 50 -P 16 -t set,get,lpush,lpop

echo "Launching stream XADD producers in background"
for i in $(seq 1 $PRODUCERS); do
  (
    for j in $(seq 1 $MSG_PER); do
      # XADD to stream 'session:responses'
      redis-cli -h "$HOST" -p "$PORT" XADD session:responses * producer "p${i}" seq "$j" payload "msg-${i}-${j}" >/dev/null
    done
    echo "producer $i done"
  ) &
done

wait
echo "All producers finished"
