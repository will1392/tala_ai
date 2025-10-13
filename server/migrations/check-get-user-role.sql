-- Check the current get_user_role function definition
SELECT 
  p.proname AS function_name,
  pg_catalog.pg_get_function_result(p.oid) AS return_type,
  pg_catalog.pg_get_functiondef(p.oid) AS function_definition
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'get_user_role'
  AND pg_catalog.pg_function_is_visible(p.oid);
