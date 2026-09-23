"use client";

import { useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generatePayments } from "@/app/(dashboard)/platby/actions";
import { formatMonth } from "@/lib/format";

export function GeneratePaymentsButton({ period }: { period: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await generatePayments(period);
          if (res.ok) toast.success(res.count ? `Vytvorených ${res.count} platieb za ${formatMonth(period)}` : "Všetky platby za tento mesiac už existujú");
          else toast.error(res.error);
        })
      }
    >
      <Sparkles /> Vygenerovať platby za {formatMonth(period)}
    </Button>
  );
}
