-- Create get_user_role function
-- This function retrieves the user's role from user_credits table

CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM user_credits
  WHERE user_credits.user_id = get_user_role.user_id
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'agent');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated;

COMMENT ON FUNCTION get_user_role(UUID) IS 'Returns the role for a given user from user_credits table';
