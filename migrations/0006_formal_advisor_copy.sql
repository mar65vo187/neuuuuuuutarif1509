UPDATE advisors
SET quote = 'Ich möchte, dass Sie nach unserem Gespräch verstehen, welche Möglichkeiten Sie haben und warum ein nächster Schritt sinnvoll ist – oder eben nicht.'
WHERE slug = 'marvin-egenolf'
  AND quote IS DISTINCT FROM 'Ich möchte, dass Sie nach unserem Gespräch verstehen, welche Möglichkeiten Sie haben und warum ein nächster Schritt sinnvoll ist – oder eben nicht.';
