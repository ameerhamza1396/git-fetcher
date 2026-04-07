## Supabase SQL Migration: Redeem Codes Enhancement

Run the following SQL commands in your Supabase SQL Editor to add the new columns and update your `use_redeem_code` logic.

### 1. Add the New Columns

```sql
-- Alter table to add eligible_institutes (defaults to empty array)
ALTER TABLE public.redeem_codes 
ADD COLUMN eligible_institutes text[] NOT NULL DEFAULT '{}'::text[];

-- Alter table to add eligible_years (defaults to all standard years)
ALTER TABLE public.redeem_codes 
ADD COLUMN eligible_years text[] NOT NULL DEFAULT '{"1st", "2nd", "3rd", "4th", "5th"}'::text[];
```

### 2. Update the `use_redeem_code` Function

Since you have an existing RPC `use_redeem_code(code_input, uid)`, you'll need to update it to enforce these new rules. Below is a complete, robust template of how the updated function should look. 

Make sure to adjust the column names for `institute` and `year_of_study`/`year` depending on what you named them in your `profiles` table.

```sql
CREATE OR REPLACE FUNCTION public.use_redeem_code(code_input text, uid uuid)
RETURNS TABLE(success boolean, plan text, duration_days integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code_record record;
  v_user_profile record;
  v_is_eligible boolean := false;
  v_has_institute_access boolean := false;
  v_has_year_access boolean := false;
  v_already_used boolean;
BEGIN
  -- 1. Fetch user profile
  SELECT * INTO v_user_profile 
  FROM public.profiles 
  WHERE id = uid;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, ''::text, 0;
    RETURN;
  END IF;

  -- Admin bypass (Role assuming 'admin' or similar, adjust if needed)
  IF v_user_profile.role = 'admin' THEN
    v_is_eligible := true;
  END IF;

  -- 2. Fetch code record
  SELECT * INTO v_code_record 
  FROM public.redeem_codes 
  WHERE code = code_input AND expires_at > now();

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, ''::text, 0;
    RETURN;
  END IF;

  -- 3. Check usage constraints
  IF v_code_record.used_count >= v_code_record.max_uses THEN
    RETURN QUERY SELECT false, ''::text, 0;
    RETURN;
  END IF;

  -- Check if user already used this exact code
  SELECT EXISTS (
    SELECT 1 FROM public.redeem_code_usages 
    WHERE redeem_code_id = v_code_record.id AND user_id = uid
  ) INTO v_already_used;

  IF v_already_used THEN
    RETURN QUERY SELECT false, ''::text, 0;
    RETURN;
  END IF;

  -- 4. Check eligibility if not an admin
  IF NOT v_is_eligible THEN
    
    -- Institute Check:
    -- If contains 'all' or 'ALL', it's usable for all
    IF 'all' = ANY(SELECT lower(x) FROM unnest(v_code_record.eligible_institutes) x) THEN
      v_has_institute_access := true;
    -- If empty, no one gets it (except admin which already bypassed)
    ELSIF array_length(v_code_record.eligible_institutes, 1) IS NULL THEN
      v_has_institute_access := false;
    -- Otherwise, check if user's institute is in the array
    -- (Assuming user profile has an 'institute' column - adjust as needed)
    ELSIF v_user_profile.institute = ANY(v_code_record.eligible_institutes) THEN
      v_has_institute_access := true;
    END IF;

    -- Year Check:
    -- Check if user's year is in the eligible_years array
    -- (Assuming user profile has a 'year' column - adjust as needed)
    IF v_user_profile.year = ANY(v_code_record.eligible_years) THEN
      v_has_year_access := true;
    END IF;

    -- Combine both checks
    IF v_has_institute_access AND v_has_year_access THEN
      v_is_eligible := true;
    END IF;

  END IF;

  -- 5. Finalize Redemption
  IF v_is_eligible THEN
    -- Increment used_count
    UPDATE public.redeem_codes 
    SET 
        used_count = used_count + 1,
        used_at = now(),
        used_by = uid
    WHERE id = v_code_record.id;

    -- Log usage
    INSERT INTO public.redeem_code_usages (redeem_code_id, user_id)
    VALUES (v_code_record.id, uid);

    RETURN QUERY SELECT true, v_code_record.plan, v_code_record.duration_days;
  ELSE
    RETURN QUERY SELECT false, ''::text, 0;
  END IF;

END;
$$;
```

### Notes:
1. Make sure your `profiles` table has columns named `institute` and `year`. If they are named differently (e.g., `university` or `study_year`), update the `v_user_profile.institute` and `v_user_profile.year` references in the script above.
2. The logic strictly adheres to your rules:
   - Empty `eligible_institutes` (`{}`) = blocked for everyone except `role = 'admin'`
   - `{'all'}` or `{'ALL'}` = allowed for all institutes
   - The default `eligible_years` spans standard medical school years `{"1st", "2nd", "3rd", "4th", "5th"}`. If a user's year isn't in the list, they are rejected.
