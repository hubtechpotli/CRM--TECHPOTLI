INSERT INTO "AllowedOfficeIp" (id, cidr, label, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), '152.56.178.15/32', 'Ravi / Remote', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "AllowedOfficeIp" WHERE cidr = '152.56.178.15/32'
);
