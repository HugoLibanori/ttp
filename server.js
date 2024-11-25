const express = require("express");
const { createCanvas, loadImage, registerFont } = require("canvas");
const fs = require("fs");
const path = require("path");
const GIFEncoder = require("gifencoder");
const twemoji = require("twemoji");

const app = express();
const port = 3001;

registerFont(path.join(__dirname, "./fonts/impact.ttf"), { family: "impact" });

const loadEmoji = async (char) => {
  const codePoint = twemoji.convert.toCodePoint(char);
  if (codePoint.length > 4) {
    try {
      const url = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codePoint}.png`;
      const image = await loadImage(url);
      return image;
    } catch (error) {
      console.log(`Erro ao carregar o emoji: ${char}, URL: ${error.message}`);
      return null;
    }
  } else {
    return null;
  }
};

export const textoParaFoto = async (texto) => {
  try {
    const canvas = createCanvas(512, 512);
    const ctx = canvas.getContext("2d");
    const fontColor = "white";

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0, 0, 0, 0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "left"; // Alinhamento horizontal
    ctx.textBaseline = "top"; // Garantir que o texto comece do topo de cada linha
    ctx.lineJoin = "round";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 8; // Borda maior

    const maxFontSize = 200;
    const minFontSize = 20;
    const margin = 40;
    const letterSpacing = 2; // Espaçamento entre letras

    let fontSize = maxFontSize;
    const words = texto.split(" ");
    let textFits = false;
    let lines = [];

    // Ajustar o tamanho da fonte para caber no canvas
    while (!textFits && fontSize >= minFontSize) {
      ctx.font = `${fontSize}px 'impact'`;

      lines = [];
      let currentLine = "";

      for (let word of words) {
        const testLine = currentLine + word + " ";
        const testWidth =
          ctx.measureText(testLine).width +
          (testLine.length - 1) * letterSpacing;

        if (testWidth > canvas.width - margin * 2) {
          lines.push(currentLine.trim());
          currentLine = word + " ";
        } else {
          currentLine = testLine;
        }
      }

      lines.push(currentLine.trim());

      const totalTextHeight = lines.length * (fontSize * 1.2);

      // Verificar se o texto cabe verticalmente
      if (totalTextHeight <= canvas.height - margin * 2) {
        textFits = true;
      } else {
        fontSize--; // Reduzir o tamanho da fonte se não couber
      }
    }

    const lineHeight = fontSize * 1.2; // Espaçamento entre as linhas ajustado
    const startY = (canvas.height - lines.length * lineHeight) / 2; // Centralizar verticalmente

    ctx.fillStyle = fontColor;
    ctx.font = `${fontSize}px 'impact'`;

    // Desenhar o texto no canvas, linha por linha
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineY = startY + i * lineHeight;

      // Centralizar cada linha horizontalmente
      let totalLineWidth = 0;

      // Calcular a largura total da linha (considerando emojis e texto)
      for (let char of line) {
        if (/\p{Emoji}/u.test(char)) {
          totalLineWidth += fontSize; // Emojis têm o tamanho da fonte
        } else {
          totalLineWidth += ctx.measureText(char).width + letterSpacing;
        }
      }

      let x = (canvas.width - totalLineWidth) / 2; // Centralizar a linha

      // Agora desenhar a linha
      for (let char of line) {
        if (/\p{Emoji}/u.test(char)) {
          const emojiImg = await loadEmoji(char);
          if (emojiImg) {
            // Ajustar o deslocamento vertical do emoji para centralizá-lo em relação ao texto
            const emojiY = lineY + fontSize * 0.1; // Pequeno ajuste para centralizar na altura do texto

            ctx.drawImage(
              emojiImg,
              x,
              emojiY, // Agora ajusta a posição y para centralizar o emoji verticalmente
              fontSize,
              fontSize
            );
            x += fontSize + letterSpacing; // Avançar o x pelo tamanho do emoji mais o espaçamento
          } else {
            // Se o emoji não for carregado, desenhá-lo como texto
            ctx.strokeText(char, x, lineY);
            ctx.fillText(char, x, lineY);
            x += ctx.measureText(char).width + letterSpacing;
          }
        } else {
          // Primeiro desenha o contorno do texto
          ctx.strokeText(char, x, lineY);
          // Agora preenche o texto por cima, para evitar sobreposição do contorno
          ctx.fillText(char, x, lineY);
          x += ctx.measureText(char).width + letterSpacing; // Avançar o x com base no tamanho da letra e o espaçamento
        }
      }
    }

    const imageBase64 = canvas.toBuffer("image/png");
    return imageBase64;
  } catch (err) {
    console.log(err.message, "STICKER textoParaFoto");
    throw new Error("Erro na conversão de texto para imagem.");
  }
};

export const textoParaWebp = async (texto) => {
  try {
    const output = path.resolve("animated.webp");
    registerFont("./fonts/impact.ttf", { family: "impact" });
    const encoder = new GIFEncoder(512, 512);
    const canvas = createCanvas(512, 512);
    const ctx = canvas.getContext("2d");

    // Configurar o encoder para gerar um GIF
    const stream = encoder.createReadStream();
    const writeStream = fs.createWriteStream(output);
    stream.pipe(writeStream);

    encoder.start();
    encoder.setRepeat(0); // Loop infinito
    encoder.setDelay(200); // Tempo de delay entre frames (em milissegundos)
    encoder.setQuality(10); // Qualidade do GIF
    encoder.setTransparent("#0x00000000");

    const colors = [
      "red",
      "orange",
      "yellow",
      "green",
      "blue",
      "indigo",
      "violet",
    ];

    const words = texto.split(" ");
    let fontSize = 200;
    let minFontSize = 20;
    let margin = 30;

    let textFits = false;
    let lines = [];

    // Ajustar o tamanho da fonte até que o texto caiba
    while (!textFits && fontSize >= minFontSize) {
      ctx.font = `${fontSize}px 'impact'`;

      lines = [];
      let currentLine = "";

      words.forEach((word) => {
        const testLine = currentLine + " " + word;
        const testWidth = ctx.measureText(testLine).width;

        if (testWidth > canvas.width - margin * 2) {
          lines.push(currentLine.trim());
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });

      lines.push(currentLine.trim());

      const totalTextHeight = lines.length * (fontSize * 1.2); // altura total do texto
      if (totalTextHeight <= canvas.height - margin * 2) {
        textFits = true;
      } else {
        fontSize--;
      }
    }

    const lineHeight = fontSize * 1.2;

    // Ajustar a posição Y para centralizar o texto
    const startY = (canvas.height - lines.length * lineHeight) / 2;

    // Desenhar as linhas de texto
    for (const color of colors) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      // ctx.lineWidth = 8;
      // ctx.strokeStyle = "black";
      ctx.fillStyle = color;
      ctx.font = `${fontSize}px impact`;

      // Desenhar cada linha
      lines.forEach((line, index) => {
        const lineY = startY + index * lineHeight; // Calcula a posição Y de cada linha
        ctx.strokeText(line, canvas.width / 2, lineY + ctx.lineWidth / 2);
        ctx.fillText(line, canvas.width / 2, lineY + ctx.lineWidth / 2);
      });

      encoder.addFrame(ctx);
    }

    encoder.finish();

    return new Promise((resolve, reject) => {
      writeStream.on("finish", () => {
        const buffer = fs.readFileSync(output);
        fs.unlinkSync(output);
        resolve(buffer);
      });
      writeStream.on("error", (err) => {
        reject(new Error("Erro na gravação do arquivo WebP."));
      });
    });
  } catch (err) {
    console.log(err, "Erro na conversão de texto para WebP.");
    throw new Error("Erro na conversão de texto para WebP.");
  }
};

// const validApiKeys = ["OWUBDish$&&¨%$#@%78739389ajdThekYH$%$@#"];

// function validarApiKey(req, res, next) {
//   const apikey = req.query.apikey;

//   if (!apikey) {
//     return res.status(400).send("A chave de API (apikey) é obrigatória.");
//   }

//   if (!validApiKeys.includes(apikey)) {
//     return res.status(403).send("Chave de API inválida.");
//   }

//   next();
// }

app.get("/ttp", async (req, res) => {
  const { texto } = req.query;

  if (!texto) {
    return res.status(400).send('O parâmetro "texto" é obrigatório.');
  }

  try {
    const imageBuffer = await textoParaFoto(texto);
    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": imageBuffer.length,
    });
    res.end(imageBuffer);
  } catch (err) {
    res.status(500).send("Erro na conversão de texto para imagem.");
  }
});

app.get("/attp", async (req, res) => {
  const { texto } = req.query;

  if (!texto) {
    return res.status(400).send('O parâmetro "texto" é obrigatório.');
  }

  try {
    const imageBuffer = await textoParaWebp(texto);
    res.writeHead(200, {
      "Content-Type": "image/webp",
      "Content-Length": imageBuffer.length,
    });
    res.end(imageBuffer);
  } catch (err) {
    res.status(500).send("Erro na conversão de texto para imagem.");
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
