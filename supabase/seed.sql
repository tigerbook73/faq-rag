-- Create local dev test user: admin@test.com / admin@123
-- Uses pgcrypto (pre-installed in Supabase) for password hashing.
DO $$
DECLARE
  _uid uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@test.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role,
      email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', _uid, 'authenticated', 'authenticated',
      'admin@test.com', crypt('admin@123', gen_salt('bf')), NOW(),
      '{"provider":"email","providers":["email"]}', '{}',
      FALSE, NOW(), NOW(),
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), _uid, 'admin@test.com',
      jsonb_build_object('sub', _uid::text, 'email', 'admin@test.com'),
      'email', NOW(), NOW(), NOW()
    );
  END IF;
END $$;
