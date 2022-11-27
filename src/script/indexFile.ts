const { ipcRenderer: ipc } = require("electron");

let form = document.querySelector("form")! as HTMLFormElement;

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let urls: string[] = [];
    let errors = document.getElementsByClassName("error");
    for (let i = 0; i < errors.length; i++) {
        let item = errors.item(i);
        item?.classList.remove("error");
    }
    let loader = document.querySelector("#loader");
    loader?.classList.remove("invisible");
    for (let i = 0; i < form.elements.length; i++) {
        if (form.elements.item(i)!.tagName === "INPUT") {
            let input = form.elements.item(i) as HTMLInputElement;
            urls.push(input.value);
        }
    }
    await ipc.invoke("getVideoInfo", urls);
});

let addButton = document.querySelector(".add-button") as HTMLButtonElement;
let ol = document.querySelector("ol")!;
let removeButtons = document.getElementsByClassName("remove-button");

function removeList(this: HTMLButtonElement) {
    let l = document.getElementById(`list-${this.id}`)!;
    if (ol.childNodes.length > 3) {
        ol.removeChild(l);
    }
}

for (let i = 0; i < removeButtons.length; i++) {
    let b = removeButtons.item(i) as HTMLButtonElement;
    b.addEventListener("click", removeList);
}

let inputCount = 1;
addButton.addEventListener("click", () => {
    let li = document.createElement("li");
    li.id = `list-${inputCount}`;

    let input = document.createElement("input") as HTMLInputElement;
    input.type = "text";
    input.placeholder = "YouTube video URL...";
    input.required = true;

    let newButton = document.createElement("button");
    newButton.innerText = "Remove";
    newButton.classList.add("remove-button");
    newButton.type = "button";
    newButton.addEventListener("click", removeList);
    newButton.id = `${inputCount}`;

    let errorMessage = document.createElement("p") as HTMLParagraphElement;
    errorMessage.id = `error-${inputCount}`;
    errorMessage.innerText = "Invalid link";

    li.append(input, newButton, errorMessage);
    ol.append(li);
    inputCount+= 1;
});

ipc.on("indexError", (_, ind: number) => {
    let p = document.querySelector(`#error-${ind}`);
    p?.classList.add("error");
    let loader = document.querySelector("#loader");
    loader?.classList.add("invisible");
});