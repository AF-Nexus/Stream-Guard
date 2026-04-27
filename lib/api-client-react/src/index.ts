export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";
export { useUnseenChannelRequests } from "./useUnseenChannelRequests";
export { useSubmitChannelRequest } from "./useSubmitChannelRequest";

import { useQuery, useMutation } from "@tanstack/react-query";

export const useAdminChannelRequests = () => {
  return useQuery({
    queryKey: ["/api/admin/channel-requests"],
    queryFn: async () => {
      const res = await fetch("/api/admin/channel-requests");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
};

export const useUpdateChannelRequest = () => {
  return useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: string; status: "approved" | "rejected"; adminNote?: string }) => {
      const res = await fetch(`/api/admin/channel-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
  });
};

export const useDeleteChannelRequest = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/channel-requests/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
  });
};
