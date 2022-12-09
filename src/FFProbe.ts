import { writeFileSync } from "fs";
import FFConfig from "./FFConfig";
import TempFileService from "./TempFileService";

export default class FFProbe {

    public static async probe(url: string, file?: string) {
        try {

            file ??= await TempFileService.downloadTo(url);

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

            const hasAudio = metadata.streams.some((x) => x.codec_type === "audio");
            const hasVideo = metadata.streams.some((x) => x.codec_type === "video");

            const isAAC = hasAudio 
                ? metadata.streams.some((x) => x.codec_name === "aac" )
                : true;

            const videoStream = metadata.streams.find((x) => x.codec_type === "video");
            const isH264 = !videoStream  || (videoStream.codec_name === "h264" );

            let isBelow30FPS = false;
            const avgFrameRate = videoStream?.avg_frame_rate;
            if (avgFrameRate) {
                try {
                isBelow30FPS = eval(avgFrameRate) < 31;
                } catch (e) {

                }
            }

            const isMobileReady = isAAC && isH264 && fastStart && isBelow30FPS;

            const needsFastStart = isAAC && isH264 && isBelow30FPS && !fastStart;

            return {
                ... metadata,
                hasAudio,
                hasVideo,
                isAAC,
                isH264,
                fastStart,
                isBelow30FPS,
                isMobileReady,
                indexOfMoov,
                indexOfMDat,
                needsFastStart
            };
        } catch (e) {
            console.error(e);
            return {
                isAAC: false,
                isH264: false,
                hasAudio: false,
                hasVideo: false,
                fastStart: false,
                isBelow30FPS: false,
                isMobileReady: false,
                indexOfMoov: 0,
                indexOfMDat: 0,
                needsFastStart: false,
                error: e
            };
        }
    }

}
