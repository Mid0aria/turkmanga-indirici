/* eslint-disable no-unused-vars */

const path = require("path");
const { spawn } = require("child_process");
const cp = require("child_process");
const readline = require("readline");
const simpleGit = require("simple-git");
const colors = require("ansi-colors");

const PROJECT_ROOT = __dirname;

let packageJson;
try {
    packageJson = require(path.join(PROJECT_ROOT, "package.json"));
} catch (e) {
    packageJson = { name: "mangadownloader", version: "0.0.0" };
}

const { startApp } = require(path.join(PROJECT_ROOT, "src/app"));

function askQuestion(query) {
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

async function checkForUpdatesAndRestart() {
    console.log(colors.cyan("Güncellemeler kontrol ediliyor..."));
    const git = simpleGit(PROJECT_ROOT);

    try {
        await git.fetch();
        const status = await git.status();

        if (status.behind > 0) {
            console.log(
                colors.bold.yellow(
                    `\nUygulama için ${status.behind} yeni güncelleme bulundu!`,
                ),
            );

            const log = await git.log({ from: "HEAD", to: status.tracking });
            if (log && log.all.length > 0) {
                console.log(colors.underline.white("\nDeğişiklikler:"));
                log.all.reverse().forEach((commit) => {
                    const commitHash = commit.hash.substring(0, 7);
                    console.log(
                        `  - ${colors.yellow(commitHash)}: ${
                            commit.message
                        } (${colors.gray(commit.author_name)})`,
                    );
                });
                console.log();
            }

            const proceed = await askQuestion(
                colors.cyan(
                    "Bu güncellemeleri şimdi indirip kurmak istiyor musunuz? (E/h): ",
                ),
            );

            if (proceed) {
                console.log(
                    colors.yellow(
                        "Yerel değişiklikler sıfırlanıyor ve sunucu sürümü zorla uygulanıyor...",
                    ),
                );

                await git.clean(simpleGit.CleanOptions.FORCE, ["-d"]);
                await git.reset("hard", [status.tracking]);

                console.log(colors.green("Uygulama başarıyla güncellendi."));

                console.log(
                    colors.cyan(
                        "Gerekli paketler kontrol ediliyor/kuruluyor...",
                    ),
                );
                cp.execSync("npm install", {
                    stdio: "inherit",
                    cwd: PROJECT_ROOT,
                });
                console.log(colors.green("Paketler hazır."));

                console.log(
                    colors.bold.magenta(
                        "Güncellemelerin aktif olması için uygulama yeniden başlatılıyor...",
                    ),
                );
                const child = spawn(process.execPath, process.argv.slice(1), {
                    detached: true,
                    stdio: "inherit",
                    cwd: PROJECT_ROOT,
                });
                child.unref();
                process.exit();
            } else {
                console.log(
                    colors.yellow(
                        "Güncelleme işlemi iptal edildi. Mevcut sürümle devam ediliyor.",
                    ),
                );
            }
        } else {
            console.log(colors.green("Uygulama güncel."));
        }
    } catch (error) {
        if (error.message.includes("not a git repository")) {
            console.warn(
                colors.yellow(
                    "Bu klasör bir Git deposu olarak ayarlanmamış. Otomatik olarak kuruluyor...",
                ),
            );
            const repoUrl =
                "https://gitea.anlayana.com/mido/manga-downloader.git";
            try {
                await git.init();
                await git.addRemote("origin", repoUrl);
                await git.fetch("origin", "main");
                await git.reset("hard", ["origin/main"]);
                console.log(colors.green("Depo başarıyla kuruldu."));

                console.log(colors.cyan("Gerekli paketler kuruluyor..."));
                cp.execSync("npm install", {
                    stdio: "inherit",
                    cwd: PROJECT_ROOT,
                });
                console.log(colors.green("Kurulum tamamlandı."));

                console.log(
                    colors.bold.magenta(
                        "Kurulumun tamamlanması için uygulama yeniden başlatılıyor...",
                    ),
                );
                const child = spawn(process.execPath, process.argv.slice(1), {
                    detached: true,
                    stdio: "inherit",
                    cwd: PROJECT_ROOT,
                });
                child.unref();
                process.exit(0);
            } catch (cloneError) {
                console.error(
                    colors.red("Depo kurulurken bir hata oluştu:"),
                    cloneError.message,
                );
                console.error(
                    colors.red(
                        "Lütfen internet bağlantınızı kontrol edin veya manuel olarak 'git clone' komutunu çalıştırın.",
                    ),
                );
                process.exit(1);
            }
        } else {
            console.error(
                colors.red("Güncelleme kontrolü sırasında bir hata oluştu:"),
                error.message,
            );
            console.warn(
                colors.yellow(
                    "Güncelleme kontrolü atlanıyor. Mevcut sürümle devam edilecek.",
                ),
            );
        }
    }
}

async function main() {
    await checkForUpdatesAndRestart();

    const packageJsonPath = path.join(PROJECT_ROOT, "package.json");
    if (!require("fs").existsSync(packageJsonPath)) {
        console.error(
            colors.red(
                `Hata: package.json dosyası bulunamadı: ${packageJsonPath}. Kurulumda bir sorun oluşmuş olabilir.`,
            ),
        );
        process.exit(1);
    }

    const deps = require(packageJsonPath).dependencies || {};
    let dependenciesInstalled = true;
    for (const dep of Object.keys(deps)) {
        try {
            require.resolve(dep, {
                paths: [path.join(PROJECT_ROOT, "node_modules")],
            });
        } catch (err) {
            dependenciesInstalled = false;
            break;
        }
    }

    if (!dependenciesInstalled) {
        console.log(
            colors.yellow("Gerekli paketler kuruluyor, lütfen bekleyin..."),
        );
        try {
            cp.execSync("npm i", { stdio: "inherit", cwd: PROJECT_ROOT });
            console.log(
                colors.green(
                    "Kurulum tamamlandı! Değişikliklerin etkili olması için uygulama yeniden başlatılıyor.",
                ),
            );
            const child = spawn(process.execPath, process.argv.slice(1), {
                detached: true,
                stdio: "inherit",
                cwd: PROJECT_ROOT,
            });
            child.unref();
            process.exit(0);
        } catch (error) {
            console.error(
                colors.red(
                    "Bağımlılıklar kurulurken bir hata oluştu. Lütfen 'npm install' komutunu manuel olarak çalıştırın.",
                ),
            );
            process.exit(1);
        }
    }

    console.clear();
    const { main: StartApp } = require(path.join(PROJECT_ROOT, "src/app.js"));
    StartApp();
}

main();

process.on("SIGINT", async () => {
    console.log(colors.bold.yellow("\nUygulamadan çıkılıyor."));
    process.exit(0);
});
