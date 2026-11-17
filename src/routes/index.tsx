import { createFileRoute } from "@tanstack/react-router";
import { WhoSaidGame } from "@/components/who-said-game";

export const Route = createFileRoute("/")({ component: WhoSaidGame });
