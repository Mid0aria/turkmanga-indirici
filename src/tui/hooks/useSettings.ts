import settingsManager from "@/core/settingsManager";
import { Settings } from "@/types";
import { ensureDirExists } from "@/utils/fileUtils";
import nfd from "node-file-dialog";
import { useState } from "react";
import { TuiStep } from "./useTUI";

export const useSettings = (
    setStep: (step: TuiStep) => void,
    setStatusMessage: (msg: string) => void,
    setErrorMessage: (msg: string) => void,
) => {
    const [settings, setSettings] = useState<Settings>(() => settingsManager.getSettings());
    const [manualPathInput, setManualPathInput] = useState("");

    const handleFolderSelect = async () => {
        try {
            const hasGUI =
                process.platform === "win32" || process.env.DISPLAY || process.env.WAYLAND_DISPLAY;
            if (hasGUI) {
                setStatusMessage("Klasör seçim diyaloğu açılıyor...");
                const paths = await nfd({ type: "directory" });
                if (paths && paths.length > 0) {
                    const newDir = paths[0];
                    await ensureDirExists(newDir);
                    settingsManager.updateSetting("downloadDir", newDir);
                    setSettings({ ...settings, downloadDir: newDir });
                    setStatusMessage(`Klasör başarıyla güncellendi: ${newDir}`);
                } else {
                    setStatusMessage("Klasör seçimi iptal edildi.");
                }
            } else {
                setManualPathInput(settings.downloadDir);
                setStep("SETTINGS_MANUAL_DIR");
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setStatusMessage(`Diyalog hatası: ${msg}. Manuel girişe yönlendiriliyorsunuz.`);
            setManualPathInput(settings.downloadDir);
            setStep("SETTINGS_MANUAL_DIR");
        }
    };

    const handleManualPathSubmit = async () => {
        if (!manualPathInput.trim()) {
            setErrorMessage("Klasör yolu boş olamaz.");
            return;
        }
        try {
            await ensureDirExists(manualPathInput);
            settingsManager.updateSetting("downloadDir", manualPathInput);
            setSettings({ ...settings, downloadDir: manualPathInput });
            setStep("SETTINGS");
            setStatusMessage(`Klasör güncellendi: ${manualPathInput}`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setErrorMessage(`Dizin doğrulanamadı: ${msg}`);
        }
    };

    return {
        settings,
        setSettings,
        manualPathInput,
        setManualPathInput,
        handleFolderSelect,
        handleManualPathSubmit,
    };
};

export default useSettings;
