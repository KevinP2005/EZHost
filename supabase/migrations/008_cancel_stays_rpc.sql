-- ============================================================
-- EZHost – Scoped cancellation (Stay / Stays / Reservation)
-- ============================================================
-- A single SQL UPDATE statement is atomic regardless of how many rows it
-- touches, so `cancel_stays` is the one primitive that backs all three
-- cancellation scopes from the booking panel:
--   - "Cancel Stay"        -> cancel_stays with a single id
--   - "Cancel Stays"       -> cancel_stays with the selected ids
--   - "Cancel Reservation" -> cancel_stays with every active stay id of
--                             that reservation, plus reservations.cancelled_at
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_stays(
  p_stay_ids UUID[],
  p_organization_id UUID,
  p_status stay_status,
  p_note TEXT DEFAULT NULL
)
RETURNS SETOF stays
LANGUAGE sql
AS $$
  UPDATE stays
  SET status = p_status,
      notes = CASE
        WHEN p_note IS NULL THEN notes
        WHEN notes IS NULL OR notes = '' THEN p_note
        ELSE notes || E'\n' || p_note
      END
  WHERE id = ANY(p_stay_ids)
    AND organization_id = p_organization_id
  RETURNING *;
$$;
