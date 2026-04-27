import { useMutation } from "@tanstack/react-query";

export const useSubmitChannelRequest = () => {
  return useMutation({
    mutationFn: async (data: { channelName: string; channelUrl?: string; notes?: string }) => {
      const res = await fetch("/api/channel-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
    },
  });
};
