#!/bin/sh
checkConfValid() {
  local isValid=true
  if [ -z "$zoneId" ]; then
    echo "zoneId invalid"
    return 1
  fi
  if [ -z "$apiKey" ]; then
    echo "apiKey invalid"
    return 1
  fi
}
listRecord() {
  local recordName=$1
  local result=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records?name=$recordName" \
    -H "Content-Type:application/json" \
    -H "Authorization: Bearer $apiKey")

  local resourceId=$(echo "$result" | awk -F'"id":"' '{if(NF>1){split($2,a,"\""); print a[1]; exit}}')
  local currentValue=$(echo "$result" | awk -F'"content":"' '{if(NF>1){split($2,a,"\""); print a[1]; exit}}')
  local successStat=$(echo "$result" | awk -F'"success":' '{if(NF>1){split($2,a,","); gsub(/^[ \t]+|[ \t]+$/,"",a[1]); print a[1]; exit}}')
  local proxiedStat=$(echo "$result" | awk -F'"proxied":' '{if(NF>1){split($2,a,","); gsub(/^[ \t]+|[ \t]+$/,"",a[1]); print a[1]; exit}}')

  if [ -n "$resourceId" ] && [ "$successStat" != "true" ]; then
    echo "$result" | awk -F'"message":"' '{if(NF>1){split($2,a,"\""); print a[1]; exit}}'
    return 1
  fi
  echo "$resourceId" "$currentValue" "$proxiedStat"
}
updateRecord() {
  local recordName=$1
  local resourceId=$2
  local type=$3
  local value=$4
  local isProxy=$5
  local result=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$resourceId" \
    -H "Authorization: Bearer $apiKey" \
    -H "Content-Type: application/json" \
    --data "{\"type\":\"$type\",\"name\":\"$recordName\",\"content\":\"$value\",\"ttl\":600,\"proxied\":$isProxy}")
  local successStat=$(echo "$result" | awk -F'"success":' '{if(NF>1){split($2,a,","); gsub(/^[ \t]+|[ \t]+$/,"",a[1]); print a[1]; exit}}')
  [ "$successStat" = "true" ]
  return $?
}
createRecord() {
  local recordName=$1
  local type=$2
  local value=$3
  local isProxy=$4
  local result=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" \
    -H "Authorization: Bearer $apiKey" \
    -H "Content-Type: application/json" \
    --data "{\"type\":\"$type\",\"name\":\"$recordName\",\"content\":\"$value\",\"ttl\":600,\"proxied\":$isProxy}")

  local successStat=$(echo "$result" | awk -F'"success":' '{if(NF>1){split($2,a,","); gsub(/^[ \t]+|[ \t]+$/,"",a[1]); print a[1]; exit}}')
  if [ "$successStat" != "true" ]; then
    echo "$result" | awk -F'"message":"' '{if(NF>1){split($2,a,"\""); print a[1]; exit}}'
    return 1
  fi
  local recordId=$(echo "$result" | awk -F'"id":"' '{if(NF>1){split($2,a,"\""); print a[1]; exit}}')
  echo "$recordId"
}
deleteRecord() {
  local recordName=$1
  currentStat=$(listRecord "$recordName")
  if [ $? -eq 1 ]; then
    echo "listRecord failed"
    return 1
  fi
  resourceId=$(echo "$currentStat" | awk '{print $1}')
  if [ -n "$resourceId" ]; then
    local result=$(curl -s -X DELETE "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$resourceId" \
        -H "Authorization: Bearer $apiKey" \
        -H "Content-Type: application/json")

    local successStat=$(echo "$result" | awk -F'"success":' '{if(NF>1){split($2,a,","); gsub(/^[ \t]+|[ \t]+$/,"",a[1]); print a[1]; exit}}')

    if [ "$successStat" = "true" ]; then
        echo "Delete record success: $resourceId"
        return 0
    else
        local message=$(echo "$result" | awk -F'"message":"' '{if(NF>1){split($2,a,"\""); print a[1]; exit}}')
        echo "Delete record failed: $message"
        return 1
    fi
  else
    echo "Delete record failed: $recordName donest exist!"
  fi
}
updateRecord() {
  local recordName=$1
  local type=$2
  local val=$3
  local isProxy=true
  [ "0" = "$4" ] && isProxy=false
  echo "open little yellow cloud: " $isProxy

  currentStat=$(listRecord "$recordName")
  if [ $? -eq 1 ]; then
    echo "listRecord failed"
    return 1
  fi
  resourceId=$(echo "$currentStat" | awk '{print $1}')
  currentValue=$(echo "$currentStat" | awk '{print $2}')
  proxiedStat=$(echo "$currentStat" | awk '{print $3}')
  #echo "resourceId: $resourceId"
  #echo "currentValue: $currentValue"
  #echo "proxiedStat: $proxiedStat"

  if [ -z "$resourceId" ]; then
    echo "record not exist, will create first"
    createdRecordResourceId=$(createRecord $recordName $type $val $isProxy)
    if [ $? -eq 0 ] && [ -n "$createdRecordResourceId" ]; then
      echo "Create record success, id: $createdRecordResourceId"
      return 0
    else
      echo "Create record failed. Exit"
      return 1
    fi
  fi

  echo "$proxiedStat" "$isProxy"
  if [ "$currentValue" = "$val" ] && [ "$proxiedStat" = "$isProxy" ]; then
    echo "DNS value already same as external address, will not update, exit."
    return 0
  fi

  updateRecord $recordName $resourceId $type $val $isProxy
  if [ $? -eq 0 ]; then
    echo "update success"
  else
    echo "update failed"
  fi
}
#export apiKey="111111111111111111111111111111"
#export zoneId="1111111111111111111111111111"
#update dns record/create if not exist
#updateRecord domain recordType vaule proxy(0/1 def:1)
#delete by domain name
#deleteRecord domain
