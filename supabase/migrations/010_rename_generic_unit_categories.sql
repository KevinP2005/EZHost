-- ============================================================
-- DATA FIX – 009's backfill left generic category names
-- ============================================================
-- 009_unit_categories.sql backfilled one unit_categories row per distinct
-- (property, unit_type, capacity) combo and named every one of them after
-- the raw unit_type text ('ROOM', 'APARTMENT', ...), with the comment
-- "real names come from the reseeded data or are renamed later". On
-- environments that only ran the migration (never re-seeded), that "later"
-- never happened: every category on a property still shares the same
-- generic name, so distinct room/apartment tiers are visually
-- indistinguishable in the booking flow and booking details.
--
-- This is a pure data correction, not a schema change. It only touches rows
-- that still carry the untouched backfill name (name = unit_type::text), so
-- it is a no-op on any environment that was seeded with real category names
-- (see seed.sql) or already fixed manually.
--
-- Two situations, resolved with the only signals the data actually has:
--
--  1. A category whose sole member unit's name doesn't match the generic
--     unit_type text (e.g. a unit named "Suite 301" sitting in a "ROOM"
--     category purely because it coincidentally shares that category's
--     capacity with plain rooms) is split into its own category, named
--     after that distinguishing word in the unit name.
--
--  2. Any category still carrying the generic name after that is renamed
--     to a humanized, capacity-qualified label so siblings on the same
--     property/type stay distinguishable (e.g. "Room (2+1)"), or to the
--     plain humanized type if it is the only one of its type left.

-- ─── 1. Split out units whose name signals a distinct tier ────────────────
-- Heuristic: the unit's name starts with a recognizable tier word ("Suite")
-- that isn't just the property's plain room/apartment naming, and it shares
-- its category with at least one other, differently-named unit.

DO $$
DECLARE
  r RECORD;
  v_new_category_id UUID;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (uc.id)
      uc.id AS category_id,
      uc.organization_id,
      uc.property_id,
      uc.unit_type,
      uc.capacity_adults,
      uc.capacity_children,
      'Suite' AS tier_name
    FROM units u
    JOIN unit_categories uc ON uc.id = u.unit_category_id
    WHERE u.name ILIKE 'suite%'
      AND uc.name = uc.unit_type::text
      AND EXISTS (
        SELECT 1 FROM units u2
        WHERE u2.unit_category_id = uc.id AND u2.name NOT ILIKE 'suite%'
      )
  LOOP
    INSERT INTO unit_categories (organization_id, property_id, name, unit_type, capacity_adults, capacity_children)
    VALUES (r.organization_id, r.property_id, r.tier_name, r.unit_type, r.capacity_adults, r.capacity_children)
    RETURNING id INTO v_new_category_id;

    UPDATE units
    SET unit_category_id = v_new_category_id
    WHERE unit_category_id = r.category_id
      AND name ILIKE 'suite%';
  END LOOP;
END $$;

-- ─── 2. Categories with exactly one remaining member → adopt that unit's name ──
UPDATE unit_categories uc
SET name = sub.unit_name
FROM (
  SELECT unit_category_id, MIN(name) AS unit_name, COUNT(*) AS member_count
  FROM units
  GROUP BY unit_category_id
) sub
WHERE sub.unit_category_id = uc.id
  AND sub.member_count = 1
  AND uc.name = uc.unit_type::text;

-- ─── 3. Remaining generically-named categories with siblings of the same
--        type on the property → capacity-qualified label. The plain
--        no-extra-children capacity keeps the bare type name (treated as
--        the "standard" tier); the others get a qualifier so they stay
--        distinguishable from it. ──────────────────────────────────────
UPDATE unit_categories uc
SET name = initcap(replace(uc.unit_type::text, '_', ' ')) ||
  CASE WHEN uc.capacity_children > 0 THEN ' (' || uc.capacity_adults || '+' || uc.capacity_children || ')' ELSE '' END
WHERE uc.name = uc.unit_type::text
  AND EXISTS (
    SELECT 1 FROM unit_categories uc2
    WHERE uc2.property_id = uc.property_id
      AND uc2.unit_type = uc.unit_type
      AND uc2.id <> uc.id
  );

-- ─── 4. Any category still generically named at this point is the only one
--        of its type on the property → plain humanized type name ─────────
UPDATE unit_categories uc
SET name = initcap(replace(uc.unit_type::text, '_', ' '))
WHERE uc.name = uc.unit_type::text;
