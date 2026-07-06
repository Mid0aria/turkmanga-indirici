import TextInput from "@/tui/components/atoms/TextInput";
import { TuiStep } from "@/tui/hooks/useTUI";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";

interface SearchInputViewProps {
    step: TuiStep;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    handleSearchSubmit: () => void;
}

export const SearchInputView = ({
    step,
    searchTerm,
    setSearchTerm,
    handleSearchSubmit,
}: SearchInputViewProps) => {
    if (step === "SEARCHING") {
        return (
            <Box flexDirection="column" alignItems="center" justifyContent="center" height={8}>
                <Text color="yellow">
                    <Spinner type="dots" />
                </Text>
                <Box marginTop={1}>
                    <Text color="cyan" bold>
                        "{searchTerm}" aranıyor...
                    </Text>
                </Box>
                <Box marginTop={1}>
                    <Text color="gray" italic>
                        Manga sağlayıcıları taranıyor, lütfen bekleyin.
                    </Text>
                </Box>
            </Box>
        );
    }

    return (
        <Box flexDirection="column">
            <Box marginBottom={1}>
                <Text color="yellow">Aramak istediğiniz manga adını girin ve [Enter]'a basın:</Text>
            </Box>
            <TextInput
                value={searchTerm}
                onChange={setSearchTerm}
                onSubmit={handleSearchSubmit}
                placeholder="Manga adı yazın (çıkmak için 'exit')..."
            />
        </Box>
    );
};

export default SearchInputView;
