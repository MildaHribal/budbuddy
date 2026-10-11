-- Czech titles/descriptions for existing challenges. Idempotent; run after the wave-2 migration.
update public.challenges set
  title_cs = 'Moje první pěstování',
  description_cs = 'Ukaž nám rostlinu, se kterou to všechno začalo – tvoje první pěstování, nebo to, které máš rozjeté právě teď. Sazenička, monstrum nebo šťastná náhoda: přidej jednu fotku a napiš, co tě to naučilo.'
where slug = 'first-grow-2026-10';
