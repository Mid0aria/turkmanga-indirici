import { Box, Text } from "ink";

export const FooterTip = ({ text = "Geri dönmek için [ESC] tuşuna basın." }: { text?: string }) => (
    <Box marginTop={1}>
        <Text color="gray" dimColor>
            💡 {text}
        </Text>
    </Box>
);

export default FooterTip;
