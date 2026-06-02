/**
 * ComfyUI app スタブ（単体テスト用）。
 * 本番では ../../scripts/app.js が使われる。
 */

export const app = {
    graph: {
        links: new Map(),
    },
    canvas: {
        getCurrentGraph() {
            return {
                getNodeById() {
                    return null;
                },
            };
        },
    },
    configuringGraph: false,
};
