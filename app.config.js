module.exports = ({ config }) => {
  // Native builds have no dev server, so relative /api calls need the deployed API's origin.
  const origin = process.env.EXPO_ROUTER_ORIGIN;
  const plugins = (config.plugins ?? []).map((plugin) =>
    origin && plugin === "expo-router" ? ["expo-router", { origin }] : plugin,
  );

  // Sideloadable Android release: one CPU architecture (each one adds ~70 MB of native libraries) and R8 shrinking.
  if (process.env.ROAM_SLIM_ANDROID === "1") {
    plugins.push([
      "expo-build-properties",
      {
        android: {
          buildArchs: ["arm64-v8a"],
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          // Stripe's optional push provisioning module is not bundled; R8 fails on its references otherwise.
          extraProguardRules:
            "-dontwarn com.stripe.android.pushProvisioning.**",
        },
      },
    ]);
  }

  return {
    ...config,
    plugins,
    extra: {
      ...config.extra,
      posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
      posthogHost: process.env.POSTHOG_HOST,
    },
  };
};
