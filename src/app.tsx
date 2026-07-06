import TUIApp from "@/tui/App";
import colors from "ansi-colors";
import { render } from "ink";

export const main = () => {
    const { waitUntilExit } = render(<TUIApp />);

    waitUntilExit().then(() => {
        process.stdout.write("\x1B[2J\x1B[3J\x1B[H");
        process.stdout.write(
            colors.bold.green(
                "👋 TürkManga İndirici'yi kullandığınız için teşekkürler. İyi okumalar!",
            ) + "\n",
        );
        process.exit(0);
    });
};

export default {
    main,
};
