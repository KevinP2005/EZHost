-- ============================================================
-- UNIT CATEGORIES – regular price per night
-- ============================================================
-- Until now the booking flow invented its prices from the position of a
-- category in the list (145, 190, 245, ...), so no property ever saw its own
-- prices. base_rate stores the regular price for one unit of the category per
-- night at standard occupancy, excluding local tax. The booking flow prefills
-- its "Standard" rate with it; staff can still override the price per booking.
--
-- Nullable on purpose: categories without a price keep today's behaviour, so
-- this is safe to apply before the code that reads it is deployed.

ALTER TABLE unit_categories
  ADD COLUMN IF NOT EXISTS base_rate NUMERIC(10, 2)
    CHECK (base_rate IS NULL OR base_rate >= 0);

COMMENT ON COLUMN unit_categories.base_rate IS
  'Regular price per unit and night (standard occupancy, excl. local tax). NULL = not set.';
