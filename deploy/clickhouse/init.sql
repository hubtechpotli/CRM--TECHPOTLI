CREATE DATABASE IF NOT EXISTS techpotli;

CREATE TABLE IF NOT EXISTS techpotli.crm_events (
    event_id String,
    topic String,
    entity_type String,
    entity_id String,
    payload String,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (topic, created_at);
