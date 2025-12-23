// 关联KV命名空间OUTLOOK_MAIL_KV

export default {
  
  async scheduled(event, env, ctx) {
    console.log(`[${event.scheduledTime}] 刷新环境变量刷新令牌!`)
    await envRefreshToken(env);
  },

  async fetch(req, env) {

    const url = new URL(req.url);
    if (url.pathname === "/") {
      return new Response(renderIndexHtml(), {
        headers: { "Content-Type": "text/html; charset=UTF-8" }
      });
    }

    if (url.pathname === "/login") {
      return handleLogin(env);
    }

    if (url.pathname === "/authcb") {
      return handleCallback(url, env);
    }

    const authorized = await checkAuth(req, env);
    if (!authorized) return new Response("Unauthorized", { status: 401 });

    if (url.pathname === "/send") return handleSend(req, env);

    return Response.redirect("/", 302);
  }
};

async function checkAuth(request, env) {
  const auth = request.headers.get("Authorization") || "";

  if (!auth.startsWith("Bearer ")) return false;

  const token = auth.slice(7).trim();
  const validKeys = env.API_KEYS.split(",").map(k => k.trim());

  return validKeys.includes(token);
}

function validUA(request) {
  const ua = request.headers.get("User-Agent") || "ynnub404-mailer/1.0 (enc:gCyVGbpFWbtQDM0IWdu5We)";
  console.log(ua)
  return ua.includes("ynnub404") && ua.includes("gCyVGbpFWbt") && ua.includes("1.0");
}


/* ================= 登录 ================= */

function handleLogin(env) {
  const authUrl =
    "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize" +
    "?client_id=" + env.MS_CLIENT_ID +
    "&response_type=code" +
    "&redirect_uri=" + encodeURIComponent(env.REDIRECT_URI) +
    "&scope=offline_access%20mail.send%20user.read";

  return Response.redirect(authUrl, 302);
}

/* ================= 回调 & 换 token ================= */

async function handleCallback(url, env) {
  const code = url.searchParams.get("code");
  if (!code) return new Response("No code", { status: 400 });

  const token = await fetchToken(
    "authorization_code",
    { code },
    env
  );

  await saveToken(token, env);

  return new Response("授权成功，可以发邮件了");
}

/* ================= 发邮件 ================= */

async function handleSend(request, env) {
  
  if(!validUA(request)) return new Response("Invalid UA", { status: 400 });

  const contentType = (request.headers.get('content-type') || '').toLowerCase();
  let data = {};
  if (request.method === "GET") {
    const url = new URL(request.url);
    const params = url.searchParams;
    params.forEach((v, k) => {data[k] = v;});
  }
  else if (request.method === "POST" && contentType.includes('application/json')) {
    try {
      data = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }
  }

  const requiredFields = ["to", "subject", "content"];
  const missingFields = requiredFields.filter(f => !data[f] || data[f].trim() === "");

  if (missingFields.length > 0) {
    return new Response(
      `Missing required fields: ${missingFields.join(", ")}`,
      { status: 400 }
    );
  }

  const to = data.to || "bunny@email.cloudns.ch";
  const subject = data.subject || "Hello from Worker";
  const content = data.content || "This is a test email.";

  let token = await loadToken(env);

  if (isExpired(token)) {
    token = await refreshToken(env);
    await saveToken(token, env);
  }

  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/sendMail",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        message: {
          subject,
          body: {
            contentType: "Text",
            content
          },
          toRecipients: [
            { emailAddress: { address: to } }
          ]
        }
      })
    }
  );
  if (res.status === 202) return new Response("ok", {status: 200});
  return new Response("sendMail status: " + res.status, {status: res.status});
}

/* ================= Token 工具函数 ================= */

async function fetchToken(grantType, extra, env) {
  const body = new URLSearchParams({
    client_id: env.MS_CLIENT_ID,
    client_secret: env.MS_CLIENT_SECRET,
    grant_type: grantType,
    redirect_uri: env.REDIRECT_URI,
    //scope: "offline_access%20Mail.Send",
    scope: "Mail.Send",
    ...extra
  });

  const res = await fetch(
    "https://login.microsoftonline.com/consumers/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body
    }
  );

  return await res.json();
}

async function refreshToken(env) {
  let refreshToken = await loadRefreshToken(env);
  return fetchToken(
    "refresh_token",
    { refresh_token: refreshToken },
    env
  );
}

async function envRefreshToken(env) {
  const refreshToken = await loadRefreshToken(env);
  const json = await fetchToken(
    "refresh_token",
    {
      refresh_token: refreshToken,
      scope: "offline_access%20Mail.Send"
    },
    env
  );
  await saveRefreshToken(json.refresh_token, env)
}

async function saveToken(token, env) {
  token.expires_at = Date.now() + token.expires_in * 1000;
  await env.OUTLOOK_MAIL_KV.put("OUTLOOK_MAIL_TOKEN", JSON.stringify(token));
}

async function loadToken(env) {
  const raw = await env.OUTLOOK_MAIL_KV.get("OUTLOOK_MAIL_TOKEN");
  if (!raw) throw new Error("No token saved");
  return JSON.parse(raw);
}

async function saveRefreshToken(refreshToken, env) {
  await env.OUTLOOK_MAIL_KV.put("OUTLOOK_MAIL_REFRESH_TOKEN", refreshToken);
}

async function loadRefreshToken(env) {
  const raw = await env.OUTLOOK_MAIL_KV.get("OUTLOOK_MAIL_REFRESH_TOKEN");
  if (!raw) throw new Error("No token saved");
  return raw;
}

function isExpired(token) {
  return !token || Date.now() > token.expires_at - 60_000;
}











function renderIndexHtml() {
  return `
  <!DOCTYPE html>
  <html>
  <head>
  <title>Welcome to nginx!</title>
  <style>
      body {
          width: 35em;
          margin: 0 auto;
          font-family: Tahoma, Verdana, Arial, sans-serif;
      }
  </style>
  </head>
  <body>
  <h1>Welcome to nginx!</h1>
  <p>If you see this page, the nginx web server is successfully installed and
  working. Further configuration is required.</p>
  
  <p>For online documentation and support please refer to
  <a href="http://nginx.org/">nginx.org</a>.<br/>
  Commercial support is available at
  <a href="http://nginx.com/">nginx.com</a>.</p>
  
  <p><em>Thank you for using nginx.</em></p>
  </body>
  </html>
  `
  }
