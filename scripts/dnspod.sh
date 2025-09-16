#!/bin/sh

arLog() {

    >&2 echo "$@"

}

# Use curl or wget open url
# Args: url postdata

arRequest() {

    local url="$1"
    local data="$2"

    local params=""
    local agent="AnripDdns/6.4.0(wang@rehiy.com)"

    if type curl >/dev/null 2>&1; then
        if echo $url | grep -q https; then
            params="$params -k"
        fi
        if [ -n "$data" ]; then
            params="$params -d $data"
        fi
        curl -s -A "$agent" $params $url
        return $?
    fi

    if type wget >/dev/null 2>&1; then
        if echo $url | grep -q https; then
            params="$params --no-check-certificate"
        fi
        if [ -n "$data" ]; then
            params="$params --post-data $data"
        fi
        wget -qO- -U "$agent" $params $url
        return $?
    fi

    return 1

}

# Dnspod Bridge
# Args: interface data

arDdnsApi() {

    local dnsapi="https://dnsapi.cn/${1:?'Info.Version'}"
    local params="login_token=$arToken&format=json&lang=en&$2"

    arRequest "$dnsapi" "$params"

}

# Fetch Record Id
# Args: domain subdomain recordType

arDdnsLookup() {

    local errMsg

    local recordId

    if [ "$1" != "@" ]; then
        # No sub_domain for root domain
        subDomainRule="&sub_domain=$1"
    fi

    # Get Record Id
    recordId=$(arDdnsApi "Record.List" "domain=$2${subDomainRule}&record_type=$3")
    recordId=$(echo $recordId | sed 's/.*"id":"\([0-9]*\)".*/\1/')

    if ! [ "$recordId" -gt 0 ] 2>/dev/null ;then
        errMsg=$(echo $recordId | sed 's/.*"message":"\([^\"]*\)".*/\1/')
        arLog "> arDdnsLookup - $errMsg"
        if [ $arIsCreateRecord -eq 1 ]; then
            if [ "$errMsg" = "No records on the list" ]; then
                return 2
            fi
        fi
        return 1
    fi

    echo $recordId
}

# Update Record Value
# Args: domain subdomain recordId recordType [hostIp]
arDdnsUpdate() {

    local errMsg

    local recordRs
    local recordCd
    local recordIp

    local lastRecordIp
    if [ "$4" = "CNAME" ]; then
        recordRs=$(arDdnsApi "Record.Modify" "domain=$2&sub_domain=$1&record_id=$3&record_type=$4&value=$5&record_line=%e9%bb%98%e8%ae%a4")

        # parse result
        recordCd=$(echo $recordRs | sed 's/.*{"code":"\([0-9]*\)".*/\1/')
        recordVal=$(echo $recordRs | sed 's/.*,"value":"\([^"]*\)".*/\1/')
        # arLog $recordRs

        # check result
        if [ "$recordCd" != "1" ]; then
            errMsg=$(echo $recordRs | sed 's/.*,"message":"\([^"]*\)".*/\1/')
            arLog "> arDdnsUpdate - error: $errMsg"
            return 1
        else
            arLog "> arDdnsUpdate - updated: $recordVal" # updated event
            return 0
        fi
    else
        local lastRecordIpFile="$arLastRecordFile.$3"

        # fetch last ip
        if [ -f $lastRecordIpFile ]; then
            lastRecordIp=$(cat $lastRecordIpFile)
        fi

        # fetch from api
        if [ -z "$lastRecordIp" ]; then
            recordRs=$(arDdnsApi "Record.Info" "domain=$2&record_id=$3")
            recordCd=$(echo $recordRs | sed 's/.*{"code":"\([0-9]*\)".*/\1/')
            lastRecordIp=$(echo $recordRs | sed 's/.*,"value":"\([0-9a-fA-F\.\:]*\)".*/\1/')
        fi

        # update ip
        if [ -z "$5" ]; then
            recordRs=$(arDdnsApi "Record.Ddns" "domain=$2&sub_domain=$1&record_id=$3&record_type=$4&record_line=%e9%bb%98%e8%ae%a4")
        else
            if [ "$5" = "$lastRecordIp" ]; then
                arLog "> arDdnsUpdate - unchanged: $lastRecordIp" # unchanged event
                return $arErrCodeUnchanged
            fi
            recordRs=$(arDdnsApi "Record.Ddns" "domain=$2&sub_domain=$1&record_id=$3&record_type=$4&value=$5&record_line=%e9%bb%98%e8%ae%a4")
        fi

        # parse result
        recordCd=$(echo $recordRs | sed 's/.*{"code":"\([0-9]*\)".*/\1/')
        recordIp=$(echo $recordRs | sed 's/.*,"value":"\([0-9a-fA-F\.\:]*\)".*/\1/')

        # check result
        if [ "$recordCd" != "1" ]; then
            errMsg=$(echo $recordRs | sed 's/.*,"message":"\([^"]*\)".*/\1/')
            arLog "> arDdnsUpdate - error: $errMsg"
            return 1
        elif [ "$recordIp" = "$lastRecordIp" ]; then
            arLog "> arDdnsUpdate - unchanged: $recordIp" # unchanged event
            return $arErrCodeUnchanged
        else
            arLog "> arDdnsUpdate - updated: $recordIp" # updated event
            if [ -n "$lastRecordIpFile" ]; then
                echo $recordIp > $lastRecordIpFile
            fi
            return 0
        fi
    fi

}

# Create Record
# Args: domain subdomain recordType hostIp

arDdnsCreate() {

    local errMsg

    local recordRs
    local recordCd

    # create record
    recordRs=$(arDdnsApi "Record.Create" "domain=$2&sub_domain=$1&record_type=$3&value=$4&record_line=%e9%bb%98%e8%ae%a4")

    # parse result
    recordCd=$(echo $recordRs | sed 's/.*{"code":"\([0-9]*\)".*/\1/')
    recordId=$(echo $recordRs | sed 's/.*{"id":"\([0-9]*\)".*/\1/')

    # check result
    if [ "$recordCd" != "1" ]; then
        errMsg=$(echo $recordRs | sed 's/.*,"message":"\([^"]*\)".*/\1/')
        arLog "> arDdnsCreate - error: $errMsg"
        return 1
    fi

    arLog "> arDdnsCreate - created: $4"
    echo $recordId

}

arDdnsCheck() {

    local hostIp

    local recordId
    local recordType

    arLog "=== Check $1.$2 ==="

    if   [ "$3" = "6" ] && [ -n "$4" ]; then
        recordType=AAAA
        hostIp="$4"
        ipv6Check $hostIp
    elif [ "$3" = "4" ] && [ -n "$4" ]; then
        recordType=A
        hostIp="$4"
        ipv4Check $hostIp
    elif [ "$3" = "domain" ] && [ -n "$4" ]; then
        recordType=CNAME
        hostIp="$4"
    else
        recordType=A
        #host command need install dnsutils. use: apt install dnsutils
        hostIp=$(host www.visa.com.sg | sed -n '3p' | awk -F' has address ' '{print $2}')
        ipv4Check $hostIp
    fi

    errCode=$?
    if [ $errCode -eq 0 ]; then
        arLog "> Host Ip/Domain: $hostIp"
        arLog "> Record Type: $recordType"
    elif [ $errCode -eq 2 ]; then
        arLog "> Host Ip: Auto"
        arLog "> Record Type: $recordType"
    else
        arLog "$hostIp"
        return $errCode
    fi

    arLog "Fetching RecordId"
    recordId=$(arDdnsLookup "$1" "$2" "$recordType")

    errCode=$?
    if [ $errCode -eq 0 ]; then
        arLog "> Record Id: $recordId"
    elif [ $errCode -eq 2  ]; then
        arLog "Creating Record value"
        recordId=$(arDdnsCreate "$1" "$2" "$recordType" "$hostIp")
        errCode=$?
        if [ $errCode -eq 0 ]; then
            arLog "> Record Id: $recordId"
            return 0
        else
            arLog "$recordId"
            return $errCode
        fi
    else
        arLog "$recordId"
        return $errCode
    fi

    arLog "Updating Record value"
    arDdnsUpdate "$1" "$2" "$recordId" "$recordType" "$hostIp"
}


ipv4Check() {
    if [ -z "$(echo "$1" | grep -E '^[0-9\.]+$')" ]; then
        arLog "> Invalid ipv4 address"
        return 1
    fi
}

ipv6Check() {
    if [ -z "$(echo "$1" | grep -E '^[0-9a-fA-F:]+$')" ]; then
        arLog "> arDevIp6 - Invalid ip address"
        return 1
    fi
}

arIsCreateRecord=1
arErrCodeUnchanged=1
arLastRecordFile=/tmp/ardnspod_last_record

#arToken=123456,1111111111111111
#arDdnsCheck subdomain domain 6/4/domain addr

