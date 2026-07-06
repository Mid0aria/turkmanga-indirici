import { Text } from "ink";

export const ProgressBar = ({
    value,
    total,
    width = 30,
}: {
    value: number;
    total: number;
    width?: number;
}) => {
    const percent = Math.min(100, Math.max(0, Math.round((value / total) * 100)));
    const filledWidth = Math.round((percent / 100) * width);
    const emptyWidth = width - filledWidth;
    const bar = "█".repeat(filledWidth) + "░".repeat(emptyWidth);
    return (
        <Text>
            <Text color="cyan">[{bar}]</Text>
            <Text color="yellow"> {String(percent).padStart(3)}%</Text>
        </Text>
    );
};

export default ProgressBar;
