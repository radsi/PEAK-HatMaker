const express = require("express");
const multer = require("multer");
const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");

const app = express();
const port = 3000;
const upload = multer({ dest: "server/uploads/" });

app.use(express.static("public"));

app.post(
  "/upload",
  upload.fields([
    { name: "model", maxCount: 1 },
    { name: "texture", maxCount: 1 },
    { name: "icon", maxCount: 1 },
  ]),
  (req, res) => {
    const { position, rotation, scale } = req.body;

    if (!req.files || !req.files.model) {
      return res.status(400).send("No model file uploaded");
    }

    const unityProject = "A:/Unity Projects/Peakmodding";
    function copyToUnity(file) {
      const src = path.resolve(file.path);
      const dest = path.join(unityProject, "Assets/Uploads", file.originalname);
      fs.copyFileSync(src, dest);
      return dest;
    }

    const modelUnityPath = copyToUnity(req.files.model[0]);
    const textureUnityPath = req.files.texture
      ? copyToUnity(req.files.texture[0])
      : null;
    const iconUnityPath = req.files.icon
      ? copyToUnity(req.files.icon[0])
      : null;

    const unityArgs = [
      `"${path.basename(modelUnityPath)}"`,
      `"${position}"`,
      `"${rotation}"`,
      `"${scale}"`,
      textureUnityPath ? `"${path.basename(textureUnityPath)}"` : `"undefined"`,
      iconUnityPath ? `"${path.basename(iconUnityPath)}"` : `"undefined"`,
    ].join(" ");

    const unityPath = `"A:/Unity Versions/6000.0.3f1/Editor/Unity.exe"`;

    exec(
      `${unityPath} -batchmode -projectPath "${unityProject}" -executeMethod BatchHatProcessor.ProccessFromCLI ${unityArgs} -quit -logFile server/unity.log`,
      (err) => {
        try {
          Object.values(req.files)
            .flat()
            .forEach((file) => {
              fs.unlinkSync(file.path);
            });
        } catch (e) {
          console.error("Error cleaning temp files:", e);
        }

        if (err) return res.status(500).send("Error generating AssetBundle");

        const bundlePath = path.join(
          unityProject,
          "Assets/StreamingAssets/AssetBundles/hat"
        );
        res.download(bundlePath, "hat", (err) => {
          if (err) console.error("Error sending bundle:", err);
        });
      }
    );
  }
);

app.listen(port, () => {
  console.log(`Servidor running on http://localhost:${port}`);
});
