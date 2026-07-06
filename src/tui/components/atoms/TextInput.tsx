import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";

export const TextInput = ({
    value,
    onChange,
    onSubmit,
    placeholder = "Yazmaya başlayın...",
}: {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    placeholder?: string;
}) => {
    const [cursorIndex, setCursorIndex] = useState(value.length);

    useEffect(() => {
        if (cursorIndex > value.length) {
            setCursorIndex(value.length);
        }
    }, [value, cursorIndex]);

    useInput((input, key) => {
        if (key.return) {
            onSubmit();
        } else if (key.leftArrow) {
            setCursorIndex((prev) => Math.max(0, prev - 1));
        } else if (key.rightArrow) {
            setCursorIndex((prev) => Math.min(value.length, prev + 1));
        } else if (key.backspace) {
            if (cursorIndex > 0) {
                const newValue = value.slice(0, cursorIndex - 1) + value.slice(cursorIndex);
                onChange(newValue);
                setCursorIndex((prev) => prev - 1);
            }
        } else if (key.delete) {
            if (cursorIndex < value.length) {
                const newValue = value.slice(0, cursorIndex) + value.slice(cursorIndex + 1);
                onChange(newValue);
            }
        } else if (
            input &&
            !key.ctrl &&
            !key.meta &&
            !key.escape &&
            !key.upArrow &&
            !key.downArrow
        ) {
            const newValue = value.slice(0, cursorIndex) + input + value.slice(cursorIndex);
            onChange(newValue);
            setCursorIndex((prev) => prev + input.length);
        }
    });

    const renderContent = () => {
        if (!value) {
            return (
                <Text>
                    <Text color="cyan" bold>
                        |
                    </Text>
                    <Text color="gray">{placeholder}</Text>
                </Text>
            );
        }

        const beforeCursor = value.slice(0, cursorIndex);
        const afterCursor = value.slice(cursorIndex);

        return (
            <Text color="white">
                {beforeCursor}
                <Text color="cyan" bold>
                    |
                </Text>
                {afterCursor}
            </Text>
        );
    };

    return (
        <Box borderStyle="single" borderColor="cyan" paddingX={1}>
            {renderContent()}
        </Box>
    );
};

export default TextInput;
