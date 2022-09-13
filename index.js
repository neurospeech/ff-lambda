const FFProbe = require("./dist/FFProbe").default;
const FFMpeg = require("./dist/FFMpeg").default;
exports.handler = async (event) => {

    const {
        rawPath,
        queryStringParameters: {
            url,
        } = {},
        headers = {},
        body,
    } = event;

    if (rawPath.startsWith("/probe")) {
        return await FFProbe.probe(url);
    }
    if (rawPath.startsWith("/thumb")) {
        const { input, output } = JSON.parse(body);
        return await FFMpeg.thumbnails(input, output.thumbnails);
    }

    return {
        event,
        error: "no action"
    };
};