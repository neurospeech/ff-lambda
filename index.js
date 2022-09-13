const FFProbe = require("./dist/FFProbe").default;
const FFMpeg = require("./dist/FFMpeg").default;
exports.handler = async (event) => {

    const {
        rawPath,
        queryStringParameters: {
            url,
        } = {}
    } = event;

    if (rawPath.startsWith("/probe")) {
        return await FFProbe.probe(url);
    }
    // if (rawPath.startsWith("/thumb")) {
    //     return await FFMpeg.thumbnails(url, thumbnails);
    // }

    return {
        event,
        error: "no action"
    };
};