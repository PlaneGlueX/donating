#!/bin/bash
# Walk where the GPS points: look at its next point, walk a bit, repeat. Prints where it went. Usage: mc-follow.sh <steps> [seconds]
n=${1:-8}; s=${2:-1.5}
for ((i=0;i<n;i++)); do
  st=$(powershell -NoProfile -ExecutionPolicy Bypass -File tools/rcon.ps1 "dphone gps Explosde" | grep "^GPS")
  nx=$(echo "$st" | sed -E 's/.* next=([-0-9.,]+) .*/\1/')
  powershell -NoProfile -ExecutionPolicy Bypass -File tools/mc-walk.ps1 "f$nx w$s" >/dev/null
  echo "$st" | sed -E 's/GPS Explosde active=([a-z]+).*state=([a-z]+) left=([0-9.]+) next=([-0-9.,]+) turn=([a-z@0-9.]+).*/\1 \2 left=\3 next=\4 turn=\5/' | cut -c1-110
done
