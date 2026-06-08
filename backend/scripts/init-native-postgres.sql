-- TechPotli — native PostgreSQL setup (run as postgres superuser in pgAdmin Query Tool)
-- Or: psql -U postgres -f init-native-postgres.sql

CREATE ROLE techpotli WITH LOGIN PASSWORD 'techpotli';

CREATE DATABASE techpotli_os OWNER techpotli;

-- In pgAdmin: connect to techpotli_os database, then run the lines below:
-- GRANT ALL ON SCHEMA public TO techpotli;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO techpotli;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO techpotli;
