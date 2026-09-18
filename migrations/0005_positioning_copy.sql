UPDATE advisors
SET
  title = 'Gründer von TarifWerk',
  region = 'Deutschlandweit',
  regions = ARRAY['Wiesbaden','Mainz','Frankfurt am Main','Worms','Deutschlandweit (digital)'],
  bio = 'Marvin hat TarifWerk gegründet, um mehrere Vertrags-, Versorgungs- und Entscheidungsthemen in einem persönlichen Beratungsprozess zusammenzuführen. Sein Anspruch: relevante Kriterien offen erklären, Empfehlungen nachvollziehbar begründen und danach erreichbar bleiben.',
  quote = 'Ich will, dass du nach unserem Gespräch verstehst, welche Möglichkeiten du hast und warum ein nächster Schritt Sinn ergibt – oder eben nicht.'
WHERE slug = 'marvin-egenolf';
