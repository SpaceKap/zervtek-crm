-- Remove stale migration record (DB has 20260205094146, repo has 20260205094000)
DELETE FROM "inquiry_pooler"."_prisma_migrations"
WHERE migration_name = '20260205094146_add_document_categories';
