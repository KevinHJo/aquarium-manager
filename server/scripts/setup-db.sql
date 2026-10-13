-- Local development only. Run once as a Postgres superuser:
--   psql -d postgres < server/scripts/setup-db.sql
-- CREATEDB lets Prisma create its temporary shadow database during `migrate dev`.
CREATE ROLE aquarium LOGIN PASSWORD 'aquarium' CREATEDB;
CREATE DATABASE aquarium OWNER aquarium;
CREATE DATABASE aquarium_test OWNER aquarium;
