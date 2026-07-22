# Målsättning: rollöversyn i admin (framtida arbete)

Kort notering om ett större arbete att ta tag i framöver — inte planerat i
detalj ännu.

## Problem

Admin har historiskt haft en liten, fullt betrodd grupp med fulla rättigheter
att se och redigera allt. Gruppen har växt till en styrelse på ~10. Alla är
förtroendevalda och får se all information (GDPR ok), men med fler händer ökar
risken för misstag som förstör data — särskilt eftersom vi saknar
ångra-funktion och saknar logg över vem som gjort vad.

## Mål

Införa differentierade roller i admin efter ansvarsområde, i stället för
dagens "alla eller inget":

- **Läsroll** — majoriteten av styrelsen behöver bara se information.
- **Meddelanden** — några får skicka utskick.
- **Kassör** — hanterar utlägg och ekonomi.
- **Grupper/verkstäder/ytor** — några ansvarar för att underhålla dessa.

## Konsekvenser att hantera

- Dagens modelldrivna admin publicerar hela collections och skriver via
  klient-allow/deny. Rollbegränsning kräver att publiceringar smalnas av per
  roll och att skrivningar begränsas till det respektive roll får ändra.
- Överväg en enkel ändringslogg (vem/vad/när) för spårbarhet.

## Notering

Frikopplat från gruppansvarig-redigeringen, som görs i appen
(`plan/group-responsible-editing.md`) och inte väntar på detta.
