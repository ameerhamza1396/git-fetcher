-- Update features array for the pricing plans to clearly display usage limits.

-- 1. Update Free plan features
UPDATE public.pricing_plans
SET features = ARRAY[
  '50 MCQ submissions daily',
  '5 Book references daily',
  '2 Option explains daily',
  'Dr Ahroid analysis once a week (7d cooldown)',
  '1 Full-Length Paper (FLP) daily (max 20/mo)',
  'Smart Revision Cards locked'
]
WHERE name = 'free';

-- 2. Update Iconic plan features
UPDATE public.pricing_plans
SET features = ARRAY[
  'Unlimited MCQ submissions',
  '100 Book references daily',
  '100 Option explains daily',
  'Dr Ahroid analysis once every 3 days',
  '5 Full-Length Papers (FLP) daily',
  '50 Smart Revision Cards daily'
]
WHERE name = 'iconic';

-- 3. Update Premium plan features
UPDATE public.pricing_plans
SET features = ARRAY[
  'Unlimited MCQ submissions',
  '1000 Book references daily',
  '500 Option explains daily',
  'Dr Ahroid analysis daily',
  'Unlimited Full-Length Papers (FLP)',
  '300 Smart Revision Cards daily'
]
WHERE name = 'premium';
