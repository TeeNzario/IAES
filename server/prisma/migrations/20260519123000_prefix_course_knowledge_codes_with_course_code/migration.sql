WITH normalized AS (
  SELECT
    ck."courses_id",
    ck."knowledge_category_id",
    UPPER(c."course_code") || '-' ||
      COALESCE(
        substring(UPPER(ck."code") from 'K[0-9]+$'),
        'K' || LPAD(
          ROW_NUMBER() OVER (
            PARTITION BY ck."courses_id"
            ORDER BY ck."code", ck."knowledge_category_id"
          )::text,
          3,
          '0'
        )
      ) AS next_code
  FROM "course_knowledge" ck
  JOIN "courses" c ON c."courses_id" = ck."courses_id"
)
UPDATE "course_knowledge" ck
SET "code" = normalized.next_code
FROM normalized
WHERE ck."courses_id" = normalized."courses_id"
  AND ck."knowledge_category_id" = normalized."knowledge_category_id"
  AND ck."code" <> normalized.next_code;
