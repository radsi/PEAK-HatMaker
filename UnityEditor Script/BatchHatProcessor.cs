using UnityEngine;
using UnityEditor;
using UnityEditor.Build.Pipeline;
using System.IO;
using System.Globalization;
using System.Collections.Generic;

public class BatchHatProcessor
{
    public static void ProccessFromCLI()
    {
        string[] args = System.Environment.GetCommandLineArgs();

        string inputFileName = Path.GetFileName(args[6]);
        string uploadsFolder = "Assets/Uploads/";

        string nameBase = System.DateTime.Now.ToString("yyyyMMddHHmmss");

        string inputPath = Path.Combine(uploadsFolder, inputFileName);
        Vector3 userOffset = ParseVector3(args[7]);
        Vector3 userRotation = ParseVector3(args[8]);
        float userScale = float.Parse(args[9], CultureInfo.InvariantCulture);
        string textureName = args[10].Trim('"');
        string iconName = args[11].Trim('"');

        AssetDatabase.Refresh();
        Debug.Log(inputPath);
        GameObject original = AssetDatabase.LoadAssetAtPath<GameObject>(inputPath);
        GameObject instance = PrefabUtility.InstantiatePrefab(original) as GameObject;
        instance.name = nameBase;

        instance.transform.position = new Vector3(userOffset.x, userOffset.y, userOffset.z);
        instance.transform.eulerAngles = new Vector3(userRotation.x, userOffset.y, userRotation.z);
        instance.transform.localScale = new Vector3(userScale, userScale, userScale);

        if (!string.IsNullOrEmpty(textureName))
        {
            string texturePath = Path.Combine(uploadsFolder, textureName);
            Texture2D texture = AssetDatabase.LoadAssetAtPath<Texture2D>(texturePath);
            if (texture != null)
            {
                texture.name = $"{nameBase}_texture";
                SetTextureFilterModeToPoint(texturePath);
                ApplyTextureToModel(instance, texture);
            }
            else
            {
                Debug.LogWarning("Texture not found at " + texturePath);
            }
        }

        string prefabPath = Path.Combine(uploadsFolder, $"{nameBase}.prefab");
        PrefabUtility.SaveAsPrefabAsset(instance, prefabPath);
        Object.DestroyImmediate(instance);

        if (!string.IsNullOrEmpty(iconName))
        {
            string iconSourcePath = Path.Combine(uploadsFolder, iconName);
            string extension = Path.GetExtension(iconName);
            string iconDestPath = Path.Combine(uploadsFolder, $"{nameBase}_icon{extension}");

            if (File.Exists(iconSourcePath))
            {
                File.Copy(iconSourcePath, iconDestPath, true);
                AssetDatabase.ImportAsset(iconDestPath);
                SetTextureFilterModeToPoint(iconDestPath);
            }
            else
            {
                Debug.LogWarning("Icon not found at " + iconSourcePath);
            }
        }

        // Limpia nombres antiguos de AssetBundle
        foreach (var oldName in AssetDatabase.GetAllAssetBundleNames())
        {
            AssetDatabase.RemoveAssetBundleName(oldName, true);
        }

        // Prepara lista de assets a incluir en el bundle, solo los que existen
        List<string> assetPathsList = new List<string>();
        if (File.Exists(prefabPath))
            assetPathsList.Add(prefabPath);

        string fbxPath = Path.Combine(uploadsFolder, $"{nameBase}.fbx");
        if (File.Exists(fbxPath))
            assetPathsList.Add(fbxPath);

        string pngPath = Path.Combine(uploadsFolder, $"{nameBase}.png");
        if (File.Exists(pngPath))
            assetPathsList.Add(pngPath);

        string iconPath = Path.Combine(uploadsFolder, $"{nameBase}_icon.png");
        if (File.Exists(iconPath))
            assetPathsList.Add(iconPath);

        string bundleName = "hat_" + nameBase;

        // Asigna nombre de AssetBundle a cada asset
        foreach (var assetPath in assetPathsList)
        {
            AssetImporter.GetAtPath(assetPath)?.SetAssetBundleNameAndVariant(bundleName, "");
        }

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();

        // Define configuración para build AssetBundle
        AssetBundleBuild build = new AssetBundleBuild
        {
            assetBundleName = bundleName,
            assetNames = assetPathsList.ToArray()
        };

        // Construye el AssetBundle en StreamingAssets/AssetBundles
        string outputPath = "Assets/StreamingAssets/AssetBundles";
        if (!Directory.Exists(outputPath))
            Directory.CreateDirectory(outputPath);

        BuildPipeline.BuildAssetBundles(outputPath,
            new AssetBundleBuild[] { build },
            BuildAssetBundleOptions.None,
            BuildTarget.StandaloneWindows64);

        Debug.Log("AssetBundle generated correctly.");

        // Limpia carpeta uploads
        foreach (string file in Directory.GetFiles(uploadsFolder))
        {
            File.Delete(file);
        }

        Debug.Log("Uploads folder cleaned.");
    }

    private static void SetTextureFilterModeToPoint(string assetPath)
    {
        Texture2D texture = AssetDatabase.LoadAssetAtPath<Texture2D>(assetPath);
        if (texture != null)
        {
            texture.filterMode = FilterMode.Point;
            EditorUtility.SetDirty(texture);
            AssetDatabase.SaveAssets();
        }
        else
        {
            Debug.LogWarning("Texture not found for filter mode set: " + assetPath);
        }
    }

    private static void ApplyTextureToModel(GameObject obj, Texture2D texture)
    {
        var renderer = obj.GetComponent<Renderer>();
        if (renderer != null)
            renderer.sharedMaterial.mainTexture = texture;
    }

    private static Vector3 ParseVector3(string s)
    {
        string[] parts = s.Trim('[', ']').Split(',');

        if (parts.Length != 3)
            return Vector3.zero;

        return new Vector3(
            float.Parse(parts[0], CultureInfo.InvariantCulture),
            float.Parse(parts[1], CultureInfo.InvariantCulture),
            float.Parse(parts[2], CultureInfo.InvariantCulture)
        );
    }
}
