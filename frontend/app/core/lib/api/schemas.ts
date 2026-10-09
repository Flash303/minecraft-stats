import { z } from "zod";
export const UserSchema = z.object({
    id: z.string(),
    username: z.string().nullish().catch(null),
    first_name: z.string().nullish().catch(null),
    last_name: z.string().nullish().catch(null),
    image_url: z.string().nullish().catch(null),
    has_image: z.boolean().catch(false),
});
export type User = z.infer<typeof UserSchema>;

export const ServerRecordSchema = z.object({
    date: z.number(),
    value: z.number(),
});
export type ServerRecord = z.infer<typeof ServerRecordSchema>;

export const ServerSchema = z.object({
    id: z.number(),
    name: z.string(),
    ip: z.string(),
    port: z.number(),
    last_favicon: z.string().nullish().catch(null),
    last_status: z.enum(["online", "offline"]).nullish().catch(null),
    last_connected: z.number().nullish().catch(null),
    max_players: z.number().nullish().catch(null),
    last_max_players: z.number().nullish().catch(null),
    last_version: z.string().nullish().catch(null),
    last_motd: z.any(),
    last_ping_time: z.number().nullish().catch(null),
    last_sample: z.string().nullish().catch(null),
    last_protocol_version: z.number().nullish().catch(null),
    user_id: z.string(),
    user: UserSchema.nullish().catch(null),
    type: z.enum(["java", "bedrock"]).nullish().catch(undefined),
    hidden: z.boolean().nullish().catch(undefined),
    registered_date: z.number().nullish().catch(undefined),
    data: z.array(ServerRecordSchema).nullish().catch(undefined),
    client_infos: z.any().nullish().catch(undefined),
});
export type Server = z.infer<typeof ServerSchema>;

export const AlertSchema = z.object({
    id: z.number(),
    user_id: z.string(),
    server_id: z.number(),
    alert_type: z.enum(["status_to_offline", "status_to_online", "player_above", "player_below"]),
    player_threshold: z.number().nullish().catch(null),
    is_active: z.boolean().catch(true),
    created_at: z.unknown(),
});
export type Alert = z.infer<typeof AlertSchema>;
