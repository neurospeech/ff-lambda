import { spawn } from "child_process";
import * as ffmpeg from "fluent-ffmpeg";
import * as path from "path";
import * as ffmpegPath from "ffmpeg-static";
import * as ffprobePath from "ffprobe-static";

export default class FFConfig {

    public static ffMpegPath = ffmpegPath as any as string;
    public static ffProbePath = ffprobePath.path as string;

    public static ffmpeg = ffmpeg;

    public static run(
        inputArgs: string[],
        log?: (text, position) => boolean,
        error?: (text, position) => boolean) {
        const child = spawn(FFConfig.ffMpegPath, inputArgs);
        return new Promise<string>((resolve, reject) => {
            const errors = [];
            const lines = [];
            let logPosition = 0;
            let errorPosition = 0;
            let killed = false;
            child.stderr.on("data", (e) => {
                errors.push(e);
                const ep = errorPosition;
                errorPosition += e.length;
                if (!error) {
                    return;
                }
                if (error(e, ep)) {
                    return;
                }
                killed = true;
                child.kill();
            });
            child.stdout.on("data", (data) => {
                lines.push(data);
                const lp = logPosition;
                logPosition += data.length;
                if (!log) {
                    return;
                }
                if (log(data, lp)) {
                    return;
                }
                killed = true;
                child.kill();
            });
            child.on("error", (er) => {
                if (!killed) {
                    reject(er);
                }
            });
            child.on("close", () => {
                resolve(`${lines.join("\n")}\n${errors.join("\n")}`);
            });
        });
    }
}

ffmpeg.setFfmpegPath(FFConfig.ffMpegPath);
ffmpeg.setFfprobePath(FFConfig.ffProbePath);
