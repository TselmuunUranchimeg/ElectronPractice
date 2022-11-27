import { join } from "path";
import { platform } from "os";
import { existsSync, mkdirSync } from "fs";
import { app, BrowserWindow, ipcMain } from "electron";
import { getFilePath, getInfo, getAudio } from "./lib/core";
import { ConvertType, VideoInfoType } from "./lib/types";

const createWindow = async () => {
    const win = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        show: false,
        autoHideMenuBar: true,
        icon: join(
            app.getAppPath(),
            platform() === "win32" ? "assets/icon.ico" : "assets/icon.png"
        ),
    });
    win.maximize();
    win.show();

    ipcMain.handle("getVideoInfo", async (_, url: string[]) => {
        try {
            let promiseArr: Promise<VideoInfoType>[] = [];
            url.forEach((val, ind) => {
                promiseArr.push(getInfo(val, ind));
            });
            const data = await Promise.all(promiseArr);
            await win.webContents.loadFile(
                join(__dirname, "../public", "confirm.html")
            );
            win.webContents.send("videoInfo", data);
        } catch (e) {
            if (e instanceof Error) {
                win.webContents.send(
                    "indexError",
                    parseInt(e.message as string)
                );
            }
        }
    });
    ipcMain.handle("fileLocation", async () => {
        await getFilePath(win);
    });
    ipcMain.handle("goBack", async () => {
        await win.loadFile(join(__dirname, "../public", "index.html"));
    });
    ipcMain.handle("convert", async (_, body: ConvertType) => {
        try {
            if (!existsSync(body.out)) {
                mkdirSync(body.out);
            }
            let promiseArr: Promise<void>[] = [];
            body.data.forEach((val, ind) => {
                promiseArr.push(getAudio(val, body.out, ind, win));
            });
            await Promise.all(promiseArr);
        } catch (e) {
            if (e instanceof Error) {
                win.webContents.send("undiscoveredError", e.message);
            }
        }
    });

    await win.loadFile(join(__dirname, "../public", "index.html"));
    return win;
};

if (require("electron-squirrel-startup")) app.quit();

app.whenReady().then(async () => {
    await createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
