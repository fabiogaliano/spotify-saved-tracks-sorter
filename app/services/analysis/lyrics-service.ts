import wretch from 'wretch';
import * as cheerio from 'cheerio';

const CLIENT_ACCESS_TOKEN = process.env.GENIUS_CLIENT_TOKEN || "no token for genius"

export class LyricsService {
	private readonly CLIENT_ACCESS_TOKEN: string;
	private readonly searchApiGenius: string = "https://api.genius.com";

	constructor(clientAccessToken: string = CLIENT_ACCESS_TOKEN) {
		this.CLIENT_ACCESS_TOKEN = clientAccessToken;
	}

	async getLyrics(artist: string = "Clairo", song: string = "Juna"): Promise<LyricsResult[]> {
		try {
			const songUrl = await this.getSongUrl(artist, song);
			return await this.parseAndExtractLyrics(songUrl);
		} catch (error) {
			console.error("Error fetching lyrics:", error);
			throw new Error(`Failed to fetch lyrics for ${artist} - ${song}`);
		}
	}

	private async getSongUrl(artist: string, song: string): Promise<string> {
		const searchQuery = encodeURIComponent(artist + " " + song);
		try {
			const geniusApi = wretch(this.searchApiGenius).auth(`Bearer ${this.CLIENT_ACCESS_TOKEN}`);
			const songSearchResult: GeniusResponse = await geniusApi.get("/search?q=" + searchQuery).json();
			const songUrl = songSearchResult.response.hits?.[0]?.result?.url;
			if (!songUrl) {
				throw new Error('Song URL not found');
			}
			return songUrl;
		} catch (error) {
			console.error("Error fetching song URL:", error);
			throw new Error(`Failed to fetch song URL for ${artist} - ${song}`);
		}
	}

	private async parseAndExtractLyrics(url: string): Promise<LyricsResult[]> {
		const lyricsContainer = '[data-lyrics-container="true"]';
		const lyrics: LyricsResult[] = [];
		const html = await wretch(url).get().text();
		const $ = cheerio.load(html);
		const $lyricsContainer = $(lyricsContainer);

		const extractText = async (node: any) => {
			let currentText = '';
			const children = node.contents();
			for (const child of children) {
				if (child.type === 'text') {
					currentText += child.data;
				} else if (child.tagName === 'br') {
					currentText += '\n';
				} else if (child.tagName === 'a') {
					if (currentText) {
						lyrics.push({ type: 'text', content: currentText });
						currentText = '';
					}
					const href = $(child).attr('href');
					const fullHref = new URL(href!, url).href;
					const annotation = await this.fetchAnnotation(fullHref);
					lyrics.push({
						type: 'link',
						content: $(child).text(),
						annotation
					});
				} else if (child.type === 'tag') {
					await extractText($(child));
				}
			}
			if (currentText) {
				lyrics.push({ type: 'text', content: currentText });
			}
		};

		await extractText($lyricsContainer);
		return lyrics;
	}

	private async fetchAnnotation(href: string): Promise<string> {
		const html = await wretch(href).get().text();
		const $ = cheerio.load(html);
		let annotation = '';
		$('meta').each((_, element) => {
			const property = $(element).attr('property');
			const content = $(element).attr('content');
			if (property === 'og:description') {
				annotation = content || '';
				return false;
			}
		});
		return annotation.trim();
	}
}

interface LyricsResult {
	type: "text" | "link";
	content: string;
	annotation?: string;
}

interface GeniusResponse {
	response: {
		hits: Array<{
			result: {
				url: string;
			};
		}>;
	};
}
