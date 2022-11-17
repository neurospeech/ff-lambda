import * as ffmpeg from "fluent-ffmpeg";
import * as path from "path";
import { BlockBlobClient } from "@azure/storage-blob";
import { existsSync, promises } from "fs";
import TempFileService from "./TempFileService";
export { default as A1}  from "./FFConfig";
import * as mime from "mime-types";
import fetch from "node-fetch";
import FFConfig from "./FFConfig";

export interface IFFMpegThumbnail {
    time: number;
    url: string;
}

export interface IFFMpegOutput {
    notify: string;
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
            thumbnails,
            notify,
            parameters
        }: IFFMpegOutput) {

        const file = await TempFileService.downloadTo(input);

        const fileInfo = path.parse(url.split("?")[0]);
        const outputFile = await TempFileService.getTempFile(fileInfo.ext);

        const convert = async () => {

            console.log("Starting File Conversion");

            const output = await FFConfig.run(`-i ${file} ${parameters} -y ${outputFile.path}`.split(" "));

            console.log(output);

            await FFMpeg.uploadFile(url, outputFile.path);
        }

        await Promise.all([this.thumbnails(input, thumbnails, file), convert()]);

        const result = {
            url,
            thumbnails
        };

        if(notify) {
            await fetch(notify);
        }

        return result;
    }

    public static async thumbnails(input: string, times: IFFMpegThumbnail[], file: string = void 0) {

        const start = Date.now();

        console.log("Starting thumbnails");

        file ??= await TempFileService.downloadTo(input);
        const folder = path.dirname(file);
        const fileNames = await new Promise<string[]>((resolve, reject) => {
            let files;
            ffmpeg(file, { timeout: 30 })
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

        await Promise.all(fileNames.map(async (x, i) => {
            var t = times[i];
            if (!t) {
                return;
            }
            const filePath = folder + "/" + x;

            await FFMpeg.uploadFile(t.url, filePath);
        }));

        return times;

    }


    private static async uploadFile(url: string, filePath: string) {

        if (!existsSync(filePath)) {
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
