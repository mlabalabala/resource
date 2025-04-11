#!/bin/bash

datetime=$(date +'%Y,%m,%d')
y=$(echo $datetime | awk -F',' '{print $1}')
m=$(echo $datetime | awk -F',' '{print $2}')
d=$(echo $datetime | awk -F',' '{print $3}')
#echo $y-$m-$d
daysuburl="https://nodefree.githubrowcontent.com/$y/$m/$y$m$d.txt"
outfile="nodefree.txt"
#echo $daysuburl
curl -sk $daysuburl -o $outfile