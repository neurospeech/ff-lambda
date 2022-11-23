const FFProbe = require("./dist/FFProbe").default;
const FFMpeg = require("./dist/FFMpeg").default;

const { GetObjectCommand, S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

function asJson(body, statusCode = 200) {
    return {
        statusCode,
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify(body)
    };
}

exports.handler = async (event) => {


    try {
        const {
            Records,
            rawPath,
            queryStringParameters: {
                url,
            } = {},
            headers = {},
            body,
        } = event;

        if (rawPath) {
            if(rawPath.startsWith("/fast-convert")) {
                const { input, output } = JSON.parse(body);
                return asJson(await FFMpeg.fastConvert(input, output));
            }
            if (rawPath.startsWith("/probe")) {
                return asJson(await FFProbe.probe(url));
            }
            if (rawPath.startsWith("/thumb")) {
                const { input, output } = JSON.parse(body);
                return asJson(await FFMpeg.thumbnails(input, output.thumbnails));
            }
            if(rawPath.startsWith("/convert")) {
                const { input, output } = JSON.parse(body);
                return asJson(await FFMpeg.convert(input, output));
            }
        }

        if(Records) {
            const Bucket = Records[0].s3.bucket.name;
            const Key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

            const client = new S3Client();

            const cmd = new GetObjectCommand({ Bucket, Key });
            const res = await client.send(cmd);
            const { input, output } = JSON.parse(await res.Body.text());

            const r = await FFMpeg.convert(input, output);

            await client.send(new DeleteObjectCommand({ Bucket, Key }));

            return asJson(r);
        }

        return asJson(event);
    } catch (error) {
        console.log(error);
        return asJson(error.stack ? error.stack : error.toString(), 500);
    }
};