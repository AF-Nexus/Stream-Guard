import { useState } from "react";
import { useGetSettings } from "@workspace/api-client-react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function WhatsAppButton() {
  const { data: settings } = useGetSettings();

  if (!settings?.whatsappNumber) return null;

  const url = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent("Hi, I want to upgrade my Channelzz account.")}`;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            size="icon" 
            className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 shadow-xl shadow-green-500/20 text-white"
            onClick={() => window.open(url, "_blank")}
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="font-medium bg-green-600 text-white border-green-700">
          Upgrade Account
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
