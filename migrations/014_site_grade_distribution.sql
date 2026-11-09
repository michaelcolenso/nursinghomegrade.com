-- National grade distribution for the homepage histogram (design overhaul Phase 3).
-- Idempotent: CREATE TABLE IF NOT EXISTS, then a full rebuild from `facilities`,
-- so it is safe to apply before or after the data refresh. The same statements
-- (SITE_GRADE_DISTRIBUTION_REFRESH_SQL in scripts/stats-sql.ts) run on every
-- ingest, so the production refresh creates this table itself if this migration
-- was never applied. The Worker tolerates the table being absent (the homepage
-- simply omits the histogram).
--
-- Buckets: 'A'..'F' and 'NR' (grade letters), 's00'..'s90' (10-point score
-- buckets over rated facilities; 100 folds into s90).

CREATE TABLE IF NOT EXISTS site_grade_distribution (
  bucket TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  computed_at TEXT NOT NULL
);

DELETE FROM site_grade_distribution;

WITH rated AS (
  SELECT grade_letter, grade_score
    FROM facilities
   WHERE grade_letter != 'NR' AND grade_score >= 0
),
buckets(bucket) AS (
  VALUES ('A'),('B'),('C'),('D'),('F'),('NR'),
         ('s00'),('s10'),('s20'),('s30'),('s40'),('s50'),('s60'),('s70'),('s80'),('s90')
)
INSERT INTO site_grade_distribution (bucket, n, computed_at)
SELECT b.bucket,
       CASE
         WHEN b.bucket IN ('A','B','C','D','F')
           THEN (SELECT COUNT(*) FROM rated WHERE grade_letter = b.bucket)
         WHEN b.bucket = 'NR'
           THEN (SELECT COUNT(*) FROM facilities) - (SELECT COUNT(*) FROM rated)
         ELSE (SELECT COUNT(*) FROM rated
                WHERE MIN(CAST(grade_score / 10 AS INTEGER), 9) = CAST(substr(b.bucket, 2, 1) AS INTEGER))
       END,
       datetime('now')
  FROM buckets b;
