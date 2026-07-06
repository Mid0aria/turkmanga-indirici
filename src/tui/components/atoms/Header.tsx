import { Box, Text } from "ink";

export const Header = ({ title }: { title: string }) => (
    <Box marginBottom={1} flexDirection="column" width="100%">
        <Box
            borderStyle="double"
            borderColor="rgb(167,139,250)"
            paddingX={2}
            justifyContent="center"
        >
            <Text color="rgb(56,189,248)" bold>
                ✨ {title.toUpperCase()} ✨
            </Text>
        </Box>
    </Box>
);

export default Header;
