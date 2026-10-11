-- Badge copy as "how to earn", gender-neutral Czech.
update public.badges set desc_en = v.en, desc_cs = v.cs, name_cs = coalesce(v.name_cs, badges.name_cs) from (values
  ('challenger', 'Enter a monthly challenge.', 'Zapoj se do měsíční výzvy.', null),
  ('first_answer', 'Get one of your answers marked as the best.', 'Získej první odpověď označenou jako nejlepší.', null),
  ('first_post', 'Share your first post with the community.', 'Sdílej svůj první příspěvek s komunitou.', null),
  ('diary_keeper', 'Post 6 weekly updates on one plant.', 'Přidej 6 týdenních zápisů k jedné rostlině.', null),
  ('first_harvest', 'Share a plant with its dry harvest weight.', 'Sdílej rostlinu i se suchou váhou sklizně.', null),
  ('tip_master', 'Write a tip that 10 growers find helpful.', 'Napiš tip, který pomůže aspoň 10 pěstitelům.', null),
  ('veteran', 'Stay part of the community for a year.', 'Buď v komunitě celý rok.', null),
  ('welcome', 'Answer 3 posts from first-time growers.', 'Odpověz na 3 příspěvky začínajících pěstitelů.', 'Uvítací výbor'),
  ('challenge_winner', 'Finish in the top 3 of a challenge.', 'Skonči v první trojici výzvy.', null),
  ('helper_10', 'Get 10 answers marked as the best.', 'Získej 10 odpovědí označených jako nejlepší.', null)
) as v(id, en, cs, name_cs)
where badges.id = v.id;
