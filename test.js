const index = require("./index");
index.handler({
    rawPath: "/probe",
    queryStringParameters: {
        url: "https://test-gush.azureedge.net/videos/ios720p/files/was/13496/144cc889b73f4015b2d6ff1b7804b902/All-The-Ways-To-Work-As-An-Actor.mp4/All-The-Ways-To-Work-As-An-Actor.720.mp4"
    }
}).then((c) => console.log(c));