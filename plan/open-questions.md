# Öppna frågor under migreringen (grenen `admin-react-waves`)

Det som behöver användarens beslut, antecknat medan arbetet fortsätter.
Varje punkt: modul, frågan, vad som är gjort i väntan.

## certificates

- **Radera ett certifikat som har innehavare.** Blaze raderade certifikatet
  och lät dess attestationer ligga kvar utan certifikat. Det gör
  `removeCertificate` fortfarande (och tar nu också bort det som
  förkunskapskrav hos andra). Ska radering i stället nekas så länge någon
  har certifikatet? Gjort i väntan: oförändrat beteende.
- **Testinställningar och testförsök kräver rollen admin** (`tests.*`), medan
  resten av certifikaten är admin och board. Board ser testet men kan inte
  byta det och ser inte medlemmars testförsök. Ska board få göra det?
  Gjort i väntan: oförändrat.

