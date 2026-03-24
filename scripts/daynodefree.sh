#!/bin/bash

datetime=$(TZ='Asia/Shanghai' date +'%Y,%m,%d')
y=$(echo $datetime | awk -F',' '{print $1}')
m=$(echo $datetime | awk -F',' '{print $2}')
d=$(echo $datetime | awk -F',' '{print $3}')
#echo $y-$m-$d
daysuburl="https://node.nodefree.me/$y/$m/$y$m$d.txt"
#echo $daysuburl
nodefreeendata=$(curl -sk $daysuburl)
nodefreedata=$(echo $nodefreeendata | base64 -d) 

daysuburl="https://yoyapai.com/mianfeijiedian/$y$m$d-ssr-v2ray-vpn-jiedian-yoyapai.com.txt"
#echo $daysuburl
yoyapaidata=$(curl -sk $daysuburl)

outfile="nodefree.txt"
{ echo "$nodefreedata"; echo "$yoyapaidata"; } | base64 | tr -d '\n' > $outfile
