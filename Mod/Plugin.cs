using System;
using System.IO;
using System.Collections.Generic;
using BepInEx;
using HarmonyLib;
using UnityEngine;
using Zorro.Core;

namespace HatLoader
{
    [BepInPlugin("radsi.hatloader", "HatLoader", "1.0.0")]
    public class Plugin : BaseUnityPlugin
    {
        public static List<GameObject> loadedHats = new List<GameObject>();
        public static List<Texture2D> loadedIcons = new List<Texture2D>();
        public static Texture2D defaultHatIcon = new Texture2D(2, 2);

        private class Patcher
        {
            public static bool CreateHatOption(Customization customization, string name, Texture2D icon)
            {
                if (Array.Exists(customization.hats, hat => hat.name == name)) return false;
                var hatOption = ScriptableObject.CreateInstance<CustomizationOption>();
                hatOption.color = Color.white;
                hatOption.name = name;
                hatOption.texture = icon ?? defaultHatIcon;
                hatOption.type = Customization.Type.Hat;
                hatOption.requiredAchievement = ACHIEVEMENTTYPE.NONE;
                customization.hats = customization.hats.AddToArray(hatOption);
                return true;
            }

            [HarmonyPatch(typeof(PassportManager), "Awake")]
            [HarmonyPostfix]
            public static void PassportManagerAwakePostfix(PassportManager __instance)
            {
                var customization = __instance.GetComponent<Customization>();
                if (loadedHats.Count == 0) return;

                for (int i = 0; i < loadedHats.Count; i++)
                {
                    var hat = loadedHats[i];
                    hat.name = loadedHats[i].name;

                    Texture2D icon = i < loadedIcons.Count ? loadedIcons[i] : defaultHatIcon;

                    CreateHatOption(customization, loadedHats[i].name, icon);
                }
            }

            [HarmonyPatch(typeof(CharacterCustomization), "Awake")]
            [HarmonyPostfix]
            public static void CharacterCustomizationAwakePostfix(CharacterCustomization __instance)
            {
                if (loadedHats.Count == 0) return;

                Transform hatsObject = __instance.transform.GetChild(0).GetChild(0).GetChild(0).GetChild(2)
                    .GetChild(0).GetChild(0).GetChild(1).GetChild(1);

                foreach (var hatPrefab in loadedHats)
                {
                    GameObject newHat = Instantiate(hatPrefab);
                    var meshRenderer = newHat.GetComponent<MeshRenderer>();
                    if (meshRenderer != null)
                        meshRenderer.material.shader = Shader.Find("W/Character");

                    newHat.transform.SetParent(hatsObject, false);
                    newHat.SetActive(false);

                    __instance.refs.playerHats = __instance.refs.playerHats.AddToArray(meshRenderer);
                }
            }
        }

        private string GetNameBase(string assetName)
        {
            if (assetName.EndsWith("_icon", StringComparison.OrdinalIgnoreCase))
                return assetName.Substring(0, assetName.Length - 5);
            return assetName;
        }

        public void Awake()
        {
            new Harmony("radsi.hatloader").PatchAll(typeof(Patcher));

            string bundlesDir = Path.Combine(Paths.PluginPath, "hatsbundles");
            if (!Directory.Exists(bundlesDir))
            {
                Logger.LogError($"Directory not found: {bundlesDir}");
                return;
            }

            string[] bundleFiles = Directory.GetFiles(bundlesDir);
            foreach (var bundlePath in bundleFiles)
            {
                var ab = AssetBundle.LoadFromFile(bundlePath);
                if (ab == null)
                {
                    Logger.LogWarning($"Failed to load AssetBundle: {bundlePath}");
                    continue;
                }

                var hatsInBundle = ab.LoadAllAssets<GameObject>();
                var iconsInBundle = ab.LoadAllAssets<Texture2D>();

                Dictionary<string, Texture2D> iconMap = new Dictionary<string, Texture2D>(StringComparer.OrdinalIgnoreCase);
                foreach (var icon in iconsInBundle)
                {
                    string baseName = GetNameBase(icon.name);
                    if (!iconMap.ContainsKey(baseName))
                        iconMap[baseName] = icon;
                }

                foreach (var hat in hatsInBundle)
                {
                    loadedHats.Add(hat);
                    string hatBaseName = GetNameBase(hat.name);

                    if (iconMap.TryGetValue(hatBaseName, out var matchedIcon))
                        loadedIcons.Add(matchedIcon);
                    else
                        loadedIcons.Add(defaultHatIcon);
                }

                ab.Unload(false);

                Logger.LogInfo($"Loaded from bundle {Path.GetFileName(bundlePath)}: {hatsInBundle.Length} hats, {iconsInBundle.Length} icons");
            }

            Logger.LogInfo($"Total hats loaded: {loadedHats.Count}, Total icons loaded: {loadedIcons.Count}");
        }
    }
}
