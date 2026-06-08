-- Run while connected to database techpotli_os (after init-native-postgres.sql)

GRANT ALL ON SCHEMA public TO techpotli;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO techpotli;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO techpotli;
