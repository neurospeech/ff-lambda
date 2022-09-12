import * as ffmpeg from "fluent-ffmpeg";
import * as path from "path";
import { BlockBlobClient } from "@azure/storage-blob";
import { existsSync, promises } from "fs";
import TempFileService from "./TempFileService";

ffmpeg.setFfmpegPath(path.join(__dirname, "../../lib/ffmpeg.exe"));

export default class FFMpeg {

    public static async thumbnails(input: string, times: { time: number, url: string }[]) {

        const start = Date.now();

        const file = await TempFileService.downloadTo(input);
        const folder = path.dirname(file);
        const fileNames = await new Promise<string[]>((resolve, reject) => {
            let files;
            ffmpeg(file)
                .on("filenames", (names: string[]) => {
                    files = names;
                })
                .on("end", () => {
                    resolve(files);
                })
                .on("error", (error) => {
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
                })
        });

        await Promise.all(fileNames.map(async (x, i) => {
            var t = times[i];
            if (!t) {
                return;
            }
            const filePath = folder + "/" + x;
            var b = new BlockBlobClient(t.url);
            await b.uploadFile(filePath, {
                blobHTTPHeaders: {
                    blobContentType: "image/jpg",
                    blobCacheControl: "public, max-age=3240000"
                }
            });
            try {
                await promises.unlink(filePath);
            } catch {
                // do nothing...
            }
        }));

        return times;

    }

}
