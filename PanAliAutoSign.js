var myDate = new Date();
var data_time = myDate.toLocaleDateString()

function sleep(d) {
  for (var t = Date.now(); Date.now() - t <= d;);
}
var tokenColumn = "A"; // 刷新Token
var loginDateColumn = "B"; // 登录时间
var isSignColumn = "C"; // 是否签到
var isNotifyColumn = "D"; // 是否开启通知列
var userEmailColumn = "E"; // 用户接收邮件地址
var userNum = 1
for (let row = 2; row <= userNum+1; row++) {
  var value = ""
  var loginDate = Application.Range(loginDateColumn + row).Text
  var isNotify = Application.Range(isNotifyColumn + row).Text
  var userEmail = Application.Range(userEmailColumn + row).Text
  var refresh_token = Application.Range(tokenColumn + row).Text
  var isSign = Application.Range(isSignColumn + row).Text

  if (refresh_token != "") {
    // 发起网络请求-获取token
    let data = HTTP.post("https://auth.aliyundrive.com/v2/account/token",
      JSON.stringify({
        "grant_type": "refresh_token",
        "refresh_token": refresh_token
      })
    )
    data = data.json()
    var access_token = data['access_token']
    var r_token = data['refresh_token']
    var phone = data["user_name"]

    if (access_token == undefined) {
      var value = "【" + userEmail + "】的token值错误，程序执行失败，请重新复制正确的token值" + "\n";
      sendEmail(isNotify, userEmail, value);
    } else {
      try {
        var access_token2 = 'Bearer ' + access_token
        // 签到
        let data2 = HTTP.post("https://member.aliyundrive.com/v1/activity/sign_in_list",
          JSON.stringify({ "_rx-s": "mobile" }),
          { headers: { "Authorization": access_token2 } }
        )
        data2 = data2.json()
        var signin_count = data2['result']['signInCount']
        var value = value + "用户：" + userEmail + "-签到成功, 本月累计签到" + signin_count + "天。" + "\n"

        var currentDate = formatDateTime(myDate);
        var timeDiff = getDate(currentDate).getTime() - getDate(loginDate).getTime();
        // 20天 × 24小时 × 60分钟 × 60秒 × 1000毫秒 = 20天换算成毫秒
        if (20 * 24 * 60 * 60 * 1000 < timeDiff) {
          // 每隔20天更新refresh_token
          console.log("每隔20天更新refresh_token！");
          Application.Range(tokenColumn + row).Value = r_token;
          Application.Range(loginDateColumn + row).Value = currentDate;
          Application.ActiveWorkbook.Save();
        }
        else {
          console.log("refresh_token依旧坚挺！");
        }


      } catch {
        var value = "【" + userEmail + "】内的token签到失败" + "\n";
        sendEmail(isNotify, userEmail, value);
        return
      }
      sleep(1000)
      if (isSign == "是") {
        try {
          // 领取奖励
          let data3 = HTTP.post(
            "https://member.aliyundrive.com/v1/activity/sign_in_reward?_rx-s=mobile",
            JSON.stringify({ "signInDay": signin_count }),
            { headers: { "Authorization": access_token2 } }
          )
          data3 = data3.json()
          var value = value + "本次签到获得" + data3["result"]["name"] + "，" + data3["result"]["description"] + "\n"
        } catch {
          var value = value + "用户：" + userEmail + "-领取奖励失败" + "\n";
          sendEmail(isNotify, userEmail, value);
        }
      } else {
        value = value + "   奖励待领取" + "\n"
      }
    }
  }
  console.log(value);
}

function sendEmail(isNotify,userEmail,value) {
  if (isNotify == "是") {
    console.log("向" + userEmail + "发送通知邮件!");

    // 配置发送邮箱
    var zdy_host = "smtp.qq.com"
    var zdy_post = 465
    var zdy_username = "xxxxxxxxxxxxxxxxx@qq.com"
    var zdy_pasd = "11111111111111111"

    let mailer = SMTP.login({
      host: zdy_host, // 邮箱 的SMTP服务器的域名
      port: zdy_post,
      username: zdy_username, // 邮箱地址
      password: zdy_pasd, // 邮箱的SMTP密码，非密码
      secure: true
    });


    if (userEmail != zdy_username) {
      try {
        mailer.send({
          from: "阿里云盘签到<" + zdy_username + ">", // 发件人
          to: userEmail, // 收件人
          subject: data_time + "-阿里云盘签到通知", // 主题
          text: value, // 文本
        })
      } catch (error) {
        console.log("发送邮件失败" + error)
      }
    } else {
      console.log("不可发送至该邮箱")
    }
  }
}

function getDate(strDate) {
  if (strDate == null || strDate === undefined) return null;
  var date = new Date();
  try {
    if (strDate == undefined) {
      date = null;
    } else if (typeof strDate == 'string') {
      strDate = strDate.replace(/:/g, '-');
      strDate = strDate.replace(/ /g, '-');
      var dtArr = strDate.split("-");
      if (dtArr.length >= 3 && dtArr.length < 6) {
        date = new Date(dtArr[0], dtArr[1], dtArr[2]);
      } else if (date.length > 8) {
        date = new Date(Date.UTC(dtArr[0], dtArr[1] - 1, dtArr[2], dtArr[3] - 8, dtArr[4], dtArr[5]));
      }
    } else {
      date = null;
    }
    return date;
  } catch (e) {
    console.log('格式化日期出现异常：' + e.message);
  }
}
function formatDateTime(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${pad(month)}-${pad(day)} `;
}
function pad(num) {
  return num.toString().padStart(2, '0');
}
