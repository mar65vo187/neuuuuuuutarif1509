-- Datenschutz-Center: Anonymisierung nach Art. 17 DSGVO und Speicherbegrenzung
-- nach Art. 5 Abs. 1 lit. e DSGVO.
--
-- Grundsätze
-- * Anonymisieren statt Löschen: Zeilen bleiben für Statistik, Provisions-
--   abrechnung und gesetzliche Aufbewahrung (§ 257 HGB, § 147 AO) erhalten,
--   personenbezogene Inhalte werden entfernt.
-- * Aufträge, Provisionen und das unveränderliche Finanzjournal werden nicht
--   verändert; sie verweisen nur noch auf eine anonymisierte Kundennummer.
-- * Die Funktionen laufen in der Transaktion des Aufrufers: Entweder wird alles
--   anonymisiert oder nichts.

-- Leads, die eindeutig zu einem Kunden gehören.
CREATE OR REPLACE FUNCTION tarifwerk_customer_lead_ids(p_customer_id integer)
RETURNS SETOF integer
LANGUAGE sql STABLE AS $$
  SELECT created_from_lead_id FROM customers WHERE id = p_customer_id AND created_from_lead_id IS NOT NULL
  UNION SELECT lead_id FROM customer_lead_links WHERE customer_id = p_customer_id
  UNION SELECT lead_id FROM orders WHERE customer_id = p_customer_id AND lead_id IS NOT NULL
  UNION SELECT referred_lead_id FROM customer_referrals WHERE referred_customer_id = p_customer_id AND referred_lead_id IS NOT NULL
$$;

-- Gründe, die einer Anonymisierung (noch) entgegenstehen. Leeres Array = frei.
CREATE OR REPLACE FUNCTION tarifwerk_customer_erasure_blockers(p_customer_id integer)
RETURNS text[]
LANGUAGE plpgsql STABLE AS $$
DECLARE
  reasons text[] := ARRAY[]::text[];
  n integer;
BEGIN
  SELECT count(*) INTO n FROM orders
    WHERE customer_id = p_customer_id
      AND status IN ('draft', 'documents_missing', 'ready_to_submit', 'submitted', 'provider_review', 'accepted', 'activation_pending');
  IF n > 0 THEN
    reasons := reasons || format('%s Auftrag/Aufträge in Bearbeitung – erst abschließen oder stornieren', n);
  END IF;

  SELECT count(*) INTO n FROM service_cases
    WHERE customer_id = p_customer_id AND status NOT IN ('resolved', 'closed');
  IF n > 0 THEN
    reasons := reasons || format('%s offene(r) Servicefall/-fälle', n);
  END IF;

  SELECT count(*) INTO n FROM optimization_memberships
    WHERE customer_id = p_customer_id AND status IN ('pending', 'active', 'paused');
  IF n > 0 THEN
    reasons := reasons || format('%s laufende Optimierungsservice-Mitgliedschaft(en) – erst kündigen', n);
  END IF;

  RETURN reasons;
END $$;

-- Anonymisiert Leads samt Notizen, Anrufen, Aufgaben und Ereignis-Nutzdaten.
-- Bereits anonymisierte Leads werden übersprungen. Rückgabe: Anzahl.
CREATE OR REPLACE FUNCTION tarifwerk_anonymize_leads(p_lead_ids integer[])
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  ids integer[];
  id_texts text[];
BEGIN
  SELECT coalesce(array_agg(id), ARRAY[]::integer[]) INTO ids
    FROM leads
    WHERE id = ANY(p_lead_ids)
      AND coalesce(meta->>'anonymizedAt', '') = '';
  IF cardinality(ids) = 0 THEN
    RETURN 0;
  END IF;
  id_texts := ARRAY(SELECT unnest(ids)::text);

  UPDATE leads SET
    name = 'Anonymisiert',
    email = '',
    phone = NULL,
    topic = NULL,
    region = NULL,
    situation = NULL,
    message = NULL,
    preferred_channel = NULL,
    preferred_time = NULL,
    confirmed_slot = NULL,
    tags = '{}',
    meta = jsonb_build_object('anonymizedAt', now()),
    updated_at = now()
  WHERE id = ANY(ids);

  UPDATE lead_notes SET body = '[anonymisiert]' WHERE lead_id = ANY(ids);
  UPDATE lead_call_activities SET note = '' WHERE lead_id = ANY(ids);
  UPDATE lead_product_links SET note = '' WHERE lead_id = ANY(ids);
  UPDATE tasks SET title = 'Vorgang (anonymisiert)', description = NULL
    WHERE entity_type = 'lead' AND entity_id = ANY(ids);
  UPDATE document_records SET file_name = 'anonymisiert'
    WHERE entity_type = 'lead' AND entity_id = ANY(ids);
  UPDATE prospect_contacts SET
    name = 'Anonymisiert', email = '', phone = NULL, normalized_email = NULL, normalized_phone = NULL,
    region = NULL, topic = NULL, note = '', tags = '{}', updated_at = now()
  WHERE converted_lead_id = ANY(ids);

  UPDATE audit_events SET old_values = NULL, new_values = NULL
    WHERE entity_type = 'lead' AND entity_id = ANY(id_texts);
  UPDATE outbox_events SET payload = '{}'::jsonb
    WHERE entity_type = 'lead' AND entity_id = ANY(id_texts);
  UPDATE notification_queue SET subject = 'Anonymisierter Vorgang', body = '', metadata = '{}'::jsonb
    WHERE entity_type = 'lead' AND entity_id = ANY(id_texts);
  UPDATE automation_runs SET detail = NULL
    WHERE entity_type = 'lead' AND entity_id = ANY(id_texts);

  RETURN cardinality(ids);
END $$;

-- Anonymisiert einen Kunden vollständig. Wirft einen Fehler, wenn Blocker
-- bestehen oder der Kunde bereits anonymisiert ist. Rückgabe: Zählwerte.
CREATE OR REPLACE FUNCTION tarifwerk_anonymize_customer(p_customer_id integer)
RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  customer_row customers%ROWTYPE;
  blockers text[];
  lead_ids integer[];
  order_ids integer[];
  case_ids integer[];
  lead_count integer;
  document_count integer;
  cid text := p_customer_id::text;
BEGIN
  SELECT * INTO customer_row FROM customers WHERE id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'tarifwerk_privacy: Kunde % nicht gefunden', p_customer_id USING ERRCODE = 'P0002';
  END IF;
  IF coalesce(customer_row.metadata->>'anonymizedAt', '') <> '' THEN
    RAISE EXCEPTION 'tarifwerk_privacy: Kunde % ist bereits anonymisiert', p_customer_id USING ERRCODE = 'P0003';
  END IF;
  blockers := tarifwerk_customer_erasure_blockers(p_customer_id);
  IF cardinality(blockers) > 0 THEN
    RAISE EXCEPTION 'tarifwerk_privacy: %', array_to_string(blockers, '; ') USING ERRCODE = 'P0004';
  END IF;

  -- Nur Leads, die zu keinem anderen, nicht anonymisierten Kunden gehören.
  SELECT coalesce(array_agg(l.id), ARRAY[]::integer[]) INTO lead_ids
    FROM tarifwerk_customer_lead_ids(p_customer_id) AS l(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM customers other
      WHERE other.id <> p_customer_id
        AND coalesce(other.metadata->>'anonymizedAt', '') = ''
        AND other.id IN (
          SELECT c.id FROM customers c WHERE c.created_from_lead_id = l.id
          UNION SELECT cl.customer_id FROM customer_lead_links cl WHERE cl.lead_id = l.id
          UNION SELECT o.customer_id FROM orders o WHERE o.lead_id = l.id
        )
    );
  SELECT coalesce(array_agg(id), ARRAY[]::integer[]) INTO order_ids FROM orders WHERE customer_id = p_customer_id;
  SELECT coalesce(array_agg(id), ARRAY[]::integer[]) INTO case_ids FROM service_cases WHERE customer_id = p_customer_id;

  UPDATE customers SET
    first_name = CASE WHEN type = 'business' THEN NULL ELSE 'Anonymisiert' END,
    last_name = NULL,
    company_name = CASE WHEN type = 'business' THEN 'Anonymisiert' ELSE NULL END,
    email = NULL, phone = NULL, mobile = NULL,
    street = NULL, house_number = NULL, postal_code = NULL, city = NULL,
    date_of_birth = NULL, preferred_channel = NULL,
    tags = '{}',
    metadata = jsonb_build_object('anonymizedAt', now()),
    archived_at = coalesce(archived_at, now()),
    updated_at = now()
  WHERE id = p_customer_id;

  UPDATE customer_activities SET note = '' WHERE customer_id = p_customer_id;
  UPDATE customer_crm_profiles SET note = '', updated_at = now() WHERE customer_id = p_customer_id;
  UPDATE customer_opportunities SET note = '', updated_at = now() WHERE customer_id = p_customer_id;
  UPDATE customer_referrals SET note = '' WHERE source_customer_id = p_customer_id OR referred_customer_id = p_customer_id;
  -- Einwilligungen bleiben unverändert: Der Nachweis für Telefonwerbung ist nach
  -- § 7a UWG fünf Jahre aufzubewahren (Art. 17 Abs. 3 lit. b/e DSGVO).

  UPDATE service_cases SET subject = 'Anonymisiert', description = '', resolution = NULL, updated_at = now()
    WHERE customer_id = p_customer_id;
  UPDATE service_case_events SET note = NULL WHERE service_case_id = ANY(case_ids);

  UPDATE optimization_goals SET title = 'Anonymisiert', description = '', updated_at = now() WHERE customer_id = p_customer_id;
  UPDATE optimization_contracts SET note = '', updated_at = now() WHERE customer_id = p_customer_id;
  UPDATE optimization_offers SET note = '', updated_at = now() WHERE customer_id = p_customer_id;
  UPDATE optimization_memberships SET metadata = '{}'::jsonb, updated_at = now() WHERE customer_id = p_customer_id;
  DELETE FROM optimization_documents WHERE customer_id = p_customer_id;
  GET DIAGNOSTICS document_count = ROW_COUNT;

  UPDATE tasks SET title = 'Vorgang (anonymisiert)', description = NULL
    WHERE (entity_type = 'customer' AND entity_id = p_customer_id)
       OR (entity_type = 'order' AND entity_id = ANY(order_ids))
       OR (entity_type = 'service_case' AND entity_id = ANY(case_ids));
  UPDATE document_records SET file_name = 'anonymisiert'
    WHERE (entity_type = 'customer' AND entity_id = p_customer_id)
       OR (entity_type = 'order' AND entity_id = ANY(order_ids))
       OR (entity_type = 'service_case' AND entity_id = ANY(case_ids));

  UPDATE audit_events SET old_values = NULL, new_values = NULL
    WHERE entity_type = 'customer' AND entity_id = cid;
  UPDATE outbox_events SET payload = '{}'::jsonb
    WHERE entity_type = 'customer' AND entity_id = cid;
  UPDATE notification_queue SET subject = 'Anonymisierter Vorgang', body = '', metadata = '{}'::jsonb
    WHERE entity_type = 'customer' AND entity_id = cid;
  UPDATE automation_runs SET detail = NULL
    WHERE entity_type = 'customer' AND entity_id = cid;

  lead_count := tarifwerk_anonymize_leads(lead_ids);

  RETURN jsonb_build_object(
    'customerId', p_customer_id,
    'leads', lead_count,
    'documentsDeleted', document_count,
    'ordersKept', cardinality(order_ids),
    'serviceCases', cardinality(case_ids)
  );
END $$;

-- Speicherbegrenzung: Leads, die nie zu Kunde oder Auftrag wurden und seit
-- p_months Monaten ruhen.
CREATE OR REPLACE FUNCTION tarifwerk_expired_lead_ids(p_months integer)
RETURNS SETOF integer
LANGUAGE sql STABLE AS $$
  SELECT l.id FROM leads l
  WHERE p_months > 0
    AND l.status <> 'abgeschlossen'
    AND coalesce(l.meta->>'anonymizedAt', '') = ''
    AND greatest(l.created_at, l.updated_at, coalesce(l.last_contact_at, l.created_at)) < now() - make_interval(months => p_months)
    AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.created_from_lead_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM customer_lead_links cl WHERE cl.lead_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.lead_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM customer_referrals cr WHERE cr.referred_lead_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM referrals r WHERE r.lead_id = l.id)
$$;

CREATE INDEX IF NOT EXISTS customer_consents_purpose_idx
  ON customer_consents(customer_id, purpose, recorded_at DESC);
