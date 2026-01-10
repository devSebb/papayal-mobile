import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

const RAW_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

const needsLanHost = (url: string) => url.includes("localhost") || url.includes("127.0.0.1");

const resolveLanHost = () => {
  const fromHostUri = Constants.expoConfig?.hostUri ?? null;
  const fromExpoGo = Constants.expoGoConfig?.debuggerHost ?? null;
  const fromEnv = process.env.EXPO_DEV_SERVER_HOST ?? null;
  const fromScriptUrl = (() => {
    const scriptUrl: string | undefined = NativeModules?.SourceCode?.scriptURL;
    if (!scriptUrl) return null;
    try {
      const u = new URL(scriptUrl);
      return `${u.hostname}:${u.port ?? ""}`;
    } catch {
      return null;
    }
  })();

  const picked = fromHostUri ?? fromExpoGo ?? fromEnv ?? fromScriptUrl;
  if (!picked) return { host: null as string | null, hostUri: null as string | null, source: null as string | null };

  const sanitized = picked.replace(/^exp:\/\//, "").replace(/^https?:\/\//, "");
  const host = sanitized.split(":")[0] ?? null;
  const source =
    fromHostUri
      ? "expoConfig.hostUri"
      : fromExpoGo
        ? "expoGoConfig.debuggerHost"
        : fromEnv
          ? "env.EXPO_DEV_SERVER_HOST"
          : "sourceCode.scriptURL";

  return { host, hostUri: picked, source };
};

const buildApiBase = () => {
  const { host, hostUri, source } = resolveLanHost();
  const shouldSwap =
    (Platform.OS === "ios" || Platform.OS === "android") && needsLanHost(RAW_API_BASE_URL);

  if (shouldSwap && host) {
    const resolved = RAW_API_BASE_URL.replace("localhost", host).replace("127.0.0.1", host);
    return {
      baseUrl: resolved,
      lanHost: host,
      hostUri,
      hostSource: source,
      resolvedFrom: "lan_host"
    };
  }

  return {
    baseUrl: RAW_API_BASE_URL,
    lanHost: host,
    hostUri,
    hostSource: source,
    resolvedFrom: shouldSwap ? "no_host_uri" : "raw"
  };
};

const apiBase = buildApiBase();

export const API_BASE_URL = apiBase.baseUrl;

export const API_BASE_DEBUG = {
  rawBase: RAW_API_BASE_URL,
  ...apiBase
};

