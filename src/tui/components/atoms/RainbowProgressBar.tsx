import { Text } from "ink";

interface RainbowProgressBarProps {
    value: number;
    total: number;
    width?: number;
    isRainbow?: boolean;
}

function rainbowColor(position: number) {
    const hue = position * 360;

    const c = 1;
    const x = 1 - Math.abs(((hue / 60) % 2) - 1);

    let r = 0,
        g = 0,
        b = 0;

    if (hue < 60) [r, g, b] = [c, x, 0];
    else if (hue < 120) [r, g, b] = [x, c, 0];
    else if (hue < 180) [r, g, b] = [0, c, x];
    else if (hue < 240) [r, g, b] = [0, x, c];
    else if (hue < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
}

export const RainbowProgressBar = ({
    value,
    total,
    width = 30,
    isRainbow = true,
}: RainbowProgressBarProps) => {
    const percent = Math.min(100, Math.max(0, Math.round((value / total) * 100)));

    const filledWidth = Math.round((percent / 100) * width);
    const emptyWidth = width - filledWidth;

    return (
        <Text>
            <Text color="cyan">[</Text>

            {Array.from({ length: filledWidth }).map((_, i) => (
                <Text
                    key={i}
                    backgroundColor={
                        isRainbow ? rainbowColor(i / Math.max(filledWidth - 1, 1)) : "cyan"
                    }
                >
                    {" "}
                </Text>
            ))}

            <Text color="gray">{" ".repeat(emptyWidth)}</Text>

            <Text color="cyan">]</Text>
            <Text color="yellow" bold>
                {" "}
                {percent.toString().padStart(3)}%
            </Text>
        </Text>
    );
};

export default RainbowProgressBar;
