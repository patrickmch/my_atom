"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const atom_1 = require("atom");
const electron_1 = require("electron");
const fileUriToPath = require("file-uri-to-path");
const util_1 = require("../util");
class WebviewHandler {
    constructor(init) {
        this.emitter = new atom_1.Emitter();
        this.disposables = new atom_1.CompositeDisposable();
        this.destroyed = false;
        this.zoomLevel = 0;
        this.replyCallbacks = new Map();
        this.replyCallbackId = 0;
        this._element = document.createElement('webview');
        this._element.classList.add('markdown-preview-plus', 'native-key-bindings');
        this._element.disablewebsecurity = 'true';
        this._element.nodeintegration = 'true';
        this._element.src = `file:///${__dirname}/../../client/template.html`;
        this._element.style.width = '100%';
        this._element.style.height = '100%';
        this._element.addEventListener('ipc-message', (e) => {
            switch (e.channel) {
                case 'zoom-in':
                    this.zoomIn();
                    break;
                case 'zoom-out':
                    this.zoomOut();
                    break;
                case 'did-scroll-preview':
                    this.emitter.emit('did-scroll-preview', e.args[0]);
                    break;
                case 'request-reply': {
                    const { id, request, result } = e.args[0];
                    const cb = this.replyCallbacks.get(id);
                    if (cb && request === cb.request) {
                        const callback = cb.callback;
                        callback(result);
                    }
                    break;
                }
            }
        });
        this._element.addEventListener('will-navigate', async (e) => {
            if (e.url.startsWith('file://')) {
                util_1.handlePromise(atom.workspace.open(fileUriToPath(e.url)));
            }
            else {
                electron_1.shell.openExternal(e.url);
            }
        });
        this.disposables.add(atom.styles.onDidAddStyleElement(() => {
            this.updateStyles();
        }), atom.styles.onDidRemoveStyleElement(() => {
            this.updateStyles();
        }), atom.styles.onDidUpdateStyleElement(() => {
            this.updateStyles();
        }));
        const onload = () => {
            if (this.destroyed)
                return;
            this._element.setZoomLevel(this.zoomLevel);
            this.updateStyles();
            init();
        };
        this._element.addEventListener('dom-ready', onload);
    }
    get element() {
        return this._element;
    }
    async runJS(js) {
        return new Promise((resolve) => this._element.executeJavaScript(js, false, resolve));
    }
    destroy() {
        if (this.destroyed)
            return;
        this.destroyed = true;
        this.disposables.dispose();
        this._element.remove();
    }
    async update(html, renderLaTeX, mjrenderer) {
        if (this.destroyed)
            return undefined;
        return this.runRequest('update-preview', {
            html,
            renderLaTeX,
            mjrenderer,
        });
    }
    setSourceMap(map) {
        this._element.send('set-source-map', { map });
    }
    setUseGitHubStyle(value) {
        this._element.send('use-github-style', { value });
    }
    setBasePath(path) {
        this._element.send('set-base-path', { path });
    }
    init(atomHome, numberEqns) {
        this._element.send('init', { atomHome, numberEqns });
    }
    updateImages(oldSource, version) {
        this._element.send('update-images', {
            oldsrc: oldSource,
            v: version,
        });
    }
    saveToPDF(filePath) {
        this._element.printToPDF({}, (error, data) => {
            if (error) {
                atom.notifications.addError('Failed saving to PDF', {
                    description: error.toString(),
                    dismissable: true,
                    stack: error.stack,
                });
                return;
            }
            fs.writeFileSync(filePath, data);
        });
    }
    sync(line) {
        this._element.send('sync', { line });
    }
    async syncSource() {
        return this.runRequest('sync-source', {});
    }
    scrollSync(firstLine, lastLine) {
        this._element.send('scroll-sync', { firstLine, lastLine });
    }
    zoomIn() {
        this.zoomLevel += 0.1;
        this._element.setZoomLevel(this.zoomLevel);
    }
    zoomOut() {
        this.zoomLevel -= 0.1;
        this._element.setZoomLevel(this.zoomLevel);
    }
    resetZoom() {
        this.zoomLevel = 0;
        this._element.setZoomLevel(this.zoomLevel);
    }
    print() {
        this._element.print();
    }
    openDevTools() {
        this._element.openDevTools();
    }
    async reload() {
        await this.runRequest('reload', {});
        this._element.reload();
    }
    error(msg) {
        this._element.send('error', { msg });
    }
    async getTeXConfig() {
        return this.runRequest('get-tex-config', {});
    }
    async runRequest(request, args) {
        const id = this.replyCallbackId++;
        return new Promise((resolve) => {
            this.replyCallbacks.set(id, {
                request: request,
                callback: (result) => {
                    this.replyCallbacks.delete(id);
                    resolve(result);
                },
            });
            const newargs = Object.assign({ id }, args);
            this._element.send(request, newargs);
        });
    }
    updateStyles() {
        const styles = [];
        for (const se of atom.styles.getStyleElements()) {
            styles.push(se.innerHTML);
        }
        this._element.send('style', { styles });
    }
}
exports.WebviewHandler = WebviewHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlldy1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21hcmtkb3duLXByZXZpZXctdmlldy93ZWJ2aWV3LWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx5QkFBd0I7QUFDeEIsK0JBQW1EO0FBQ25ELHVDQUE0QztBQUM1QyxrREFBa0Q7QUFFbEQsa0NBQXVDO0FBWXZDO0lBY0UsWUFBWSxJQUFnQjtRQWJaLFlBQU8sR0FBRyxJQUFJLGNBQU8sRUFLbEMsQ0FBQTtRQUNPLGdCQUFXLEdBQUcsSUFBSSwwQkFBbUIsRUFBRSxDQUFBO1FBRXpDLGNBQVMsR0FBRyxLQUFLLENBQUE7UUFDakIsY0FBUyxHQUFHLENBQUMsQ0FBQTtRQUNiLG1CQUFjLEdBQUcsSUFBSSxHQUFHLEVBQStCLENBQUE7UUFDdkQsb0JBQWUsR0FBRyxDQUFDLENBQUE7UUFHekIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2pELElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1FBQzNFLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEdBQUcsTUFBTSxDQUFBO1FBQ3pDLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQTtRQUN0QyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsR0FBRyxXQUFXLFNBQVMsNkJBQTZCLENBQUE7UUFDckUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQTtRQUNsQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO1FBQ25DLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQzVCLGFBQWEsRUFDYixDQUFDLENBQWlDLEVBQUUsRUFBRTtZQUNwQyxRQUFRLENBQUMsQ0FBQyxPQUFPLEVBQUU7Z0JBQ2pCLEtBQUssU0FBUztvQkFDWixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7b0JBQ2IsTUFBSztnQkFDUCxLQUFLLFVBQVU7b0JBQ2IsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO29CQUNkLE1BQUs7Z0JBQ1AsS0FBSyxvQkFBb0I7b0JBQ3ZCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDbEQsTUFBSztnQkFFUCxLQUFLLGVBQWUsQ0FBQyxDQUFDO29CQUNwQixNQUFNLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUN6QyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtvQkFDdEMsSUFBSSxFQUFFLElBQUksT0FBTyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUU7d0JBQ2hDLE1BQU0sUUFBUSxHQUFxQixFQUFFLENBQUMsUUFBUSxDQUFBO3dCQUM5QyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7cUJBQ2pCO29CQUNELE1BQUs7aUJBQ047YUFDRjtRQUNILENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzFELElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQy9CLG9CQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7YUFDekQ7aUJBQU07Z0JBQ0wsZ0JBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2FBQzFCO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FDbEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUU7WUFDcEMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3JCLENBQUMsQ0FBQyxFQUNGLElBQUksQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO1lBQ3ZDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNyQixDQUFDLENBQUMsRUFDRixJQUFJLENBQUMsTUFBTSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtZQUN2QyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDckIsQ0FBQyxDQUFDLENBQ0gsQ0FBQTtRQUVELE1BQU0sTUFBTSxHQUFHLEdBQUcsRUFBRTtZQUNsQixJQUFJLElBQUksQ0FBQyxTQUFTO2dCQUFFLE9BQU07WUFDMUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtZQUNuQixJQUFJLEVBQUUsQ0FBQTtRQUNSLENBQUMsQ0FBQTtRQUNELElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFRCxJQUFXLE9BQU87UUFDaEIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3RCLENBQUM7SUFFTSxLQUFLLENBQUMsS0FBSyxDQUFJLEVBQVU7UUFDOUIsT0FBTyxJQUFJLE9BQU8sQ0FBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQ2hDLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FDcEQsQ0FBQTtJQUNILENBQUM7SUFFTSxPQUFPO1FBQ1osSUFBSSxJQUFJLENBQUMsU0FBUztZQUFFLE9BQU07UUFDMUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUE7UUFDckIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUMxQixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ3hCLENBQUM7SUFFTSxLQUFLLENBQUMsTUFBTSxDQUNqQixJQUFZLEVBQ1osV0FBb0IsRUFDcEIsVUFBMkI7UUFFM0IsSUFBSSxJQUFJLENBQUMsU0FBUztZQUFFLE9BQU8sU0FBUyxDQUFBO1FBQ3BDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRTtZQUN2QyxJQUFJO1lBQ0osV0FBVztZQUNYLFVBQVU7U0FDWCxDQUFDLENBQUE7SUFDSixDQUFDO0lBRU0sWUFBWSxDQUFDLEdBRW5CO1FBQ0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQW1CLGdCQUFnQixFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0lBRU0saUJBQWlCLENBQUMsS0FBYztRQUNyQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBcUIsa0JBQWtCLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQ3ZFLENBQUM7SUFFTSxXQUFXLENBQUMsSUFBYTtRQUM5QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBa0IsZUFBZSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUNoRSxDQUFDO0lBRU0sSUFBSSxDQUFDLFFBQWdCLEVBQUUsVUFBbUI7UUFDL0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQVMsTUFBTSxFQUFFLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUE7SUFDOUQsQ0FBQztJQUVNLFlBQVksQ0FBQyxTQUFpQixFQUFFLE9BQXVCO1FBQzVELElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFrQixlQUFlLEVBQUU7WUFDbkQsTUFBTSxFQUFFLFNBQVM7WUFDakIsQ0FBQyxFQUFFLE9BQU87U0FDWCxDQUFDLENBQUE7SUFDSixDQUFDO0lBRU0sU0FBUyxDQUFDLFFBQWdCO1FBQy9CLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUMzQyxJQUFJLEtBQUssRUFBRTtnQkFDVCxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRTtvQkFDbEQsV0FBVyxFQUFFLEtBQUssQ0FBQyxRQUFRLEVBQUU7b0JBQzdCLFdBQVcsRUFBRSxJQUFJO29CQUNqQixLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7aUJBQ25CLENBQUMsQ0FBQTtnQkFDRixPQUFNO2FBQ1A7WUFDRCxFQUFFLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNsQyxDQUFDLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFFTSxJQUFJLENBQUMsSUFBWTtRQUN0QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBUyxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFTSxLQUFLLENBQUMsVUFBVTtRQUNyQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFTSxVQUFVLENBQUMsU0FBaUIsRUFBRSxRQUFnQjtRQUNuRCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBZ0IsYUFBYSxFQUFFLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7SUFDM0UsQ0FBQztJQUVNLE1BQU07UUFDWCxJQUFJLENBQUMsU0FBUyxJQUFJLEdBQUcsQ0FBQTtRQUNyQixJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVNLE9BQU87UUFDWixJQUFJLENBQUMsU0FBUyxJQUFJLEdBQUcsQ0FBQTtRQUNyQixJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVNLFNBQVM7UUFDZCxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQTtRQUNsQixJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVNLEtBQUs7UUFDVixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3ZCLENBQUM7SUFFTSxZQUFZO1FBQ2pCLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLENBQUE7SUFDOUIsQ0FBQztJQUVNLEtBQUssQ0FBQyxNQUFNO1FBQ2pCLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbkMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUN4QixDQUFDO0lBRU0sS0FBSyxDQUFDLEdBQVc7UUFDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQVUsT0FBTyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRU0sS0FBSyxDQUFDLFlBQVk7UUFDdkIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFUyxLQUFLLENBQUMsVUFBVSxDQUN4QixPQUFVLEVBQ1YsSUFBcUU7UUFFckUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQ2pDLE9BQU8sSUFBSSxPQUFPLENBQXFCLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDakQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFO2dCQUMxQixPQUFPLEVBQUUsT0FBTztnQkFDaEIsUUFBUSxFQUFFLENBQUMsTUFBMEIsRUFBRSxFQUFFO29CQUN2QyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtvQkFDOUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUNqQixDQUFDO2FBQ3dCLENBQUMsQ0FBQTtZQUM1QixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDM0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUksT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3pDLENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUVPLFlBQVk7UUFDbEIsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFBO1FBQzNCLEtBQUssTUFBTSxFQUFFLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFO1lBQy9DLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1NBQzFCO1FBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQVUsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0NBQ0Y7QUEzTkQsd0NBMk5DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnXG5pbXBvcnQgeyBFbWl0dGVyLCBDb21wb3NpdGVEaXNwb3NhYmxlIH0gZnJvbSAnYXRvbSdcbmltcG9ydCB7IFdlYnZpZXdUYWcsIHNoZWxsIH0gZnJvbSAnZWxlY3Ryb24nXG5pbXBvcnQgZmlsZVVyaVRvUGF0aCA9IHJlcXVpcmUoJ2ZpbGUtdXJpLXRvLXBhdGgnKVxuXG5pbXBvcnQgeyBoYW5kbGVQcm9taXNlIH0gZnJvbSAnLi4vdXRpbCdcbmltcG9ydCB7IFJlcXVlc3RSZXBseU1hcCwgQ2hhbm5lbE1hcCB9IGZyb20gJy4uLy4uL3NyYy1jbGllbnQvaXBjJ1xuXG5leHBvcnQgdHlwZSBSZXBseUNhbGxiYWNrU3RydWN0PFxuICBUIGV4dGVuZHMga2V5b2YgUmVxdWVzdFJlcGx5TWFwID0ga2V5b2YgUmVxdWVzdFJlcGx5TWFwXG4+ID0ge1xuICBbSyBpbiBrZXlvZiBSZXF1ZXN0UmVwbHlNYXBdOiB7XG4gICAgcmVxdWVzdDogS1xuICAgIGNhbGxiYWNrOiAocmVwbHk6IFJlcXVlc3RSZXBseU1hcFtLXSkgPT4gdm9pZFxuICB9XG59W1RdXG5cbmV4cG9ydCBjbGFzcyBXZWJ2aWV3SGFuZGxlciB7XG4gIHB1YmxpYyByZWFkb25seSBlbWl0dGVyID0gbmV3IEVtaXR0ZXI8XG4gICAge30sXG4gICAge1xuICAgICAgJ2RpZC1zY3JvbGwtcHJldmlldyc6IHsgbWluOiBudW1iZXI7IG1heDogbnVtYmVyIH1cbiAgICB9XG4gID4oKVxuICBwcm90ZWN0ZWQgZGlzcG9zYWJsZXMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpXG4gIHByaXZhdGUgcmVhZG9ubHkgX2VsZW1lbnQ6IFdlYnZpZXdUYWdcbiAgcHJpdmF0ZSBkZXN0cm95ZWQgPSBmYWxzZVxuICBwcml2YXRlIHpvb21MZXZlbCA9IDBcbiAgcHJpdmF0ZSByZXBseUNhbGxiYWNrcyA9IG5ldyBNYXA8bnVtYmVyLCBSZXBseUNhbGxiYWNrU3RydWN0PigpXG4gIHByaXZhdGUgcmVwbHlDYWxsYmFja0lkID0gMFxuXG4gIGNvbnN0cnVjdG9yKGluaXQ6ICgpID0+IHZvaWQpIHtcbiAgICB0aGlzLl9lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnd2VidmlldycpXG4gICAgdGhpcy5fZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdtYXJrZG93bi1wcmV2aWV3LXBsdXMnLCAnbmF0aXZlLWtleS1iaW5kaW5ncycpXG4gICAgdGhpcy5fZWxlbWVudC5kaXNhYmxld2Vic2VjdXJpdHkgPSAndHJ1ZSdcbiAgICB0aGlzLl9lbGVtZW50Lm5vZGVpbnRlZ3JhdGlvbiA9ICd0cnVlJ1xuICAgIHRoaXMuX2VsZW1lbnQuc3JjID0gYGZpbGU6Ly8vJHtfX2Rpcm5hbWV9Ly4uLy4uL2NsaWVudC90ZW1wbGF0ZS5odG1sYFxuICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUud2lkdGggPSAnMTAwJSdcbiAgICB0aGlzLl9lbGVtZW50LnN0eWxlLmhlaWdodCA9ICcxMDAlJ1xuICAgIHRoaXMuX2VsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICdpcGMtbWVzc2FnZScsXG4gICAgICAoZTogRWxlY3Ryb24uSXBjTWVzc2FnZUV2ZW50Q3VzdG9tKSA9PiB7XG4gICAgICAgIHN3aXRjaCAoZS5jaGFubmVsKSB7XG4gICAgICAgICAgY2FzZSAnem9vbS1pbic6XG4gICAgICAgICAgICB0aGlzLnpvb21JbigpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ3pvb20tb3V0JzpcbiAgICAgICAgICAgIHRoaXMuem9vbU91dCgpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgJ2RpZC1zY3JvbGwtcHJldmlldyc6XG4gICAgICAgICAgICB0aGlzLmVtaXR0ZXIuZW1pdCgnZGlkLXNjcm9sbC1wcmV2aWV3JywgZS5hcmdzWzBdKVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAvLyByZXBsaWVzXG4gICAgICAgICAgY2FzZSAncmVxdWVzdC1yZXBseSc6IHtcbiAgICAgICAgICAgIGNvbnN0IHsgaWQsIHJlcXVlc3QsIHJlc3VsdCB9ID0gZS5hcmdzWzBdXG4gICAgICAgICAgICBjb25zdCBjYiA9IHRoaXMucmVwbHlDYWxsYmFja3MuZ2V0KGlkKVxuICAgICAgICAgICAgaWYgKGNiICYmIHJlcXVlc3QgPT09IGNiLnJlcXVlc3QpIHtcbiAgICAgICAgICAgICAgY29uc3QgY2FsbGJhY2s6IChyOiBhbnkpID0+IHZvaWQgPSBjYi5jYWxsYmFja1xuICAgICAgICAgICAgICBjYWxsYmFjayhyZXN1bHQpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICApXG4gICAgdGhpcy5fZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCd3aWxsLW5hdmlnYXRlJywgYXN5bmMgKGUpID0+IHtcbiAgICAgIGlmIChlLnVybC5zdGFydHNXaXRoKCdmaWxlOi8vJykpIHtcbiAgICAgICAgaGFuZGxlUHJvbWlzZShhdG9tLndvcmtzcGFjZS5vcGVuKGZpbGVVcmlUb1BhdGgoZS51cmwpKSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNoZWxsLm9wZW5FeHRlcm5hbChlLnVybClcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgdGhpcy5kaXNwb3NhYmxlcy5hZGQoXG4gICAgICBhdG9tLnN0eWxlcy5vbkRpZEFkZFN0eWxlRWxlbWVudCgoKSA9PiB7XG4gICAgICAgIHRoaXMudXBkYXRlU3R5bGVzKClcbiAgICAgIH0pLFxuICAgICAgYXRvbS5zdHlsZXMub25EaWRSZW1vdmVTdHlsZUVsZW1lbnQoKCkgPT4ge1xuICAgICAgICB0aGlzLnVwZGF0ZVN0eWxlcygpXG4gICAgICB9KSxcbiAgICAgIGF0b20uc3R5bGVzLm9uRGlkVXBkYXRlU3R5bGVFbGVtZW50KCgpID0+IHtcbiAgICAgICAgdGhpcy51cGRhdGVTdHlsZXMoKVxuICAgICAgfSksXG4gICAgKVxuXG4gICAgY29uc3Qgb25sb2FkID0gKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuZGVzdHJveWVkKSByZXR1cm5cbiAgICAgIHRoaXMuX2VsZW1lbnQuc2V0Wm9vbUxldmVsKHRoaXMuem9vbUxldmVsKVxuICAgICAgdGhpcy51cGRhdGVTdHlsZXMoKVxuICAgICAgaW5pdCgpXG4gICAgfVxuICAgIHRoaXMuX2VsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZG9tLXJlYWR5Jywgb25sb2FkKVxuICB9XG5cbiAgcHVibGljIGdldCBlbGVtZW50KCk6IEhUTUxFbGVtZW50IHtcbiAgICByZXR1cm4gdGhpcy5fZWxlbWVudFxuICB9XG5cbiAgcHVibGljIGFzeW5jIHJ1bkpTPFQ+KGpzOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8VD4oKHJlc29sdmUpID0+XG4gICAgICB0aGlzLl9lbGVtZW50LmV4ZWN1dGVKYXZhU2NyaXB0KGpzLCBmYWxzZSwgcmVzb2x2ZSksXG4gICAgKVxuICB9XG5cbiAgcHVibGljIGRlc3Ryb3koKSB7XG4gICAgaWYgKHRoaXMuZGVzdHJveWVkKSByZXR1cm5cbiAgICB0aGlzLmRlc3Ryb3llZCA9IHRydWVcbiAgICB0aGlzLmRpc3Bvc2FibGVzLmRpc3Bvc2UoKVxuICAgIHRoaXMuX2VsZW1lbnQucmVtb3ZlKClcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyB1cGRhdGUoXG4gICAgaHRtbDogc3RyaW5nLFxuICAgIHJlbmRlckxhVGVYOiBib29sZWFuLFxuICAgIG1qcmVuZGVyZXI6IE1hdGhKYXhSZW5kZXJlcixcbiAgKSB7XG4gICAgaWYgKHRoaXMuZGVzdHJveWVkKSByZXR1cm4gdW5kZWZpbmVkXG4gICAgcmV0dXJuIHRoaXMucnVuUmVxdWVzdCgndXBkYXRlLXByZXZpZXcnLCB7XG4gICAgICBodG1sLFxuICAgICAgcmVuZGVyTGFUZVgsXG4gICAgICBtanJlbmRlcmVyLFxuICAgIH0pXG4gIH1cblxuICBwdWJsaWMgc2V0U291cmNlTWFwKG1hcDoge1xuICAgIFtsaW5lOiBudW1iZXJdOiB7IHRhZzogc3RyaW5nOyBpbmRleDogbnVtYmVyIH1bXVxuICB9KSB7XG4gICAgdGhpcy5fZWxlbWVudC5zZW5kPCdzZXQtc291cmNlLW1hcCc+KCdzZXQtc291cmNlLW1hcCcsIHsgbWFwIH0pXG4gIH1cblxuICBwdWJsaWMgc2V0VXNlR2l0SHViU3R5bGUodmFsdWU6IGJvb2xlYW4pIHtcbiAgICB0aGlzLl9lbGVtZW50LnNlbmQ8J3VzZS1naXRodWItc3R5bGUnPigndXNlLWdpdGh1Yi1zdHlsZScsIHsgdmFsdWUgfSlcbiAgfVxuXG4gIHB1YmxpYyBzZXRCYXNlUGF0aChwYXRoPzogc3RyaW5nKSB7XG4gICAgdGhpcy5fZWxlbWVudC5zZW5kPCdzZXQtYmFzZS1wYXRoJz4oJ3NldC1iYXNlLXBhdGgnLCB7IHBhdGggfSlcbiAgfVxuXG4gIHB1YmxpYyBpbml0KGF0b21Ib21lOiBzdHJpbmcsIG51bWJlckVxbnM6IGJvb2xlYW4pIHtcbiAgICB0aGlzLl9lbGVtZW50LnNlbmQ8J2luaXQnPignaW5pdCcsIHsgYXRvbUhvbWUsIG51bWJlckVxbnMgfSlcbiAgfVxuXG4gIHB1YmxpYyB1cGRhdGVJbWFnZXMob2xkU291cmNlOiBzdHJpbmcsIHZlcnNpb246IG51bWJlciB8IGZhbHNlKSB7XG4gICAgdGhpcy5fZWxlbWVudC5zZW5kPCd1cGRhdGUtaW1hZ2VzJz4oJ3VwZGF0ZS1pbWFnZXMnLCB7XG4gICAgICBvbGRzcmM6IG9sZFNvdXJjZSxcbiAgICAgIHY6IHZlcnNpb24sXG4gICAgfSlcbiAgfVxuXG4gIHB1YmxpYyBzYXZlVG9QREYoZmlsZVBhdGg6IHN0cmluZykge1xuICAgIHRoaXMuX2VsZW1lbnQucHJpbnRUb1BERih7fSwgKGVycm9yLCBkYXRhKSA9PiB7XG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgYXRvbS5ub3RpZmljYXRpb25zLmFkZEVycm9yKCdGYWlsZWQgc2F2aW5nIHRvIFBERicsIHtcbiAgICAgICAgICBkZXNjcmlwdGlvbjogZXJyb3IudG9TdHJpbmcoKSxcbiAgICAgICAgICBkaXNtaXNzYWJsZTogdHJ1ZSxcbiAgICAgICAgICBzdGFjazogZXJyb3Iuc3RhY2ssXG4gICAgICAgIH0pXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgZGF0YSlcbiAgICB9KVxuICB9XG5cbiAgcHVibGljIHN5bmMobGluZTogbnVtYmVyKSB7XG4gICAgdGhpcy5fZWxlbWVudC5zZW5kPCdzeW5jJz4oJ3N5bmMnLCB7IGxpbmUgfSlcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBzeW5jU291cmNlKCkge1xuICAgIHJldHVybiB0aGlzLnJ1blJlcXVlc3QoJ3N5bmMtc291cmNlJywge30pXG4gIH1cblxuICBwdWJsaWMgc2Nyb2xsU3luYyhmaXJzdExpbmU6IG51bWJlciwgbGFzdExpbmU6IG51bWJlcikge1xuICAgIHRoaXMuX2VsZW1lbnQuc2VuZDwnc2Nyb2xsLXN5bmMnPignc2Nyb2xsLXN5bmMnLCB7IGZpcnN0TGluZSwgbGFzdExpbmUgfSlcbiAgfVxuXG4gIHB1YmxpYyB6b29tSW4oKSB7XG4gICAgdGhpcy56b29tTGV2ZWwgKz0gMC4xXG4gICAgdGhpcy5fZWxlbWVudC5zZXRab29tTGV2ZWwodGhpcy56b29tTGV2ZWwpXG4gIH1cblxuICBwdWJsaWMgem9vbU91dCgpIHtcbiAgICB0aGlzLnpvb21MZXZlbCAtPSAwLjFcbiAgICB0aGlzLl9lbGVtZW50LnNldFpvb21MZXZlbCh0aGlzLnpvb21MZXZlbClcbiAgfVxuXG4gIHB1YmxpYyByZXNldFpvb20oKSB7XG4gICAgdGhpcy56b29tTGV2ZWwgPSAwXG4gICAgdGhpcy5fZWxlbWVudC5zZXRab29tTGV2ZWwodGhpcy56b29tTGV2ZWwpXG4gIH1cblxuICBwdWJsaWMgcHJpbnQoKSB7XG4gICAgdGhpcy5fZWxlbWVudC5wcmludCgpXG4gIH1cblxuICBwdWJsaWMgb3BlbkRldlRvb2xzKCkge1xuICAgIHRoaXMuX2VsZW1lbnQub3BlbkRldlRvb2xzKClcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyByZWxvYWQoKSB7XG4gICAgYXdhaXQgdGhpcy5ydW5SZXF1ZXN0KCdyZWxvYWQnLCB7fSlcbiAgICB0aGlzLl9lbGVtZW50LnJlbG9hZCgpXG4gIH1cblxuICBwdWJsaWMgZXJyb3IobXNnOiBzdHJpbmcpIHtcbiAgICB0aGlzLl9lbGVtZW50LnNlbmQ8J2Vycm9yJz4oJ2Vycm9yJywgeyBtc2cgfSlcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBnZXRUZVhDb25maWcoKSB7XG4gICAgcmV0dXJuIHRoaXMucnVuUmVxdWVzdCgnZ2V0LXRleC1jb25maWcnLCB7fSlcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBydW5SZXF1ZXN0PFQgZXh0ZW5kcyBrZXlvZiBSZXF1ZXN0UmVwbHlNYXA+KFxuICAgIHJlcXVlc3Q6IFQsXG4gICAgYXJnczogeyBbSyBpbiBFeGNsdWRlPGtleW9mIENoYW5uZWxNYXBbVF0sICdpZCc+XTogQ2hhbm5lbE1hcFtUXVtLXSB9LFxuICApIHtcbiAgICBjb25zdCBpZCA9IHRoaXMucmVwbHlDYWxsYmFja0lkKytcbiAgICByZXR1cm4gbmV3IFByb21pc2U8UmVxdWVzdFJlcGx5TWFwW1RdPigocmVzb2x2ZSkgPT4ge1xuICAgICAgdGhpcy5yZXBseUNhbGxiYWNrcy5zZXQoaWQsIHtcbiAgICAgICAgcmVxdWVzdDogcmVxdWVzdCxcbiAgICAgICAgY2FsbGJhY2s6IChyZXN1bHQ6IFJlcXVlc3RSZXBseU1hcFtUXSkgPT4ge1xuICAgICAgICAgIHRoaXMucmVwbHlDYWxsYmFja3MuZGVsZXRlKGlkKVxuICAgICAgICAgIHJlc29sdmUocmVzdWx0KVxuICAgICAgICB9LFxuICAgICAgfSBhcyBSZXBseUNhbGxiYWNrU3RydWN0PFQ+KVxuICAgICAgY29uc3QgbmV3YXJncyA9IE9iamVjdC5hc3NpZ24oeyBpZCB9LCBhcmdzKVxuICAgICAgdGhpcy5fZWxlbWVudC5zZW5kPFQ+KHJlcXVlc3QsIG5ld2FyZ3MpXG4gICAgfSlcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlU3R5bGVzKCkge1xuICAgIGNvbnN0IHN0eWxlczogc3RyaW5nW10gPSBbXVxuICAgIGZvciAoY29uc3Qgc2Ugb2YgYXRvbS5zdHlsZXMuZ2V0U3R5bGVFbGVtZW50cygpKSB7XG4gICAgICBzdHlsZXMucHVzaChzZS5pbm5lckhUTUwpXG4gICAgfVxuICAgIHRoaXMuX2VsZW1lbnQuc2VuZDwnc3R5bGUnPignc3R5bGUnLCB7IHN0eWxlcyB9KVxuICB9XG59XG4iXX0=