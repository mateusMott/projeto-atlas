import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ENV } from "../_core/env";
import { publicProcedure, router } from "../_core/trpc";
import {
  ensureAtlasSeed,
  exportAtlasData,
  getActiveCharacters,
  getResearchCounts,
  getResearchInfo,
  lookupResearch,
  saveCharacter,
  softDeleteCharacter,
  type AtlasCharacter,
} from "./service";

function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLocaleLowerCase("en-US") ?? "";
}

const atlasAdminProcedure = publicProcedure.use(({ ctx, next }) => {
  const allowlistedEmail = normalizeEmail(ENV.atlasAdminEmail);
  const authenticatedEmail = normalizeEmail(ctx.user?.email);
  if (
    !ctx.user ||
    ctx.user.role !== "admin" ||
    !allowlistedEmail ||
    authenticatedEmail !== allowlistedEmail
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso administrativo não autorizado.",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const characterSchema = z
  .object({
    id: z.string().min(1).max(128),
    name: z.string().min(1).max(500),
    tier: z.string().max(32),
    universe: z.string().max(500),
    image: z.string().max(8192),
    ranked: z.boolean(),
    aliases: z.array(z.string().max(500)).max(100),
    profile: z.record(z.string(), z.unknown()),
  })
  .passthrough();

const pairInputSchema = z.object({
  firstId: z.string().min(1).max(128),
  secondId: z.string().min(1).max(128),
});
const idSchema = z.object({ id: z.string().min(1).max(128) });

export const atlasRouter = router({
  catalog: publicProcedure.query(async () => {
    await ensureAtlasSeed();
    const [characters, researchInfo, researchCounts] = await Promise.all([
      getActiveCharacters(),
      getResearchInfo(),
      getResearchCounts(),
    ]);
    return { characters, researchInfo, researchCounts };
  }),
  research: router({
    lookup: publicProcedure.input(pairInputSchema).query(async ({ input }) => {
      await ensureAtlasSeed();
      return lookupResearch(input.firstId, input.secondId);
    }),
  }),
  admin: router({
    dashboard: atlasAdminProcedure.query(async () => {
      await ensureAtlasSeed();
      const [characters, researchCounts, researchInfo] = await Promise.all([
        getActiveCharacters(),
        getResearchCounts(),
        getResearchInfo(),
      ]);
      return { characters, researchCounts, researchInfo };
    }),
    saveCharacter: atlasAdminProcedure
      .input(z.object({ character: characterSchema }))
      .mutation(async ({ input }) => {
        await ensureAtlasSeed();
        return saveCharacter(input.character as AtlasCharacter);
      }),
    deleteCharacter: atlasAdminProcedure
      .input(idSchema)
      .mutation(async ({ input }) => {
        await ensureAtlasSeed();
        await softDeleteCharacter(input.id);
        return { success: true } as const;
      }),
    exportData: atlasAdminProcedure.query(async () => {
      await ensureAtlasSeed();
      return exportAtlasData();
    }),
  }),
});
