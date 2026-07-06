import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";

export const ScrollableSelectInput = <T,>({
    items,
    onSelect,
    onHighlight,
    pageSize = 8,
}: {
    items: { label: string; value: T }[];
    onSelect: (value: T) => void;
    onHighlight?: (value: T) => void;
    pageSize?: number;
}) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [startIndex, setStartIndex] = useState(0);

    useEffect(() => {
        if (onHighlight && items[selectedIndex]) {
            onHighlight(items[selectedIndex].value);
        }
    }, [selectedIndex, items, onHighlight]);

    useInput((_input, key) => {
        if (key.upArrow) {
            setSelectedIndex((prev) => {
                const nextIdx = prev > 0 ? prev - 1 : items.length - 1;
                if (nextIdx < startIndex) {
                    setStartIndex(nextIdx);
                } else if (nextIdx === items.length - 1) {
                    setStartIndex(Math.max(0, items.length - pageSize));
                }
                return nextIdx;
            });
        } else if (key.downArrow) {
            setSelectedIndex((prev) => {
                const nextIdx = prev < items.length - 1 ? prev + 1 : 0;
                if (nextIdx >= startIndex + pageSize) {
                    setStartIndex(nextIdx - pageSize + 1);
                } else if (nextIdx === 0) {
                    setStartIndex(0);
                }
                return nextIdx;
            });
        } else if (key.return) {
            if (items[selectedIndex]) {
                onSelect(items[selectedIndex].value);
            }
        }
    });

    const visibleItems = items.slice(startIndex, startIndex + pageSize);

    return (
        <Box flexDirection="column">
            {visibleItems.map((item, index) => {
                const absoluteIndex = startIndex + index;
                const isSelected = absoluteIndex === selectedIndex;
                return (
                    <Box key={absoluteIndex}>
                        {isSelected ? (
                            <Text bold>
                                <Text color="rgb(167,139,250)"> ❯ </Text>
                                <Text color="rgb(45,212,191)">{item.label}</Text>
                            </Text>
                        ) : (
                            <Text color="gray">
                                {"   "}
                                {item.label}
                            </Text>
                        )}
                    </Box>
                );
            })}
            {items.length > pageSize && (
                <Box marginTop={1}>
                    <Text color="gray" italic>
                        [Gezinmek için ↑/↓ ok tuşlarını kullanın - Gösterilen: {startIndex + 1}-
                        {Math.min(startIndex + pageSize, items.length)} / {items.length}]
                    </Text>
                </Box>
            )}
        </Box>
    );
};

export default ScrollableSelectInput;
