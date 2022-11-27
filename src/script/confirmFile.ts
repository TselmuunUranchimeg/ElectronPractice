const { ipcRenderer } = require("electron");

type VideoInfoType = {
    img: string,
    artist: string,
    title: string,
    videoId: string
};
type MessageType = {
    ind: number,
    message: string
};

let data: VideoInfoType[] = [];
let out: string = "";
let map: Map<number, number> = new Map<number, number>();

let p = document.querySelector("#location") as HTMLParagraphElement;
if (localStorage.getItem("out")) {
    out = localStorage.getItem("out") as string;
    p.innerText = out;
} else {
    p.innerText = "Location...";
}

let locationButton = document.querySelector("#locationButton") as HTMLButtonElement;
locationButton.addEventListener("click", async () => {
    await ipcRenderer.invoke("fileLocation");
});

let goBackButton = document.querySelector("#goBack") as HTMLButtonElement;
goBackButton.addEventListener("click", async () => {
    await ipcRenderer.invoke("goBack");
});

let confirmButton = document.querySelector("#confirm") as HTMLButtonElement;
confirmButton.addEventListener("click", async () => {
    await ipcRenderer.invoke("convert", { data, out });
});

ipcRenderer.on("videoInfo", async (_, body: VideoInfoType[]) => {
    let loader = document.querySelector("#loader") as HTMLDivElement;
    loader.classList.add("invisible");
    data = body;;
    data.forEach((val, ind) => {
        let infoContainer = document.querySelector(".info-container") as HTMLDivElement;

        let info = document.createElement("div");
        info.classList.add("info");
        info.id = `info-${ind}`;

        let img = document.createElement("img") as HTMLImageElement;
        img.alt = "";
        img.src = val.img;

        let infoDetails = document.createElement("div");
        infoDetails.classList.add("info-details");

        let h = document.createElement("h1");
        h.innerText = val.title.length > 25 ? val.title.slice(0, 25) + "..." : val.title;

        let p = document.createElement("p");
        p.innerText = val.artist;

        let progress = document.createElement("div");
        progress.classList.add("progress", "invisible");
        progress.id = `progress-${ind}`;

        let done = document.createElement("div");
        done.classList.add("done");

        let message = document.createElement("h1");
        message.id = `message-${ind}`;
        message.innerText = "";

        let progressBar = document.createElement("div");
        progressBar.classList.add("progress-bar");
        progressBar.id = `progressBar-${ind}`;

        let svgContainer = document.createElement("div") as HTMLDivElement;
        svgContainer.classList.add("svg-container");
        svgContainer.addEventListener("click", async () => {
            let item = document.querySelector(`#info-${ind}`) as HTMLDivElement;
            if (infoContainer.childNodes.length === 1) {
                if (window.confirm("If you delete the last item here, you will be redirected back to the home page. Do you wish to proceed?")) {
                    data = [];
                    await ipcRenderer.invoke("goBack");
                }
                return;
            }
            data = data.filter((_, i) => i !== ind);
            infoContainer.removeChild(item);
        });
        let svg = document.createElement("img") as HTMLImageElement;
        svg.alt = "Delete icon"
        svg.src = "../public/trash-347.svg";
        svg.classList.add("svg-filter");

        done.append(message);
        progress.append(done, progressBar);
        svgContainer.append(svg);
        infoDetails.append(h, p);
        info.append(img, svgContainer, infoDetails, progress);
        infoContainer.append(info);
        map.set(ind, 0);
    });
});

ipcRenderer.on("location", (_, location: string) => {
    p.innerText = location;
    out = location;
    localStorage.setItem("out", out);
});

ipcRenderer.on("message", (_, data: MessageType) => {
    let progressDiv = document.querySelector(`#progress-${data.ind}`);
    progressDiv?.classList.remove("invisible");
    let messageHeading = document.querySelector(`#message-${data.ind}`) as HTMLHeadingElement;
    messageHeading.innerText = data.message;
    let progressBarDiv = document.querySelector(`#progressBar-${data.ind}`) as HTMLDivElement;
    let percentage = map.get(data.ind) as number;
    map.set(data.ind, percentage + 20);
    progressBarDiv.style.width = `${percentage + 20}%`;
});

ipcRenderer.on("undiscoveredError", (_, e: string) => {
    console.log(e);
});