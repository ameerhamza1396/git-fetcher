-- 1. Drop existing constraints
ALTER TABLE public.term_of_day DROP CONSTRAINT IF EXISTS valid_mbbs_term_years;
ALTER TABLE public.term_of_day DROP CONSTRAINT IF EXISTS term_of_day_year_check;

ALTER TABLE public.case_of_day DROP CONSTRAINT IF EXISTS valid_mbbs_case_years;
ALTER TABLE public.case_of_day DROP CONSTRAINT IF EXISTS valid_mbbs_years;
ALTER TABLE public.case_of_day DROP CONSTRAINT IF EXISTS case_of_day_year_check;

-- 2. Add NOT VALID constraints (avoids validation error on existing legacy rows)
ALTER TABLE public.term_of_day 
  ADD CONSTRAINT valid_mbbs_term_years 
  CHECK (
    year IS NULL OR 
    year IN (
      'first_year', 'second_year', 'third_year', 'fourth_year', 'final_year',
      '1st_year', '2nd_year', '3rd_year', '4th_year', '5th_year',
      'medicine_allied', 'surgery_allied', 'gynea_obs', 'anesthesia', 'radiology'
    )
  ) NOT VALID;

ALTER TABLE public.case_of_day 
  ADD CONSTRAINT valid_mbbs_case_years 
  CHECK (
    year IS NULL OR 
    year IN (
      'first_year', 'second_year', 'third_year', 'fourth_year', 'final_year',
      '1st_year', '2nd_year', '3rd_year', '4th_year', '5th_year',
      'medicine_allied', 'surgery_allied', 'gynea_obs', 'anesthesia', 'radiology'
    )
  ) NOT VALID;

-- 3. Populate Term of the Day
INSERT INTO public.term_of_day (term, definition, year, created_at)
VALUES 
  ('Anion Gap', 'Difference between unmeasured anions and unmeasured cations in serum. Calculated as [Na+] - ([Cl-] + [HCO3-]). Normal range is 8-12 mEq/L.', 'medicine_allied', NOW()),
  ('Virchow Triad', 'Three factors contributing to thrombosis: endothelial injury, stasis or turbulent blood flow, and hypercoagulability of blood.', 'surgery_allied', NOW()),
  ('Asherman Syndrome', 'Intrauterine adhesions/synechiae resulting from trauma to the basal layer of the endometrium, often leading to secondary amenorrhea.', 'gynea_obs', NOW()),
  ('MAC (Minimum Alveolar Concentration)', 'Alveolar concentration of an inhaled anesthetic at 1 atm that prevents movement in 50% of patients in response to a standard surgical incision.', 'anesthesia', NOW()),
  ('Silhouette Sign', 'Loss of normal border between two structures of similar acoustic or radiographic density (e.g., heart border vs. pulmonary infiltrate).', 'radiology', NOW())
ON CONFLICT DO NOTHING;

-- 4. Populate Case of the Day
INSERT INTO public.case_of_day (headline, details, answer, explanation, year, created_at)
VALUES
  ('Acute Dyspnea and Unilateral Leg Swelling', 'A 45-year-old male presents with sudden-onset dyspnea, pleuritic chest pain, and a swollen, tender right leg following a 14-hour flight.', 'Pulmonary Embolism secondary to Deep Vein Thrombosis (DVT)', 'Prolonged immobilization leads to venous stasis, forming a deep vein thrombus that can embolize to the pulmonary vasculature causing acute RV strain and hypoxemia.', 'medicine_allied', NOW()),
  ('Right Lower Quadrant Abdominal Pain', 'A 22-year-old female presents with 12 hours of periumbilical pain that migrated to the right iliac fossa, accompanied by low-grade fever and anorexia. McBurney point tenderness is present.', 'Acute Appendicitis', 'Luminal obstruction (fecalith/lymphoid hyperplasia) leads to ischemia, bacterial overgrowth, and visceral pain migration to the localized parietal peritoneum at McBurney point.', 'surgery_allied', NOW()),
  ('Sudden Pelvic Pain & Amenorrhea', 'A 28-year-old female presents with 6 weeks amenorrhea, severe lower abdominal pain, and faintness. Ultrasound shows an empty uterus and free fluid in the pouch of Douglas.', 'Ruptured Ectopic Pregnancy', 'Implantation outside the uterine cavity (most commonly fallopian tube ampulla) causes tubular erosion, hemorrhage, and peritoneal irritation resulting in hemoperitoneum.', 'gynea_obs', NOW()),
  ('Unexplained Hypercapnia During Anesthesia Induction', 'A 30-year-old male undergoing appendectomy develops abrupt hypercarbia, masseter muscle rigidity, and rapid temperature elevation following succinylcholine administration.', 'Malignant Hyperthermia', 'An autosomal dominant mutation in the RYR1 receptor leads to uncontrolled calcium release from the sarcoplasmic reticulum triggered by volatile anesthetics or succinylcholine. Treat immediately with Dantrolene.', 'anesthesia', NOW()),
  ('Crescent of Air Below the Diaphragm', 'A 55-year-old male with a history of peptic ulcer disease presents with severe abdominal rigidity. Upright chest X-ray reveals a thin radiolucent crescent under the right hemidiaphragm.', 'Pneumoperitoneum (Perforated Viscus)', 'Free gas under the diaphragm on an upright chest X-ray is pathognomonic for a perforated hollow organ (e.g., perforated duodenal ulcer).', 'radiology', NOW())
ON CONFLICT DO NOTHING;
