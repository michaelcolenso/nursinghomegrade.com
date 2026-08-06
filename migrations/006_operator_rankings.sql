-- Operator rankings: composite score + size tier for rankings pages.
-- operator_score: 0-100 composite (grade 70% / staffing 15% / deficiencies 15%).
-- operator_tier: Mega (100+) / Large (20-99) / Mid (5-19) / Small (2-4).
ALTER TABLE operators ADD COLUMN operator_score NUMERIC;
ALTER TABLE operators ADD COLUMN operator_tier TEXT;
CREATE INDEX IF NOT EXISTS idx_operators_tier_score ON operators(operator_tier, operator_score DESC);
CREATE INDEX IF NOT EXISTS idx_operators_score ON operators(operator_score DESC);
