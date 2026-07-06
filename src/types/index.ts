export interface Manga {
    title: string;
    url: string;
    provider: string;
    latestChapter?: string;
    coverImageUrl?: string;
    summary?: string;
    genres?: string;
    demographic?: string;
    releaseDate?: string;
    status?: string;
    titleTr?: string;
    titleEn?: string;
    titleJp?: string;
}

export interface Chapter {
    number: number;
    title: string;
    url: string;
}

export interface Settings {
    downloadDir: string;
}

export interface MangaProvider {
    name: string;
    baseUrl: string;
    getDownloadHeaders?(chapterUrl: string): Record<string, string>;
    scrambleResolver?(imagePath: string, index: number, chapterUrl: string): Promise<void>;
    search(title: string): Promise<Manga[]>;
    getChapters(mangaUrl: string): Promise<Chapter[] & { metadata?: Partial<Manga> }>;
    getChapterImages(chapterUrl: string): Promise<string[]>;
}
