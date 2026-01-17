/**
 * Web base URL configuration for legal documents and other web content.
 * 
 * Set EXPO_PUBLIC_WEB_BASE_URL in your environment:
 * - Local dev: http://<LAN_IP>:3000 (e.g., http://192.168.68.107:3000)
 * - Production: https://papayal.app
 */
export const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_BASE_URL ?? "https://papayal.app";

/**
 * Constructs a full URL for a legal document path.
 * @param path - The legal document path (e.g., "/legal/terminos")
 * @returns The full URL
 */
export const legalUrl = (path: string): string => {
  const base = WEB_BASE_URL.replace(/\/$/, ""); // Remove trailing slash
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

