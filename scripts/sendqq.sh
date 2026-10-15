#!/bin/bash

set -e

: "${QN_AUTH_TOKEN:?请设置 QN_AUTH_TOKEN 环境变量}"

if [ "$#" -lt 2 ]; then
    echo "用法: sendqq.sh <openid> <message>" >&2
    exit 1
fi

openid="$1"
msg="$2"

url="https://qnotifier.bunnyxyz.eu.org/${QN_AUTH_TOKEN}/sendMessage"

curl -kfsS -X POST "$url" \
    -H 'Content-Type: application/json' \
    -d "$(jq -n \
        --arg text "$msg" \
        --arg openid "$openid" \
        '{umo: $openid, text: $text, parse_mode: "markdown"}')"
