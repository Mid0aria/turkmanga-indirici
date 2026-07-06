import { ProgressState, getDownloadSpeed } from "@/core/downloader";
import PacmanProgress from "@/tui/components/atoms/PacmanProgress";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useEffect, useState } from "react";

interface DownloadingViewProps {
    downloadProgress: Record<string, ProgressState>;
    completedCount: number;
    totalCount: number;
}

const formatSpeed = (bytesPerSec: number): string => {
    if (bytesPerSec <= 0) return "0 B/s";
    const k = 1024;
    const sizes = ["B/s", "KB/s", "MB/s", "GB/s"];
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
    return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const truncateFilename = (filename: string, maxLength = 25): string => {
    if (filename.length <= maxLength) return filename;
    const ext = ".cbz";
    const nameWithoutExt = filename.endsWith(ext) ? filename.slice(0, -ext.length) : filename;

    const suffixLength = 8;
    const prefixLength = maxLength - suffixLength - 3 - (filename.endsWith(ext) ? ext.length : 0);

    if (prefixLength <= 0) return filename.slice(-maxLength);

    const prefix = nameWithoutExt.slice(0, prefixLength);
    const suffix = nameWithoutExt.slice(-suffixLength);

    return `${prefix}...${suffix}${filename.endsWith(ext) ? ext : ""}`;
};

export const DownloadingView = ({
    downloadProgress,
    completedCount,
    totalCount,
}: DownloadingViewProps) => {
    const allProgressItems = Object.values(downloadProgress);
    const activeProgressItems = allProgressItems.filter((prog) => prog.value < prog.total);
    const completedProgressItems = allProgressItems.filter((prog) => prog.value >= prog.total);
    const visibleCompleted = [...completedProgressItems].reverse().slice(0, 4);

    const [speed, setSpeed] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setSpeed(getDownloadSpeed());
        }, 500);
        return () => clearInterval(timer);
    }, []);

    return (
        <Box flexDirection="row" minHeight={12}>
            <Box flexDirection="column" width="55%" marginRight={2}>
                <Box marginBottom={1}>
                    <Text color="cyan" bold>
                        📥 AKTİF İNDİRİLENLER
                    </Text>
                </Box>

                <Box flexDirection="column" flexGrow={1}>
                    {activeProgressItems.length === 0 ? (
                        <Box flexDirection="row" alignItems="center" paddingY={1}>
                            <Text color="yellow">
                                <Spinner type="dots" />
                            </Text>
                            <Box marginLeft={1}>
                                <Text color="white">
                                    {completedCount > 0
                                        ? "Son bölümler kaydediliyor..."
                                        : "Kuyruk hazırlanıyor..."}
                                </Text>
                            </Box>
                        </Box>
                    ) : (
                        activeProgressItems.map((prog, idx) => (
                            <Box key={idx} flexDirection="column" marginBottom={1}>
                                <Box flexDirection="row" width="100%">
                                    <Box flexDirection="row" alignItems="center">
                                        <Text color="yellow">
                                            <Spinner type="dots" />
                                        </Text>
                                        <Text color="white" bold>
                                            {" "}
                                            📦 {truncateFilename(prog.filename, 25)}
                                        </Text>
                                    </Box>
                                    <Box flexGrow={1} minWidth={2} />
                                    <Text color="gray" italic>
                                        {prog.status}
                                    </Text>
                                </Box>
                                <Box marginLeft={3}>
                                    <PacmanProgress
                                        value={prog.value}
                                        total={prog.total}
                                        width={20}
                                        isRainbow={false}
                                    />
                                </Box>
                            </Box>
                        ))
                    )}
                </Box>
            </Box>

            <Box
                flexDirection="column"
                width="45%"
                borderStyle="single"
                borderColor="gray"
                paddingX={1}
            >
                <Box flexDirection="column" marginBottom={1}>
                    <Text color="magenta" bold>
                        📊 GENEL İNDİRME DURUMU
                    </Text>
                    <Box marginTop={1} marginBottom={1}>
                        <PacmanProgress
                            value={completedCount}
                            total={totalCount || 1}
                            width={22}
                            isRainbow={true}
                        />
                    </Box>
                    <Box flexDirection="column">
                        <Text color="white">
                            İlerleme:{" "}
                            <Text color="yellow" bold>
                                {completedCount} / {totalCount}
                            </Text>
                        </Text>
                        <Text color="white">
                            Hız:{" "}
                            <Text color="cyan" bold>
                                {formatSpeed(speed)}
                            </Text>
                        </Text>
                    </Box>
                </Box>

                <Box
                    borderStyle="single"
                    borderColor="gray"
                    borderDimColor
                    paddingX={1}
                    flexDirection="column"
                    height={7}
                >
                    <Text color="green" bold underline>
                        ✅ TAMAMLANANLAR
                    </Text>
                    <Box flexDirection="column" marginTop={1} flexGrow={1}>
                        {completedProgressItems.length === 0 ? (
                            <Text color="gray" italic>
                                Henüz tamamlanan yok...
                            </Text>
                        ) : (
                            <>
                                {visibleCompleted.map((prog, idx) => (
                                    <Text key={idx} color="green" wrap="truncate-end">
                                        ✔ {truncateFilename(prog.filename, 22)}
                                    </Text>
                                ))}
                                {completedProgressItems.length > 4 && (
                                    <Text color="gray" italic>
                                        ... {completedProgressItems.length - 4} bölüm daha (Yukarı
                                        kaydırıldı)
                                    </Text>
                                )}
                            </>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default DownloadingView;
