const FFProbe = require("./dist/FFProbe").default;
exports.handler = async (event) => {

    const {
        rawPath,
        queryStringParameters: {
            url,
            probe,
            thumbnails,
        }
    } = event;

    if (rawPath.startsWith("/probe")) {
        return {
            status: 200,
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify(await FFProbe.probe(url)),
        }
    }

    const response = {

    };
    return response;
};