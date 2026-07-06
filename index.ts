import colors from "ansi-colors";
import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import readline from "readline";
import { CleanOptions, ResetMode, simpleGit } from "simple-git";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = __dirname;

function askQuestion(query: string): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            rl.close();
            const affirmative = ["e", "evet", "y", "yes", ""];
            resolve(affirmative.includes(answer.trim().toLowerCase()));
        });
    });
}

async function checkForUpdatesAndRestart(): Promise<void> {
    process.stdout.write(colors.cyan("Güncellemeler kontrol ediliyor...") + "\n");
    const git = simpleGit(PROJECT_ROOT);

    try {
        await git.fetch();
        const status = await git.status();

        if (status.behind > 0) {
            process.stdout.write(
                colors.bold.yellow(`\nUygulama için ${status.behind} yeni güncelleme bulundu!`) +
                    "\n",
            );

            const log = await git.log({ from: "HEAD", to: status.tracking });
            if (log && log.all.length > 0) {
                process.stdout.write(colors.underline.white("\nDeğişiklikler:") + "\n");
                [...log.all].reverse().forEach((commit) => {
                    const commitHash = commit.hash.substring(0, 7);
                    process.stdout.write(
                        `  - ${colors.yellow(commitHash)}: ${
                            commit.message
                        } (${colors.gray(commit.author_name)})\n`,
                    );
                });
                process.stdout.write("\n");
            }

            const proceed = await askQuestion(
                colors.cyan("Bu güncellemeleri şimdi indirip kurmak istiyor musunuz? (E/h): "),
            );

            if (proceed) {
                process.stdout.write(
                    colors.yellow(
                        "Yerel değişiklikler sıfırlanıyor ve sunucu sürümü zorla uygulanıyor...",
                    ) + "\n",
                );

                await git.clean(CleanOptions.FORCE, ["-d"]);
                if (status.tracking) {
                    await git.reset(ResetMode.HARD, [status.tracking]);
                }

                process.stdout.write(colors.green("Uygulama başarıyla güncellendi.") + "\n");

                process.stdout.write(
                    colors.cyan("Gerekli paketler kontrol ediliyor/kuruluyor...") + "\n",
                );
                execSync("pnpm install", {
                    stdio: "inherit",
                    cwd: PROJECT_ROOT,
                });
                process.stdout.write(colors.green("Paketler hazır.") + "\n");

                process.stdout.write(
                    colors.bold.magenta(
                        "Güncellemelerin aktif olması için uygulama yeniden başlatılıyor...",
                    ) + "\n",
                );
                const child = spawn(process.execPath, process.argv.slice(1), {
                    detached: true,
                    stdio: "inherit",
                    cwd: PROJECT_ROOT,
                });
                child.unref();
                process.exit();
            } else {
                process.stdout.write(
                    colors.yellow(
                        "Güncelleme işlemi iptal edildi. Mevcut sürümle devam ediliyor.",
                    ) + "\n",
                );
            }
        } else {
            process.stdout.write(colors.green("Uygulama güncel.") + "\n");
        }
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes("not a git repository")) {
            process.stdout.write(
                colors.yellow(
                    "Bu klasör bir Git deposu olarak ayarlanmamış. Otomatik olarak kuruluyor...",
                ) + "\n",
            );
            const repoUrl = "https://github.com/Mid0aria/turkmanga-indirici.git";
            try {
                await git.init();
                await git.addRemote("origin", repoUrl);
                await git.fetch("origin", "main");
                await git.reset(ResetMode.HARD, ["origin/main"]);
                process.stdout.write(colors.green("Depo başarıyla kuruldu.") + "\n");

                process.stdout.write(colors.cyan("Gerekli paketler kuruluyor...") + "\n");
                execSync("pnpm install", {
                    stdio: "inherit",
                    cwd: PROJECT_ROOT,
                });
                process.stdout.write(colors.green("Kurulum tamamlandı.") + "\n");

                process.stdout.write(
                    colors.bold.magenta(
                        "Kurulumun tamamlanması için uygulama yeniden başlatılıyor...",
                    ) + "\n",
                );
                const child = spawn(process.execPath, process.argv.slice(1), {
                    detached: true,
                    stdio: "inherit",
                    cwd: PROJECT_ROOT,
                });
                child.unref();
                process.exit(0);
            } catch (cloneError: unknown) {
                const cloneMsg =
                    cloneError instanceof Error ? cloneError.message : String(cloneError);
                process.stderr.write(
                    colors.red("Depo kurulurken bir hata oluştu: ") + cloneMsg + "\n",
                );
                process.stderr.write(
                    colors.red(
                        "Lütfen internet bağlantınızı kontrol edin veya manuel olarak 'git clone' komutunu çalıştırın.",
                    ) + "\n",
                );
                process.exit(1);
            }
        } else {
            process.stderr.write(
                colors.red("Güncelleme kontrolü sırasında bir hata oluştu: ") + errorMsg + "\n",
            );
            process.stdout.write(
                colors.yellow("Güncelleme kontrolü atlanıyor. Mevcut sürümle devam edilecek.") +
                    "\n",
            );
        }
    }
}

async function main() {
    await checkForUpdatesAndRestart();

    const packageJsonPath = path.join(PROJECT_ROOT, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
        process.stderr.write(
            colors.red(
                `Hata: package.json dosyası bulunamadı: ${packageJsonPath}. Kurulumda bir sorun oluşmuş olabilir.`,
            ) + "\n",
        );
        process.exit(1);
    }

    process.stdout.write("\x1Bc");
    const { main: StartApp } = await import(
        pathToFileURL(path.join(PROJECT_ROOT, "src/app.tsx")).href
    );
    StartApp();
}

main();

process.on("SIGINT", () => {
    process.stdout.write("\x1B[2J\x1B[3J\x1B[H");
    process.stdout.write(colors.bold.yellow("👋 Uygulamadan çıkış yapıldı. İyi okumalar!") + "\n");
    process.exit(0);
});
