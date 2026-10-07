export const LEGAL_INFO = {
    siteName: "Minecraft Stats",
    ownerName: "Flash303",
    contactEmail: "flash303mc@gmail.com",
    hostName: "OVH SAS (société par actions simplifiée au capital de 50 000 000 €, RCS Lille Métropole 424 761 419 00045, TVA FR 22 424 761 419)",
    hostAddress: "2 rue Kellermann, 59100 Roubaix, France",
    hostPhone: "+33 9 72 10 10 10",
    hostWebsite: "https://www.ovhcloud.com/fr/",
    country: "France",
    lastUpdated: "2026-10-07",
} as const

export const legalReplacements: Record<string, string> = {
    siteName: LEGAL_INFO.siteName,
    ownerName: LEGAL_INFO.ownerName,
    contactEmail: LEGAL_INFO.contactEmail,
    hostName: LEGAL_INFO.hostName,
    hostAddress: LEGAL_INFO.hostAddress,
    hostPhone: LEGAL_INFO.hostPhone,
    hostWebsite: LEGAL_INFO.hostWebsite,
    date: LEGAL_INFO.lastUpdated,
}
