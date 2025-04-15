#!/bin/ash
cd $(dirname $(readlink -f "$0"))

APP_NAME="clash"
APP_PATH="/apps/clash"
PID_FILE="/tmp/${APP_NAME}.pid"
RUN_COMMAND="${APP_PATH}/clash -d ${APP_PATH} -f ${APP_PATH}/config.yaml"

start() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "$APP_NAME is already running (PID: $(cat "$PID_FILE"))"
    else
        echo "Starting $APP_NAME..."
        $RUN_COMMAND > /dev/null 2>&1 &
        echo $! > "$PID_FILE"
        echo "$APP_NAME started (PID: $(cat "$PID_FILE"))"
    fi
}

stop() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "Stopping $APP_NAME..."
            kill "$PID"
            rm -f "$PID_FILE"
            echo "$APP_NAME stopped."
        else
            echo "Process not running. Cleaning up PID file."
            rm -f "$PID_FILE"
        fi
    else
        echo "$APP_NAME is not running."
    fi
}

restart() {
    echo "Restarting $APP_NAME..."
    stop
    sleep 1
    start
}

status() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "$APP_NAME is running (PID: $(cat "$PID_FILE"))"
    else
        echo "$APP_NAME is not running."
    fi
}

CMD="$1"

case "$CMD" in
    ""|start) start ;;
    stop) stop ;;
    restart) restart ;;
    status) status ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
