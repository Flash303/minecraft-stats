CREATE TYPE server_category AS ENUM (
    'survival',
    'creative',
    'faction',
    'skyblock',
    'prison',
    'minigames',
    'bedwars',
    'skywars',
    'rpg',
    'adventure',
    'hardcore',
    'anarchy',
    'smp',
    'pixelmon',
    'citybuild'
);

CREATE TYPE server_language AS ENUM (
    'fr',
    'en',
    'es',
    'de',
    'pt',
    'it',
    'nl',
    'pl',
    'ru',
    'zh',
    'ja',
    'ko',
    'ar',
    'tr'
);

ALTER TABLE servers ADD COLUMN IF NOT EXISTS categories server_category[] NOT NULL DEFAULT '{}';
ALTER TABLE servers ADD COLUMN IF NOT EXISTS languages server_language[] NOT NULL DEFAULT '{}';
