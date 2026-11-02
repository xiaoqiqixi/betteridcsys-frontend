-- Only apply to the disposable fe2_test database, after the real migrations.
INSERT INTO os_images(id,family,name,version,min_disk_gb,enabled,controller_id,connection_id,remote_image_id,sha256)
VALUES ('fe2-debian','debian','Debian','12',10,TRUE,'','fe2-offline','debian-12',REPEAT('a',64)),
       ('fe2-ubuntu','ubuntu','Ubuntu','24.04',15,TRUE,'','fe2-offline','ubuntu-24.04',REPEAT('b',64));
INSERT INTO staff_roles(id,name,description,permissions,builtin,revision)
VALUES ('fe2-reader','Read only','E2E least privilege fixture',JSON_ARRAY('overview.read','clients.read','orders.read','services.read','invoices.read','products.read','tickets.read'),FALSE,1);
UPDATE staff_members SET role_id='fe2-reader' WHERE user_id=(SELECT id FROM users WHERE email='reader@fe2.test');
UPDATE account_profiles SET email_verified=TRUE WHERE user_id=(SELECT id FROM users WHERE email='client@fe2.test');
-- Existing legacy records exercise migration/contract compatibility on detail routes.
UPDATE plans SET available=TRUE;
UPDATE plan_prices SET available=TRUE;
INSERT INTO services(id,user_id,name,plan_name,region,ipv4,status,next_due_at,price_minor,currency,cpu,memory_gb,disk_gb,currency_snapshot)
SELECT 'fe200000000000000000000000000001',id,'fe2-existing-service','FE2 starter','Hong Kong','192.0.2.10','active',DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 30 DAY),1000,'CNY',1,2,40,
JSON_OBJECT('code','CNY','name','人民币','prefix','¥','suffix','','decimal_places',2) FROM users WHERE email='client@fe2.test';
UPDATE services SET product_id='starter', label=name, recurring_minor=1000, next_invoice_at=next_due_at, created_at=UTC_TIMESTAMP(6), anchor_day=DAY(next_due_at) WHERE id='fe200000000000000000000000000001';
