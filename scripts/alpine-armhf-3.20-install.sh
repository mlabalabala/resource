#!/bin/bash
set -x
pkg install -y proot

cd $(dirname $(readlink -f "$0"))
osname='alpine'
folder='fs'
shname='start-'$osname'.sh'
tarball='rootfs.tar.xz'
if [[ ! -f "$HOME/$tarball" ]]; then
echo "下载 '$osname' 镜像文件 '$tarball'，请耐心等待"
dlurl='https://mirrors.tuna.tsinghua.edu.cn/lxc-images/images/alpine/3.20/armhf/default'
lastedbuilddate=$(curl -sk -L ${dlurl} | grep -oP '(?<=title\=")[^"]+(?=">)' | tail -n 1)
curl -#LOk $dlurl/$lastedbuilddate/$tarball
fi
echo '正在解压镜像 请耐心等待'
mkdir -p $HOME/ternux/$osname/$folder
proot --link2symlink tar -Jxf $tarball -C $HOME/ternux/$osname/$folder --exclude="dev"||:
echo '解压完成 正在删除已下载的镜像'
rm -rf $tarball
echo '正在优化系统设置'
mkdir -p $HOME/ternux/$osname/binds
cat > $HOME/ternux/$osname/$shname <<EOF
#!/data/data/com.termux/files/usr/bin/bash
#cd \$(dirname \$0)
cd \$(dirname \$(readlink -f "\$0"))
unset LD_PRELOAD
command="proot"
command+=" --link2symlink"
command+=" -0"
command+=" -r fs"
if [ -n "\$(ls -A binds)" ]; then
    for f in binds/* ;do
      . \$f
    done
fi
command+=" -b /dev"
command+=" -b /proc"
command+=" -b fs/root:/dev/shm"
## uncomment the following line to have access to the home directory of termux
#command+=" -b /data/data/com.termux/files/home:/root"
## uncomment the following line to mount /sdcard directly to /
#command+=" -b /sdcard"
command+=" -b /data/data/com.termux/files/home:/media/termux"
command+=" -b /sdcard/Download:/media/sd"
command+=" -w /root"
command+=" /usr/bin/env -i"
command+=" HOME=/root"
command+=" PATH=/usr/local/sbin:/usr/local/bin:/bin:/usr/bin:/sbin:/usr/sbin:/usr/games:/usr/local/games"
command+=" TERM=\$TERM"
command+=" LANG=C.UTF-8"
command+=" TZ=Asia/Shanghai"
command+=" /bin/ash --login"
com="\$@"
if [ -z "\$1" ];then
    exec \$command
else
    \$command -c "\$com"
fi
EOF
termux-fix-shebang $HOME/ternux/$osname/$shname
chmod +x $HOME/ternux/$osname/$shname
echo 修改中科大软件源
sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' $HOME/ternux/$osname/$folder/etc/apk/repositories
echo 修改阿里DNS
echo -e 'nameserver 223.5.5.5\nnameserver 223.6.6.6\nnameserver 2400:3200::1\nnameserver 2400:3200:baba::1' >> $HOME/ternux/$osname/$folder/etc/resolv.conf 
echo 更新软件源
#apk add --update --no-cache curl jq py3-configobj py3-pip py3-setuptools python3 python3-dev
bash $HOME/ternux/$osname/$shname 'apk update;apk upgrade;apk add vim curl nodejs;exit'
rm -f $PREFIX/bin/alpinestart
ln -s $HOME/ternux/alpine/start-alpine.sh $PREFIX/bin/alpinestart
set +x
echo $os' 安装成功'
echo '通过alpinestart命令启动'
