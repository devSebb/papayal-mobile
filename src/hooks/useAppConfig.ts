import { useQuery } from "@tanstack/react-query";

import { configApi } from "../api/endpoints";

/**
 * Remote app config (public endpoint — works signed out). Failure is
 * non-fatal: consumers must treat missing config as "use local defaults"
 * so a config outage never blocks the app.
 */
export const useAppConfig = () => {
  return useQuery({
    queryKey: ["appConfig"],
    queryFn: configApi.get,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });
};
