import { protectedResourceHandler, metadataCorsOptionsRequestHandler } from "mcp-handler";
import { baseUrl } from "@/lib/domain/config";

export const runtime = "nodejs";

const handler = protectedResourceHandler({
  authServerUrls: [baseUrl()],
  resourceUrl: `${baseUrl()}/api/mcp`,
});

export { handler as GET };
export const OPTIONS = metadataCorsOptionsRequestHandler();
