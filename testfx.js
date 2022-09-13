const fetch  = require("node-fetch");
fetch("https://dhjifbkdiccu3idea5no3cczsq0swjky.lambda-url.us-east-1.on.aws/a",
{ method: "POST", body: "{}", headers: { "content-type": "application/json" }  }).then((r) => r.text().then(console.log));