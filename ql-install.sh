set -x
echo -e "\nexport QL_DIR=/ql\nexport QL_BRANCH=master\nexport LANG=zh_CN.UTF-8\nexport TERMUX_APK_RELEASE=F-DROID\nexport SHELL=/bin/bash\nexport PNPM_HOME=~/.local/share/pnpm\nexport PATH=$PATH:~/.local/share/pnpm:~/.local/share/pnpm/global/5/node_modules\n"  >> /etc/profile.d/ql_env.sh
source /etc/profile
echo -e "nameserver 119.29.29.29\nnameserver 8.8.8.8" > /etc/resolv.conf
sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories


apk update -f
apk upgrade
apk --no-cache add -f bash make nodejs npm coreutils moreutils git curl wget tzdata perl openssl nginx jq openssh python3 py3-pip
rm -rf /var/cache/apk/*
apk update

ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
echo "Asia/Shanghai" > /etc/timezone

npm config set registry https://registry.npmmirror.com
npm install -g pnpm
pnpm add -g pm2 ts-node typescript tslib

curl -o /qinglong-master.zip http://www.bunnyabc.eu.org:5002/d/guest/res_linux/qinglong-master.zip
unzip -o /qinglong-master.zip -d /
cd $QL_DIR
cp -f .env.example .env
chmod 777 $QL_DIR/shell/*.sh
chmod 777 $QL_DIR/docker/*.sh
curl -o $QL_DIR/qinglong-static.zip http://www.bunnyabc.eu.org:5002/d/guest/res_linux/qinglong-static.zip
unzip -o $QL_DIR/qinglong-static.zip -d $QL_DIR/
rm -f $QL_DIR/qinglong-*.zip /qinglong-*.zip
ln -s /ql/docker/docker-entrypoint.sh /usr/bin/qinglong
pnpm install --prod

npm cache clean --force
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
pnpm config set registry https://registry.npm.taobao.org/
npm config set registry https://registry.npm.taobao.org/
cd > /dev/null
python -m venv qlvenv
echo "source qlvenv/bin/activate" >> /etc/profile
source /etc/profile
echo "type < qinglong > to start!"
