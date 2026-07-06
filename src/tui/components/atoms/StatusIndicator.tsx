import { Box, Text } from "ink";

export const StatusIndicator = ({
    errorMessage,
    statusMessage,
}: {
    errorMessage?: string;
    statusMessage?: string;
}) => (
    <Box flexDirection="column" marginTop={1}>
        {errorMessage && (
            <Text color="rgb(248,113,113)" bold>
                ❌ Hata: {errorMessage}
            </Text>
        )}
        {statusMessage && (
            <Text color="rgb(253,224,71)" italic>
                ℹ️ {statusMessage}
            </Text>
        )}
    </Box>
);

export default StatusIndicator;
