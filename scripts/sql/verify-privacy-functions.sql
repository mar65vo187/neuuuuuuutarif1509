-- Prüft die Datenschutz-Funktionen aus Migration 0026 gegen eine echte Datenbank.
-- Läuft vollständig in einer Transaktion und wird am Ende zurückgerollt:
-- Es bleiben keine Testdaten zurück. Jede Abweichung bricht mit Fehler ab.
BEGIN;

DO $$
DECLARE
  prov integer;
  c1 integer; c2 integer; c3 integer;
  l1 integer; l2 integer; l3 integer; l4 integer; l5 integer; l6 integer;
  o1 integer;
  result jsonb;
  failed boolean;
  expired integer[];
BEGIN
  INSERT INTO providers (name, category) VALUES ('Testanbieter Privacy', 'energie') RETURNING id INTO prov;

  INSERT INTO leads (name, email, phone, message, status, tags, meta)
    VALUES ('Max Muster', 'max@example.test', '+49 170 1', 'Bitte Rückruf', 'abgeschlossen', '{vip}', '{"utmSource":"x"}') RETURNING id INTO l1;
  INSERT INTO leads (name, email, status) VALUES ('Max Zweitanfrage', 'max2@example.test', 'in_beratung') RETURNING id INTO l2;
  INSERT INTO leads (name, email, status) VALUES ('Gemeinsamer Lead', 'shared@example.test', 'abgeschlossen') RETURNING id INTO l3;

  INSERT INTO customers (customer_number, type, first_name, last_name, email, phone, street, city, date_of_birth, tags, created_from_lead_id)
    VALUES ('TEST-PRIV-1', 'private', 'Max', 'Muster', 'max@example.test', '+49 170 1', 'Weg 1', 'Wiesbaden', '1990-01-01', '{vip}', l1) RETURNING id INTO c1;
  INSERT INTO customers (customer_number, first_name, email) VALUES ('TEST-PRIV-2', 'Erika', 'erika@example.test') RETURNING id INTO c2;
  INSERT INTO customers (customer_number, first_name, email) VALUES ('TEST-PRIV-3', 'Blockiert', 'block@example.test') RETURNING id INTO c3;

  INSERT INTO customer_lead_links (customer_id, lead_id) VALUES (c1, l2), (c2, l3);
  INSERT INTO lead_notes (lead_id, body, kind) VALUES (l1, 'Max hat zwei Kinder', 'note'), (l3, 'Gemeinsame Notiz', 'note');
  INSERT INTO tasks (entity_type, entity_id, type, title, description, priority, status)
    VALUES ('lead', l1, 'crm_follow_up', 'Lead nachfassen: Max Muster', 'Tel 0170', 'normal', 'open'),
           ('customer', c1, 'crm_follow_up', 'Max Muster anrufen', NULL, 'normal', 'open');
  INSERT INTO customer_activities (customer_id, type, direction, outcome, note) VALUES (c1, 'call', 'outbound', 'reached', 'Max erzählt von Umzug');
  INSERT INTO customer_consents (customer_id, purpose, granted, source, proof) VALUES (c1, 'phone_marketing', true, 'call', '{"ip":"1.2.3.4"}');
  INSERT INTO audit_events (action, entity_type, entity_id, new_values) VALUES ('customer.updated', 'customer', c1::text, '{"email":"max@example.test"}');
  INSERT INTO audit_events (action, entity_type, entity_id, new_values) VALUES ('customer.updated', 'customer', c2::text, '{"email":"erika@example.test"}');
  INSERT INTO orders (order_number, customer_id, lead_id, provider_id, status, expected_commission)
    VALUES ('TEST-ORD-1', c1, l1, prov, 'active', 120) RETURNING id INTO o1;
  INSERT INTO orders (order_number, customer_id, provider_id, status) VALUES ('TEST-ORD-3', c3, prov, 'submitted');
  -- Lead l3 gehört Kunde 2, taucht aber auch in einem Auftrag von Kunde 1 auf.
  INSERT INTO orders (order_number, customer_id, lead_id, provider_id, status) VALUES ('TEST-ORD-1B', c1, l3, prov, 'cancelled');

  -- 1. Blocker verhindern die Anonymisierung.
  IF cardinality(tarifwerk_customer_erasure_blockers(c3)) <> 1 THEN
    RAISE EXCEPTION 'Blocker für laufenden Auftrag nicht erkannt';
  END IF;
  failed := false;
  BEGIN
    PERFORM tarifwerk_anonymize_customer(c3);
  EXCEPTION WHEN SQLSTATE 'P0004' THEN failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'Anonymisierung trotz Blocker ausgeführt'; END IF;
  IF (SELECT first_name FROM customers WHERE id = c3) <> 'Blockiert' THEN
    RAISE EXCEPTION 'Blockierter Kunde wurde verändert';
  END IF;

  -- 2. Kunde 1 anonymisieren.
  IF cardinality(tarifwerk_customer_erasure_blockers(c1)) <> 0 THEN
    RAISE EXCEPTION 'Aktiver (abgeschlossener) Auftrag darf nicht blockieren';
  END IF;
  result := tarifwerk_anonymize_customer(c1);
  IF (result->>'leads')::int <> 2 THEN RAISE EXCEPTION 'Erwartet 2 anonymisierte Leads, erhalten %', result; END IF;

  IF EXISTS (SELECT 1 FROM customers WHERE id = c1 AND (
      first_name <> 'Anonymisiert' OR last_name IS NOT NULL OR email IS NOT NULL OR phone IS NOT NULL
      OR street IS NOT NULL OR city IS NOT NULL OR date_of_birth IS NOT NULL OR tags <> '{}'
      OR metadata->>'anonymizedAt' IS NULL OR archived_at IS NULL OR customer_number <> 'TEST-PRIV-1')) THEN
    RAISE EXCEPTION 'Kundendaten nicht vollständig anonymisiert';
  END IF;
  IF EXISTS (SELECT 1 FROM leads WHERE id IN (l1, l2) AND (name <> 'Anonymisiert' OR email <> '' OR phone IS NOT NULL OR message IS NOT NULL OR meta->>'anonymizedAt' IS NULL)) THEN
    RAISE EXCEPTION 'Eigene Leads nicht anonymisiert';
  END IF;
  IF (SELECT name FROM leads WHERE id = l3) <> 'Gemeinsamer Lead' THEN
    RAISE EXCEPTION 'Lead eines anderen Kunden wurde anonymisiert';
  END IF;
  IF (SELECT body FROM lead_notes WHERE lead_id = l3) <> 'Gemeinsame Notiz' THEN
    RAISE EXCEPTION 'Notiz eines fremden Leads verändert';
  END IF;
  IF EXISTS (SELECT 1 FROM lead_notes WHERE lead_id = l1 AND body <> '[anonymisiert]') THEN RAISE EXCEPTION 'Lead-Notiz nicht anonymisiert'; END IF;
  IF EXISTS (SELECT 1 FROM tasks WHERE title LIKE '%Max%' OR description LIKE '%0170%') THEN RAISE EXCEPTION 'Aufgabe enthält noch personenbezogene Daten'; END IF;
  IF (SELECT note FROM customer_activities WHERE customer_id = c1) <> '' THEN RAISE EXCEPTION 'Aktivitätsnotiz nicht geleert'; END IF;
  IF (SELECT proof FROM customer_consents WHERE customer_id = c1) IS NULL THEN RAISE EXCEPTION 'Einwilligungsnachweis (§ 7a UWG) darf nicht gelöscht werden'; END IF;
  IF (SELECT granted FROM customer_consents WHERE customer_id = c1) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Einwilligungsnachweis verloren'; END IF;
  IF (SELECT new_values FROM audit_events WHERE entity_type = 'customer' AND entity_id = c1::text) IS NOT NULL THEN RAISE EXCEPTION 'Audit-Nutzdaten nicht bereinigt'; END IF;
  IF (SELECT new_values FROM audit_events WHERE entity_type = 'customer' AND entity_id = c2::text) IS NULL THEN RAISE EXCEPTION 'Fremdes Audit-Ereignis bereinigt'; END IF;
  IF (SELECT expected_commission FROM orders WHERE id = o1) <> 120 OR (SELECT status FROM orders WHERE id = o1) <> 'active' THEN
    RAISE EXCEPTION 'Auftrag/Provision wurde verändert';
  END IF;

  -- 3. Zweiter Aufruf wird abgelehnt.
  failed := false;
  BEGIN
    PERFORM tarifwerk_anonymize_customer(c1);
  EXCEPTION WHEN SQLSTATE 'P0003' THEN failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'Doppelte Anonymisierung nicht erkannt'; END IF;

  -- 4. Speicherbegrenzung.
  INSERT INTO leads (name, email, status, created_at, updated_at) VALUES ('Alt', 'alt@example.test', 'neu', now() - interval '30 months', now() - interval '30 months') RETURNING id INTO l4;
  INSERT INTO leads (name, email, status, created_at, updated_at) VALUES ('Neu', 'neu@example.test', 'neu', now() - interval '2 months', now() - interval '2 months') RETURNING id INTO l5;
  INSERT INTO leads (name, email, status, created_at, updated_at) VALUES ('Alt mit Auftrag', 'auftrag@example.test', 'verloren', now() - interval '30 months', now() - interval '30 months') RETURNING id INTO l6;
  INSERT INTO orders (order_number, customer_id, lead_id, provider_id, status) VALUES ('TEST-ORD-6', c2, l6, prov, 'cancelled');

  SELECT array_agg(id) INTO expired FROM tarifwerk_expired_lead_ids(24) AS t(id) WHERE id IN (l4, l5, l6);
  IF expired IS DISTINCT FROM ARRAY[l4] THEN RAISE EXCEPTION 'Löschfrist falsch berechnet: %', expired; END IF;
  IF EXISTS (SELECT 1 FROM tarifwerk_expired_lead_ids(0)) THEN RAISE EXCEPTION 'Frist 0 muss deaktivieren'; END IF;
  IF tarifwerk_anonymize_leads(ARRAY[l4]) <> 1 THEN RAISE EXCEPTION 'Abgelaufener Lead nicht anonymisiert'; END IF;
  IF tarifwerk_anonymize_leads(ARRAY[l4]) <> 0 THEN RAISE EXCEPTION 'Lead doppelt anonymisiert'; END IF;
  IF EXISTS (SELECT 1 FROM tarifwerk_expired_lead_ids(24) AS t(id) WHERE id = l4) THEN RAISE EXCEPTION 'Anonymisierter Lead erneut fällig'; END IF;

  RAISE NOTICE 'Datenschutz-Funktionen: alle Prüfungen bestanden.';
END $$;

ROLLBACK;
