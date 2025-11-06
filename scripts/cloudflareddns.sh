#!/bin/bash
# 支持：自动获取 zone_id，查询、更新、创建、删除 DNS 记录（含根域）

# ========== 用户配置 ==========
apiKey="${apiKey:-}"  # 若已在环境变量中设置可省略
cacheDir="${HOME}/.cache"
cacheFile="${cacheDir}/cf_zone_cache.json"
mkdir -p "$cacheDir"

# ========== 通用函数 ==========
getZoneId() {
  local domain="$1"
  [ -z "$apiKey" ] && { echo "apiKey invalid"; return 1; }

  # 从缓存读取 zone_id，减少 API 调用
  if [ ! -f "$cacheFile" ]; then
    curl -s -X GET "https://api.cloudflare.com/client/v4/zones" \
      -H "Authorization: Bearer $apiKey" \
      -H "Content-Type: application/json" >"$cacheFile"
  fi

  local zoneId
  zoneId=$(jq -r --arg domain "$domain" '.result[] | select(.name==$domain) | .id' "$cacheFile")

  if [ -z "$zoneId" ]; then
    echo "get zone id failed for $domain"
    return 1
  fi

  echo "$zoneId"
}

checkConfValid() {
  if [ -z "$zoneId" ]; then
    echo "zoneId invalid"
    return 1
  fi
  if [ -z "$apiKey" ]; then
    echo "apiKey invalid"
    return 1
  fi
  return 0
}


# ========== 查询记录 ==========
listRecord() {
  checkConfValid || return 1
  local recordName="$1"
  local type="${2:-A}"

  local result
  result=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records?name=$recordName&type=$type" \
    -H "Authorization: Bearer $apiKey" -H "Content-Type: application/json")

  local success
  success=$(jq -r '.success' <<<"$result")
  [ "$success" != "true" ] && { jq -r '.errors[0].message' <<<"$result"; return 1; }

  local id content proxied
  id=$(jq -r '.result[0].id' <<<"$result")
  content=$(jq -r '.result[0].content' <<<"$result")
  proxied=$(jq -r '.result[0].proxied' <<<"$result")

  [ "$id" = "null" ] && { echo "record not found"; return 1; }
  echo "$id" "$content" "$proxied"
}

# ========== 创建/更新/删除记录 ==========
createRecord() {
  checkConfValid || return 1
  local recordName="$1" type="$2" value="$3" isProxy="$4"
  local body
  body=$(jq -n --arg type "$type" --arg name "$recordName" --arg content "$value" --argjson proxied "$isProxy" \
    '{type:$type,name:$name,content:$content,ttl:0,proxied:$proxied}')

  local res
  res=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" \
    -H "Authorization: Bearer $apiKey" -H "Content-Type: application/json" --data "$body")

  jq -e '.success' <<<"$res" >/dev/null || { jq -r '.errors[0].message' <<<"$res"; return 1; }
  jq -r '.result.id' <<<"$res"
}

updateRecord() {
  checkConfValid || return 1
  local recordName="$1" recordId="$2" type="$3" value="$4" isProxy="$5"
  local body
  body=$(jq -n --arg type "$type" --arg name "$recordName" --arg content "$value" --argjson proxied "$isProxy" \
    '{type:$type,name:$name,content:$content,ttl:0,proxied:$proxied}')

  local res
  res=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$recordId" \
    -H "Authorization: Bearer $apiKey" -H "Content-Type: application/json" --data "$body")

  jq -e '.success' <<<"$res" >/dev/null && echo "update success" || { echo "update failed"; jq -r '.errors[0].message' <<<"$res"; }
}

deleteRecord() {
  local recordName="$1" type="${2:-A}"
  checkConfValid || return 1

  local info id
  info=$(listRecord "$recordName" "$type") || return 1
  id=$(awk '{print $1}' <<<"$info")

  local res
  res=$(curl -s -X DELETE "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$id" \
    -H "Authorization: Bearer $apiKey" -H "Content-Type: application/json")

  jq -e '.success' <<<"$res" >/dev/null && echo "delete success: $recordName" || jq -r '.errors[0].message' <<<"$res"
}

# ========== 智能更新接口 ==========
operateRecord() {
  local subDomain="$1" domain="$2" type="${3:-A}" value="$4" proxyFlag="${5:-0}"
  local recordName="$subDomain.$domain"
  [ "$subDomain" = "@" ] && recordName="$domain"
  local isProxy=false
  [ "$proxyFlag" = "1" ] && isProxy=true

  zoneId="${zoneId:-$(getZoneId "$domain")}" || return 1
  checkConfValid || return 1

  echo "Updating record: $recordName ($type)"
  local info id currentValue proxied
  if info=$(listRecord "$recordName" "$type"); then
    id=$(awk '{print $1}' <<<"$info")
    currentValue=$(awk '{print $2}' <<<"$info")
    proxied=$(awk '{print $3}' <<<"$info")

    if [ "$currentValue" = "$value" ] && [ "$proxied" = "$isProxy" ]; then
      echo "Record already up to date ($currentValue)"
      return 0
    fi
    updateRecord "$recordName" "$id" "$type" "$value" "$isProxy"
  else
    echo "Record not found, creating..."
    createRecord "$recordName" "$type" "$value" "$isProxy" && echo "Create success: $recordName"
  fi
}
