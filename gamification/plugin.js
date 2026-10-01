// Host bridge retained from sp-dashboard. The UI uses the supported iframe API.
// Stable storage identity; display name is Gamification.
const PLUGIN_ID = "sp-study-rewards";
let refreshTimeout;
const announce = () => {
  clearTimeout(refreshTimeout);
  refreshTimeout = setTimeout(() => {
    document
      .querySelectorAll('iframe[data-plugin-id="' + PLUGIN_ID + '"]')
      .forEach((frame) => {
        frame.contentWindow?.postMessage({ type: "SP_STATE_CHANGED" }, "*");
      });
  }, 250);
};
PluginAPI.registerHook(PluginAPI.Hooks.ACTION, announce);
if (PluginAPI.Hooks.PERSISTED_DATA_CHANGED) {
  PluginAPI.registerHook(PluginAPI.Hooks.PERSISTED_DATA_CHANGED, announce);
}
if (PluginAPI.onUnload) PluginAPI.onUnload(() => clearTimeout(refreshTimeout));
