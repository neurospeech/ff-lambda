import * as ffmpeg from "fluent-ffmpeg";
import * as path from "path";
import { BlockBlobClient } from "@azure/storage-blob";
import { copyFileSync, existsSync, promises } from "fs";
import TempFileService from "./TempFileService";
export { default as A1}  from "./FFConfig";
import * as mime from "mime-types";
import fetch from "node-fetch";
import FFConfig from "./FFConfig";
import FFProbe from "./FFProbe";

declare var __dirname;
let img = path.join(__dirname, "..", "images", "logo.png");

export interface IFFMpegThumbnail {
    time: number;
    url: string;
}

export interface IFFMpegOutput {
    notify: string;
    ignoreMobileReady?: boolean;
    url: string;
    thumbnails?: IFFMpegThumbnail[];
    parameters?: string;
}

export interface IFFMpegParams {
    input: string;
    output: IFFMpegOutput;
}

export default class FFMpeg {

    public static async convert(
        input: string,
        {
            url,
            ignoreMobileReady,
            thumbnails,
            notify,
            parameters
        }: IFFMpegOutput) {

        const file = await TempFileService.downloadTo(input);

        const fileInfo = path.parse(url.split("?")[0]);
        const outputFile = await TempFileService.getTempFile(fileInfo.ext);

        const convert = async () => {

            const { isMobileReady } = await FFProbe.probe(input, file);
            if (isMobileReady) {
                copyFileSync(file, outputFile.path);
            } else {

                console.log("Starting File Conversion");

                const output = await FFConfig.run(`-i ${file} ${parameters} -y ${outputFile.path}`.split(" "));

                console.log(output);
            }

            await FFMpeg.uploadFile(url, outputFile.path);
        }

        await Promise.all([this.thumbnails(input, thumbnails, file), convert()]);

        const result = {
            url,
            thumbnails
        };

        if(notify) {
            console.log(`Notifying ${notify}`);
            await fetch(notify, {
                method: "POST",
                headers: {
                    "content-type": "application/json"
                },
                body: "{}"
            });
        }

        return result;
    }

    public static async fastConvert(
        input: string,
        {
            url,
            thumbnails,
        }: IFFMpegOutput) {

        console.log(`Running fast convert for ${input}`);

        var file = await TempFileService.downloadTo(input);

        const fileInfo = path.parse(url.split("?")[0]);
        const outputFile = await TempFileService.getTempFile(fileInfo.ext);


        const { isMobileReady, needsFastStart, hasAudio, hasVideo } = await FFProbe.probe(input, file);
        if (isMobileReady) {
            console.log("Copying file to output");
            copyFileSync(file, outputFile.path);
        } else if (needsFastStart) {
            console.log("Improving FastStart");
            const output = await FFConfig.run(`-i ${file} -c copy -movflags +faststart -y ${outputFile.path}`.split(" "));
            console.log(output);
        } else {

            if (hasVideo) {
                console.log("Video is not mobile ready...");
                return { isMobileReady: false, hasAudio, hasVideo };
            }

            console.log("Converting to mp4 audio only....");
            console.log(`dir: ${__dirname}, img: ${img}`);
            const output = await FFConfig.run(`-loop 1 -i ${img} -i ${file} -c:a aac -ab 112k -c:v libx264 -shortest -strict -2 ${outputFile.path}`.split(" "));
            console.log(output);
        }

        const convert = FFMpeg.uploadFile(url, outputFile.path, true);

        await Promise.all([this.thumbnails(input, thumbnails, file), convert]);

        const result = {
            isMobileReady: true,
            url,
            thumbnails
        };

        // if(notify) {
        //     console.log(`Notifying ${notify}`);
        //     await fetch(notify, {
        //         method: "POST",
        //         headers: {
        //             "content-type": "application/json"
        //         },
        //         body: "{}"
        //     });
        // }

        return result;
    }

    public static async thumbnails(input: string, times: IFFMpegThumbnail[], file: string = void 0) {

        const start = Date.now();

        console.log("Starting thumbnails");

        file ??= await TempFileService.downloadTo(input);
        const folder = path.dirname(file);
        const fileNames = await new Promise<string[]>((resolve, reject) => {
            let files;
            ffmpeg(file, { timeout: 60 })
                .on("filenames", (names: string[]) => {
                    files = names;
                })
                .on("end", () => {
                    resolve(files);
                })
                .on("error", (error) => {
                    console.error(error);
                    reject(error);
                })
                .screenshots({
                    folder,
                    timestamps: times.map((x) => {
                        if (!x.url) {
                            throw new Error("Url must be specified for timed thumbnail")
                        }
                        return x.time;
                    }),
                    filename: start + "%000i.jpg"
                });
        });


        let lastFile: string;

        await Promise.all(fileNames.map(async (x, i) => {
            const t = times[i];
            if (!t) {
                return;
            }
            let filePath = folder + "/" + x;

            // this will ensure that 1.jpg will exist if 0.jpg exists...
            if(!existsSync(filePath) && i === 1) {
                filePath = lastFile;
            }

            lastFile = filePath;

            await FFMpeg.uploadFile(t.url, filePath);

            return [t, filePath];
        }));



        return times;

    }


    private static async uploadFile(url: string, filePath: string, throwIfNotFound = false) {

        if (!existsSync(filePath)) {
            if (throwIfNotFound) {
                throw new Error(`Failed to upload ${url}, file not found at ${filePath}`)
            }
            console.error(`File does not exist at ${filePath} for ${url}`);
            return;
        }
    
        console.log(`Uploading ${url}`);

        const blobContentType = mime.lookup(filePath);

        var b = new BlockBlobClient(url);
        await b.uploadFile(filePath, {
            blobHTTPHeaders: {
                blobContentType,
                blobCacheControl: "public, max-age=3240000"
            }
        });
        try {
            await promises.unlink(filePath);
        } catch {
            // do nothing...
        }
    }
}
