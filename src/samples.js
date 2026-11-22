// Synthetic, explicitly labeled incident data. No production telemetry.
const base = Date.parse('2026-11-20T09:00:00.000Z');
function e(minute, service, level, message, traceId, code, latencyMs) {
  return {timestamp:new Date(base+minute*60000).toISOString(),service,level,message,traceId:traceId||'',code:code||'',latencyMs:latencyMs??null};
}
export const CASES = [
 {id:'checkout',label:'Checkout outage',idLabel:'INC-042',code:'CASE 01',industry:'E-COMMERCE',name:'The checkout that went silent',summary:'503 errors after a configuration rollout',color:'#f0a17e',dataset:'SYNTHETIC DEMO',events:[
 e(12,'release-bot','info','Deployment v2.4.1 approved for checkout-service','deploy-241','RELEASE'),
 e(13,'checkout-api','info','Config update applied: DB_POOL_MAX 16 -> 4','deploy-241','CONFIG_CHANGE'),
 e(13.5,'checkout-api','info','Health check passed on checkout-api','health-21','HEALTH'),
 e(14,'checkout-api','warn','Connection pool usage 100% (4/4)','order-701','POOL_EXHAUSTED',600),
 e(14.2,'database','warn','Connection wait queue increased to 34','order-701','POOL_WAIT',1210),
 e(14.4,'checkout-api','error','Timeout acquiring DB connection after 2000ms','order-701','DB_TIMEOUT',2014),
 e(14.5,'edge-gateway','error','POST /checkout returned HTTP 503','order-701','HTTP_503',2491),
 e(15,'checkout-api','error','Timeout acquiring DB connection after 2000ms','order-702','DB_TIMEOUT',2120),
 e(15.3,'edge-gateway','error','POST /checkout returned HTTP 503','order-702','HTTP_503',2600),
 e(16,'database','warn','Connection wait queue increased to 78','order-703','POOL_WAIT',1650),
 e(16.2,'checkout-api','error','ConnectionPoolAcquireTimeout: payment attempt blocked','order-703','DB_TIMEOUT',2280),
 e(16.4,'edge-gateway','error','POST /checkout returned HTTP 503','order-703','HTTP_503',2700),
 e(17,'payment-worker','warn','Payment job backlog now 43; retry scheduled','order-703','RETRY',1800),
 e(17.4,'checkout-api','error','HTTP 503 on checkout commit','order-704','HTTP_503',2940),
 e(18,'database','error','Connection pool exhausted; active=4 idle=0 waiting=96','order-704','POOL_EXHAUSTED',1980),
 e(18.1,'edge-gateway','error','POST /checkout returned HTTP 503','order-704','HTTP_503',2950),
 e(19,'checkout-api','warn','P95 checkout latency crossed 2500ms','order-705','LATENCY',2510),
 e(20,'checkout-api','error','Timeout acquiring DB connection after 2000ms','order-706','DB_TIMEOUT',2240),
 e(20.3,'edge-gateway','error','POST /checkout returned HTTP 503','order-706','HTTP_503',2540),
 e(21,'payment-worker','warn','Retry backlog reached 118 jobs','order-706','RETRY',1700),
 e(22,'checkout-api','error','HTTP 503 rate above error budget threshold','order-707','HTTP_503',3040),
 e(23,'oncall','warn','Incident declared SEV-1, rollback requested','response-9','INCIDENT'),
 e(24,'release-bot','info','Rollback started: checkout-service v2.4.1 -> v2.4.0','response-9','ROLLBACK'),
 e(25,'checkout-api','info','Config restored: DB_POOL_MAX 16','response-9','CONFIG_CHANGE'),
 e(26,'database','info','Connection pool usage 38% (6/16); wait queue clear','order-708','RECOVERY'),
 e(27,'checkout-api','info','Checkout latency back below 200ms','order-708','RECOVERY',176),
 e(28,'edge-gateway','info','POST /checkout returned HTTP 200','order-708','HTTP_200',186),
 e(29,'oncall','info','SEV-1 downgraded; checkout error rate normalized','response-9','RECOVERY')
 ]},
 {id:'identity',label:'Login failures',idLabel:'INC-108',code:'CASE 02',industry:'IDENTITY',name:'The key that locked everyone out',summary:'401 spike after signing-key rotation',color:'#c2b4fa',dataset:'SYNTHETIC DEMO',events:[
 e(31,'release-bot','info','Authentication key rotation started: key-a -> key-b','rotate-51','CONFIG_CHANGE'),
 e(32,'identity-core','info','New issuer key-b published; keyset cache TTL 30m','rotate-51','CONFIG_CHANGE'),
 e(33,'api-gateway','warn','JWKS cache still references key-a','login-101','KEY_MISMATCH'),
 e(33.3,'identity-core','error','Token verification failed: unknown kid key-b','login-101','JWT_INVALID'),
 e(33.6,'api-gateway','error','POST /login returned HTTP 401','login-101','HTTP_401',210),
 e(34,'identity-core','error','Signature validation failed: unknown kid key-b','login-102','JWT_INVALID'),
 e(34.4,'api-gateway','error','POST /login returned HTTP 401','login-102','HTTP_401',192),
 e(35,'mobile-api','warn','Refresh token retried with key-b','login-103','RETRY'),
 e(35.3,'identity-core','error','Token verification failed after signing-key rotation','login-103','JWT_INVALID'),
 e(35.6,'api-gateway','error','POST /login returned HTTP 401','login-103','HTTP_401',272),
 e(36,'oncall','warn','Authentication incident declared; oncall paged','incident-108','INCIDENT'),
 e(37,'identity-core','warn','JWKS cache refresh requested','incident-108','CACHE'),
 e(38,'identity-core','info','JWKS cache refreshed to include key-b','incident-108','RECOVERY'),
 e(39,'identity-core','info','Token signature verified for key-b','login-104','RECOVERY'),
 e(39.3,'api-gateway','info','POST /login returned HTTP 200','login-104','HTTP_200',95),
 e(40,'oncall','info','Authentication 401 rate returned to baseline','incident-108','RECOVERY')
 ]},
 {id:'ingestion',label:'Ingestion stalled',idLabel:'INC-227',code:'CASE 03',industry:'DATA PIPELINE',name:'The queue that could not breathe',summary:'Dead letters after an event-schema change',color:'#85cfe2',dataset:'SYNTHETIC DEMO',events:[
 e(45,'schema-registry','info','Event schema v7 registered; field customer_id now required','release-227','SCHEMA_CHANGE'),
 e(46,'producer','info','Producer version 7 rollout completed','release-227','RELEASE'),
 e(47,'ingest-consumer','warn','Schema validation mismatch: missing customer_id','batch-227','SCHEMA_MISMATCH'),
 e(47.4,'ingest-consumer','error','Record rejected by schema validator','batch-227','VALIDATION_ERROR'),
 e(48,'dead-letter-queue','warn','Dead letter count increased to 340','batch-227','DLQ'),
 e(49,'ingest-consumer','error','Consumer retry limit reached; record dropped to DLQ','batch-228','DLQ'),
 e(50,'dead-letter-queue','error','Dead letter count increased to 1200','batch-228','DLQ'),
 e(51,'oncall','warn','Ingestion incident declared','response-227','INCIDENT'),
 e(52,'producer','info','Fallback schema mapping enabled for customer_id','response-227','RECOVERY'),
 e(53,'ingest-consumer','info','Schema validation passed for batch-229','batch-229','RECOVERY'),
 e(54,'dead-letter-queue','info','DLQ replay scheduled; new failures stopped','response-227','RECOVERY')
 ]}
];
