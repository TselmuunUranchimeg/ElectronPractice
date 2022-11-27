export type VideoInfoType = {
    img: string,
    artist: string,
    title: string,
    videoId: string
};

export type ConvertType = {
    out: string,
    data: VideoInfoType[]
};