import { join } from "path";
import { Stream } from "stream";
import {
    readFileSync,
    writeFileSync
} from "fs";
import { parse } from "url";
import { unlink } from "fs/promises";
import ytdl from "ytdl-core";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import axios from "axios";
import sanitize from "sanitize-filename";
import sharp from "sharp";
import { BrowserWindow, dialog } from "electron";
const ID3Writer = require("browser-id3-writer");
import { VideoInfoType } from "./types";

const getInfo = async (url: string, ind: number): Promise<VideoInfoType> => {
    try {
        let { videoDetails } = await ytdl.getInfo(url);
        let v = parse(url, true).query?.v as string | null;
        if (!v) {
            throw new Error("Not a valid link");
        }
        return {
            videoId: v,
            title: videoDetails.title,
            img: videoDetails.thumbnails[0].url,
            artist: videoDetails.ownerChannelName
        };
    }
    catch (e) {
        throw new Error(`${ind}`);
    }
};

const getFilePath = async (win: BrowserWindow) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ["openDirectory"]
    });
    if (!canceled) {
        win.webContents.send("location", filePaths[0]);
    }
}

const getThumbnailLocation = (url: string, title: string, dlPath: string): Promise<string> => {
    return new Promise<string>(async (resolve, _) => {
        let res = await axios.request({
            url,
            method: "GET",
            responseType: "stream",
        });
        let bufferArr: Array<any> = [];
        const data = res.data as Stream;
        data.on("data", (d) => bufferArr.push(d));
        data.on("close", () => {
            const imageBuffer = Buffer.concat(bufferArr);
            const imageLocation = join(
                dlPath,
                `${sanitize(title)}.png`
            );
            sharp(imageBuffer).toFile(imageLocation);
            resolve(imageLocation);
        });
    });
};

const getAudio = async (body: VideoInfoType, out: string, ind: number, win: BrowserWindow) => {
    const { img, title, videoId, artist } = body;
    const getThumbnailLocationPromise = getThumbnailLocation(img, title, out);
    win.webContents.send("message", {
        ind, 
        message: "Downloading video..."
    });
    const audioStream = ytdl(videoId, {
        filter: "audioonly",
    });
    const temPath = join(out, `${sanitize(title)}.mp3`);
    const proc = ffmpeg({ source: audioStream });
    win.webContents.send("message", {
        ind, 
        message: "Converting to mp3..."
    });
    proc.setFfmpegPath(ffmpegPath!)
        .audioBitrate(320)
        .format("mp3")
        .saveToFile(temPath)
        .on("end", async () => {
            win.webContents.send("message", {
                ind, 
                message: "Filling in details..."
            });
            const imageLocation = await getThumbnailLocationPromise;
            const audioBuffer = readFileSync(temPath);
            const imageBuffer = readFileSync(imageLocation);
            const tagWriter = new ID3Writer(audioBuffer);
            tagWriter
                .setFrame("TIT2", title)
                .setFrame("TPE1", [artist])
                .setFrame("TCON", ["Unknown genre"])
                .setFrame("APIC", {
                    type: 3,
                    data: imageBuffer,
                    description: "Cover photo",
                    useUnicodeEncoding: false,
                });
            tagWriter.addTag();
            writeFileSync(temPath, Buffer.from(tagWriter.arrayBuffer));
            win.webContents.send("message", {
                ind,
                message: "Saving..."
            });
            await unlink(imageLocation);
            win.webContents.send("message", {
                ind, 
                message: `Finished! Saved at ${out}`
            });
        });
};

export { getAudio, getInfo, getFilePath };