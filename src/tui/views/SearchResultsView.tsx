import ScrollableSelectInput from "@/tui/components/molecules/ScrollableSelectInput";
import { Manga } from "@/types";
import { Box, Text } from "ink";

interface SearchResultsViewProps {
    searchResults: Manga[];
    highlightedManga: Manga | null;
    setHighlightedManga: (m: Manga | null) => void;
    handleMangaSelect: (m: Manga) => void;
}

export const SearchResultsView = ({
    searchResults,
    highlightedManga,
    setHighlightedManga,
    handleMangaSelect,
}: SearchResultsViewProps) => {
    const mangaItems = searchResults.map((m) => ({
        label: `[${m.provider}] ${m.title}`,
        value: m,
    }));

    return (
        <Box flexDirection="row" height={12}>
            <Box flexDirection="column" width="55%" marginRight={2}>
                <Box marginBottom={1}>
                    <Text bold color="rgb(56,189,248)">
                        🔍 ARAMA SONUÇLARI:
                    </Text>
                </Box>
                <ScrollableSelectInput
                    items={mangaItems}
                    onHighlight={(m) => setHighlightedManga(m)}
                    onSelect={handleMangaSelect}
                />
            </Box>

            <Box
                flexDirection="column"
                width="45%"
                borderStyle="single"
                borderColor="rgb(167,139,250)"
                paddingX={1}
            >
                <Box marginBottom={1}>
                    <Text bold color="rgb(253,224,71)">
                        📖 MANGA BİLGİ KARTI
                    </Text>
                </Box>
                {highlightedManga ? (
                    <Box flexDirection="column">
                        <Text color="white" bold>
                            Başlık: <Text color="rgb(56,189,248)">{highlightedManga.title}</Text>
                        </Text>
                        <Text color="white">
                            Kaynak: <Text color="rgb(45,212,191)">{highlightedManga.provider}</Text>
                        </Text>
                        {highlightedManga.genres && (
                            <Text color="white" wrap="wrap">
                                Türler:{" "}
                                <Text color="rgb(167,139,250)">{highlightedManga.genres}</Text>
                            </Text>
                        )}
                        {highlightedManga.summary && (
                            <Box marginTop={1} flexDirection="column">
                                <Text color="gray" bold>
                                    Özet:
                                </Text>
                                <Text color="white" wrap="wrap" dimColor>
                                    {highlightedManga.summary.slice(0, 100)}...
                                </Text>
                            </Box>
                        )}
                    </Box>
                ) : (
                    <Text color="gray">Seçim bekleniyor...</Text>
                )}
            </Box>
        </Box>
    );
};

export default SearchResultsView;
