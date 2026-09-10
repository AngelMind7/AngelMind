import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../../src/c2/server/routers";

export const trpc = createTRPCReact<AppRouter>();
