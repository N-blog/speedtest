const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const fs = require("fs");
const crypto = require("crypto");
const SpeedTest = require("fast-speedtest-api");
const api_data={
    ejs_tp:{
        author:"nanashinon",name:"スピードテストくん"
    }
}
const app = express();
const PORT = 4400;
const TOKEN_FILE = "./token.json";

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.use(expressLayouts);
app.set("layout", "layout");
app.use(express.static("public"));
app.use(express.json());

// トークン管理
function loadTokens() {
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE));
  } catch {
    return {};
  }
}
function saveToken(token, data) {
  const tokens = loadTokens();
  tokens[token] = data;
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}
function getToken(token) {
  const tokens = loadTokens();
  return tokens[token] || null;
}

// 測定関数
async function runSpeedtest() {
  const speedTest = new SpeedTest({
    token: "YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm",
    verbose: false,
    timeout: 10000
  });
  return await speedTest.getSpeed(); // Mbps
}

// 測定ループ（回数指定）
async function multiSpeedtest(count, token) {
  let total = 0;
  for (let i = 0; i < count; i++) {
    try {
      const dl = await runSpeedtest();
      total += dl;
      const progress = (i + 1) / count;
      saveToken(token, {
        text: `測定中 ${i + 1}/${count}回目 DL ${dl.toFixed(2)} Mbps`,
        end: progress,
        download: dl
      });
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`測定失敗 (${i + 1}回目):`, err);
    }
  }
  const avg = total / count;
  saveToken(token, {
    text: `完了: 平均DL ${avg.toFixed(2)} Mbps`,
    end: 1,
    download: avg
  });
}

// UIルート
app.get("/", (req, res) => {
  res.render("index-2", {
    title: "トップページ",
    service: "スピードテスト",
    author: api_data.ejs_tp.author
  });
});

app.get("/test", (req, res) => {
  res.render("index", {
    title: "トップページ",
    service: "スピードテスト",
    author: api_data.ejs_tp.author
  });
});

// 自動測定（50回）
app.get("/adm/autotest", async (req, res) => {
  const token = crypto.randomUUID();
  saveToken(token, { text: "測定準備中...", end: 0, download: 0 });
  await multiSpeedtest(50, token);
  res.redirect(`/result/${token}`);
});

// API: 新規トークン生成（5回）
app.post("/api/new-token-prg", async (req, res) => {
  const token = crypto.randomUUID();
  saveToken(token, { text: "測定準備中...", end: 0, download: 0 });
   multiSpeedtest(5, token);
  res.json({ token });
});

// API: 進捗取得
app.get("/api/prg/:token", (req, res) => {
  const data = getToken(req.params.token);
  if (!data) return res.status(404).json({ error: "Token not found" });
  res.json(data);
});

// 結果表示（旧）
app.get("/test/:token", (req, res) => {
  const data = getToken(req.params.token);
  if (!data) return res.status(404).send("Token not found");
  res.render("result", { token: req.params.token, data });
});

// 結果表示（新）
app.get("/result/:token", (req, res) => {
  const data = getToken(req.params.token);
  if (!data) return res.status(404).send("結果が見つかりません");
  res.render("result", {
    title: "測定結果",
    token: req.params.token,
    data,service:"スピードテスト",author:api_data.ejs_tp.author
  });
});

app.listen(PORT, () => console.log(`✅ http://localhost:${PORT} 起動中`));
