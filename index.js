const FFProbe = require("./dist/FFProbe").default;
const FFMpeg = require("./dist/FFMpeg").default;

function asJson(body, statusCode = 200) {
    return {
        statusCode,
        headers: {
            "content-type": "application/json"
        },
        body
    };
}

exports.handler = async (event) => {


    try {
        const {
            rawPath,
            queryStringParameters: {
                url,
            } = {},
            headers = {},
            body,
        } = event;

        if (rawPath.startsWith("/probe")) {
            return asJson(await FFProbe.probe(url));
        }
        if (rawPath.startsWith("/thumb")) {
            const { input, output } = JSON.parse(body);
            return asJson(await FFMpeg.thumbnails(input, output.thumbnails));
        }

        return asJson(event);
    } catch (error) {
        console.error(error);
        return asJson(error.stack ? error.stack : error.toString(), 500);
    }
};