import { writeFileSync } from "fs";
import FFConfig from "./FFConfig";
import TempFileService from "./TempFileService";

export default class FFProbe {

    public static async probe(url: string) {

        const file = await TempFileService.downloadTo(url);

        const metadata = await new Promise<any>((resolve, reject) => {
            FFConfig.ffmpeg.ffprobe(file, (error, metadata) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(metadata);
            });
        });

        // probe can stream ...
        // probe is iOS and Android ready ...
        // check for MP4 and AAC
        // check for fast start

        let indexOfMoov = -1;
        let indexOfMDat = -1;

        const checkPosition = (data, length) => {
            let i = data.indexOf("type:'moov'");
            if (i !== -1) {
                indexOfMoov = length + i;
            }
            i = data.indexOf("type:'mdat'");
            if (i !== -1) {
                indexOfMDat = length + i;
            }
            return indexOfMoov === -1 || indexOfMDat === -1;
        };

        const text = await FFConfig.run(
            ["-v", "trace",
            "-i",  file,
            "-f",  "null", "-"], null, checkPosition);

        const fastStart = indexOfMoov < indexOfMDat;

        const isAAC = metadata.streams.some((x) => x.codec_type === "audio") 
            ? metadata.streams.some((x) => x.codec_name === "aac" )
            : true;
        const isH264 = metadata.streams.some((x) => x.codec_type === "video")
            ? metadata.streams.some((x) => x.codec_name === "h264")
            : true;

        const isMobileReady = isAAC && isH264 && fastStart;

        return {
            ... metadata,
            isAAC,
            isH264,
            fastStart,
            isMobileReady,
            indexOfMoov,
            indexOfMDat
        };
    }

}
