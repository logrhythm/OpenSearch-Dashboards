#!/usr/bin/bash
OSD_STARTUP_LOG=/var/log/probe/OSDStartup.log
echo "[INFO] Waiting for OSD to become reachable" >> $OSD_STARTUP_LOG
until /usr/bin/curl -I -XGET http://localhost:5601/analyze/api/status 2>/dev/null | grep -q "200"
do
   /usr/bin/sleep 1
done
echo "[INFO] OSD is reachable and returned a 200 status" >> $OSD_STARTUP_LOG
