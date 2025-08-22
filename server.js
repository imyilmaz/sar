const http = require("http");
const fs = require("fs");
const path = require("path");

const IMAGE_DIR = path.join(__dirname, "images");
const INDEX_PATH = path.join(__dirname, "index.html");

// index.html dosyasını oluşturma (sadece bir kez)
if (!fs.existsSync(INDEX_PATH)) {
    fs.writeFileSync(INDEX_PATH, `
        <!DOCTYPE html>
        <html lang="en">
        <head>
        </head>
        <body>
        </body>
        </html>
    `);
}

const server = http.createServer((req, res) => {
    if (req.url === "/style.css") {
        // CSS içeriği
        const css = `
            body { margin: 0; padding: 0; }
            html { scroll-behavior: smooth; }
            img { display: block; margin: 0 auto; max-width: 100%; cursor: pointer; }
            label { display: block; position: absolute; left: 0; top: 0; width: 100%; height: 0; opacity: 0; transition: .4s ease-in-out; pointer-events: none; overflow: hidden; }
            input { position: absolute; height: 0; width: 0; opacity: 0; pointer-events: none; top: 0; left: 0; }
        `;
        res.writeHead(200, { "Content-Type": "text/css" });
        res.end(css);
        return;
    }

    if (req.url === "/script.js") {
        // JavaScript içeriği
        const js = `
            let isAnimating = false;
            async function fetchImages() {
                const response = await fetch("/images");
                const images = await response.json();
                generateHTMLAndCSS(images);
            }

            function generateHTMLAndCSS(images) {
                const container = document.createElement("div");
                container.className = "container";

                images.forEach((image, index) => {
                    const input = document.createElement("input");
                    input.type = "radio";
                    input.name = "i";
                    input.id = \`i-\${index + 1}\`;
                    if (index === 0) input.checked = true;

                    const label = document.createElement("label");
                    label.htmlFor = \`i-\${index + 2 > images.length ? 1 : index + 2}\`;
                    label.className = \`i-\${index + 1}\`;

                    label.addEventListener("click", (e) => {
                        if (isAnimating) {
                            e.preventDefault();
                            return;
                        }
                        isAnimating = true;
                        setTimeout(() => {
                            isAnimating = false;
                        }, 500);
                    });

                    const img = document.createElement("img");
                    img.src = \`images/\${image}\`;
                    img.alt = \`Image \${index + 1}\`;
                    label.appendChild(img);

                    container.appendChild(input);
                    container.appendChild(label);
                });

                const style = document.createElement("style");
                let cssText = "";
                images.forEach((_, index) => {
                    cssText += \`
                        input#i-\${index + 1}:checked ~ .i-\${index + 1} {
                            opacity: 1;
                            pointer-events: all;
                            position: relative;
                            height: auto;
                        }
                    \`;
                });
                style.textContent = cssText;

                document.head.appendChild(style);
                document.body.appendChild(container);
            }

            document.addEventListener("DOMContentLoaded", fetchImages);
        `;
        res.writeHead(200, { "Content-Type": "application/javascript" });
        res.end(js);
        return;
    }

    if (req.url === "/images") {
        fs.readdir(IMAGE_DIR, (err, files) => {
            if (err) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Dosyalar okunamadı" }));
                return;
            }

            const images = files.filter(file =>
                file.endsWith(".jpg") || file.endsWith(".jpeg") || file.endsWith(".png")
            );

            images.sort((a, b) => a.localeCompare(b));

            const encodedImages = images.map(file => encodeURIComponent(file));

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(encodedImages));
        });
    } else if (req.url.startsWith("/images/")) {
        const imageName = decodeURIComponent(req.url.replace("/images/", ""));
        const imagePath = path.join(IMAGE_DIR, imageName);

        fs.access(imagePath, fs.constants.F_OK, (err) => {
            if (err) {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end("Görsel bulunamadı");
                return;
            }

            fs.readFile(imagePath, (err, data) => {
                if (err) {
                    res.writeHead(500, { "Content-Type": "text/plain" });
                    res.end("Sunucu hatası");
                    return;
                }

                const ext = path.extname(imagePath).toLowerCase();
                let contentType = "image/jpeg";
                if (ext === ".png") contentType = "image/png";
                else if (ext === ".jpeg") contentType = "image/jpeg";
                else if (ext === ".jpg") contentType = "image/jpg";

                res.writeHead(200, { "Content-Type": contentType });
                res.end(data);
            });
        });
    } else {
        // Başlık için mevcut bir .txt dosyasını kontrol et
        let title = "Kollektif Karga"; // Varsayılan başlık
        const txtFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.txt'));

        if (txtFiles.length > 0) {
            title = path.basename(txtFiles[0], path.extname(txtFiles[0])); // İlk bulunan .txt dosyasının adını al
        }

        // Dinamik index.html oluştur
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
                <link rel="stylesheet" href="/style.css">
            </head>
            <body>
                <script src="/script.js"></script>
            </body>
            </html>`);
    }
});

server.listen(3000, () => {
    console.log("Sunucu 3000 portunda başlatıldı.");
});