#!/bin/bash

# 配合cron 
# 59 9 * * * bash /path/to/yunshanfu.sh >> /path/to/yunshanfu.log 2>&1 &

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

run() {
    result=$(curl -s -X POST "https://scene.cup.com.cn/gfmnewoth/appback/couponAcquire" \
      -H "User-Agent: Mozilla/5.0 (Linux; Android 13; 23049RAD8C Build/TKQ1.221114.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/135.0.7049.38 Mobile Safari/537.36(com.unionpay.mobilepay) (cordova 7.0.0) (updebug 0) (clientVersion 322) (version 1022)(UnionPay/1.0 CloudPay)(language zh_CN)(languageFamily zh_CN)(upHtml)(walletMode 00)" \
      -H "Accept: application/json, text/plain, */*" \
      -H "Content-Type: application/json" \
      -H "Referer: https://scene.cup.com.cn/gsp_front/2025/index?appNo=YJHX044025065&channelNo=Q000101" \
      -H "appNo: YJHX044025065" \
      -H "channelNo: Q000101" 
      # ... 填入完整抓包数据 token/cookies/data等
      )

    log "$result"
    if echo "$result" | grep -iq "success"; then
        return 0
    else
        return 1
    fi
}

log "50秒后执行 ..."
sleep 50
start_time=$(date +%s)  # 记录起始时间
timeout=40              # 最长等待秒数

while true; do
    if run; then
        log "检测到 success，退出循环"
        break
    fi

    now=$(date +%s)
    elapsed=$((now - start_time))
    if [ "$elapsed" -ge "$timeout" ]; then
        log "已等待 $timeout 秒仍未检测到 success，退出循环"
        break
    fi

    sleep 0.2
done

