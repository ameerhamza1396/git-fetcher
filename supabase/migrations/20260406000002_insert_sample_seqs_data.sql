-- Sample Data for SEQ System
-- Anatomy Subject for 1st Year

-- Insert Subject
INSERT INTO seqs_subjects (id, name, description, icon, color, year, institutes) 
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Anatomy', 'Study of human body structure and organization', '🔬', 'red', '1st', ARRAY['all'])
ON CONFLICT (id) DO NOTHING;

-- Insert Chapters
INSERT INTO seqs_chapters (id, name, description, chapter_number, subject_id) VALUES
  ('00000000-0000-0000-0000-000000000101', 'Introduction to Anatomy', 'Basic concepts and terminology', 1, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000102', 'Upper Limb', 'Structure and function of upper limb', 2, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000103', 'Thorax', 'Thoracic organs and structures', 3, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Insert SEQs for Chapter 1: Introduction to Anatomy
INSERT INTO seqs (id, question, model_answer, explanation, chapter_id) VALUES
  ('00000000-0000-0000-0000-000000000201', 
   'Define Anatomy and its branches.', 
   'Anatomy is the study of the structure of the human body. Its main branches include: 1) Gross Anatomy - study of structures visible to naked eye, 2) Histology - study of tissues (microscopic anatomy), 3) Embryology - study of embryonic development, 4) Neuroanatomy - study of nervous system, 5) Applied Anatomy - clinical applications.',
   'Anatomy is a fundamental medical science. Understanding its branches helps in clinical practice.',
   '00000000-0000-0000-0000-000000000101'),
  
  ('00000000-0000-0000-0000-000000000202', 
   'Describe the anatomical position.', 
   'The anatomical position is a standard reference position of the body: 1) Body standing erect, 2) Face facing forward, 3) Eyes looking forward, 4) Upper limbs hanging by sides with palms facing forward, 5) Lower limbs close together with feet parallel and facing forward. All descriptions in anatomy are based on this position.',
   'The anatomical position is the foundation for all directional terms in anatomy.',
   '00000000-0000-0000-0000-000000000101'),
  
  ('00000000-0000-0000-0000-000000000203', 
   'Explain the terms: Superior, Inferior, Anterior, and Posterior.', 
   '1) Superior (Cranial): Toward the head end or above another structure. 2) Inferior (Caudal): Away from the head end or below another structure. 3) Anterior (Ventral): Toward the front of the body. 4) Posterior (Dorsal): Toward the back of the body. These are directional terms used to describe locations.',
   'Directional terms are essential for communicating location in the body accurately.',
   '00000000-0000-0000-0000-000000000101'),
  
  ('00000000-0000-0000-0000-000000000204', 
   'What are the three planes of the body?', 
   'The three primary planes are: 1) Sagittal Plane - divides the body into right and left portions. The mid-sagittal plane divides into equal halves. 2) Coronal (Frontal) Plane - divides the body into anterior (front) and posterior (back) portions. 3) Transverse (Horizontal) Plane - divides the body into superior (upper) and inferior (lower) portions.',
   'These planes are used in imaging (CT, MRI) and anatomical descriptions.',
   '00000000-0000-0000-0000-000000000101'),
  
  ('00000000-0000-0000-0000-000000000205', 
   'Define the term "Quadrant" and name the four abdominal quadrants.', 
   'The abdomen is divided into four quadrants by two imaginary lines: one vertical line through the umbilicus and one horizontal line through the umbilicus. The four quadrants are: 1) Right Upper Quadrant (RUQ) - contains liver, gallbladder, right kidney, pancreas head. 2) Left Upper Quadrant (LUQ) - contains stomach, spleen, left kidney, pancreas tail. 3) Right Lower Quadrant (RLQ) - contains appendix, right ovary, right ureter. 4) Left Lower Quadrant (LLQ) - contains left ovary, left ureter.',
   'Abdominal quadrants help in clinical examination and diagnosing conditions.',
   '00000000-0000-0000-0000-000000000101');

-- Insert SEQs for Chapter 2: Upper Limb
INSERT INTO seqs (id, question, model_answer, explanation, chapter_id) VALUES
  ('00000000-0000-0000-0000-000000000301', 
   'Describe the bony architecture of the shoulder girdle.', 
   'The shoulder girdle consists of: 1) Clavicle - S-shaped bone connecting sternum to scapula, acting as a strut. 2) Scapula - triangular bone with spine, acromion, coracoid process. 3) Proximal humerus - head articulates with glenoid cavity. The girdle provides attachment for upper limb muscles and allows wide range of movements.',
   'The shoulder girdle is the most mobile joint complex in the body.',
   '00000000-0000-0000-0000-000000000102'),
  
  ('00000000-0000-0000-0000-000000000302', 
   'List the muscles of the rotator cuff and their functions.', 
   'The rotator cuff consists of four muscles: 1) Supraspinatus - initiates abduction of arm. 2) Infraspatus - laterally rotates arm. 3) Teres Minor - laterally rotates arm. 4) Subscapularis - medially rotates arm. Together they stabilize the shoulder joint and allow rotation movements.',
   'Rotator cuff injuries are common in athletes and should be protected.',
   '00000000-0000-0000-0000-000000000102'),
  
  ('00000000-0000-0000-0000-000000000303', 
   'Describe the course and branches of the brachial artery.', 
   'The brachial artery is the main artery of the arm. Course: Begins at lower border of teres major, descends in medial aspect of arm, terminates at cubital fossa where it bifurcates into radial and ulnar arteries. Branches: 1) Profunda brachii (deep artery of arm), 2) Superior ulnar collateral, 3) Inferior ulnar collateral, 4) Muscular branches. It supplies the arm and elbow region.',
   'The brachial artery is used for measuring blood pressure.',
   '00000000-0000-0000-0000-000000000102'),
  
  ('00000000-0000-0000-0000-000000000304', 
   'What is carpal tunnel syndrome? Describe its anatomical basis.', 
   'Carpal tunnel syndrome is compression of median nerve in the carpal tunnel. Anatomical basis: The carpal tunnel is bounded by carpal bones (posteriorly and laterally) and flexor retinaculum (anteriorly). It contains median nerve and nine tendons. Any condition causing swelling or compression leads to nerve ischemia, causing numbness in lateral 3.5 fingers and weakness of thenar muscles.',
   'Common in people who do repetitive wrist movements (typing, coding).',
   '00000000-0000-0000-0000-000000000102'),
  
  ('00000000-0000-0000-0000-000000000305', 
   'Describe the innervation of the hand.', 
   'The hand is innervated by three nerves: 1) Median Nerve - supplies thenar muscles, lateral 2 lumbricals, and skin of lateral 3.5 fingers. 2) Ulnar Nerve - supplies hypothenar muscles, medial 2 lumbricals, interossei, adductor pollicis, and skin of medial 1.5 fingers. 3) Radial Nerve - supplies extensors of wrist and fingers, and skin of lateral 3.5 fingers dorsum.',
   'Knowledge of hand innervation is crucial for diagnosing nerve injuries.',
   '00000000-0000-0000-0000-000000000102');

-- Insert SEQs for Chapter 3: Thorax
INSERT INTO seqs (id, question, model_answer, explanation, chapter_id) VALUES
  ('00000000-0000-0000-0000-000000000401', 
   'Describe the boundaries of the thoracic cavity.', 
   'The thoracic cavity is bounded by: Superior: Thoracic inlet (T1 vertebra, 1st ribs, sternum). Inferior: Thoracic diaphragm (separates from abdominal cavity). Anterior: Sternum and costal cartilages. Posterior: T1-T12 vertebrae. Lateral: Ribs and intercostal muscles. It contains heart, lungs, great vessels, trachea, and esophagus.',
   'Understanding thoracic boundaries is essential for chest surgeries.',
   '00000000-0000-0000-0000-000000000103'),
  
  ('00000000-0000-0000-0000-000000000402', 
   'List the contents of the mediastinum and their arrangement.', 
   'The mediastinum is divided into: Superior Mediastinum (above heart): contains arch of aorta, SVC, brachiocephalic veins, trachea, esophagus, thymus, phrenic nerves. Anterior Mediastinum: contains thymus, lymph nodes. Middle Mediastinum: contains pericardium, heart, great vessels, phrenic nerves. Posterior Mediastinum: contains esophagus, descending aorta, azyos vein, sympathetic chains.',
   'Mediastinal masses have characteristic locations and presentations.',
   '00000000-0000-0000-0000-000000000103'),
  
  ('00000000-0000-0000-0000-000000000403', 
   'Describe the blood supply and venous drainage of the heart.', 
   'Blood Supply: Right and left coronary arteries arise from aortic sinuses. Left coronary artery divides into LAD (supplies left atrium, left ventricle, interventricular septum) and circumflex (supplies left atrium, left ventricle, left marginal artery). Right coronary artery supplies right atrium, right ventricle, and inferior wall. Venous Drainage: Coronary sinus (drains most), anterior cardiac veins, Thebesian veins.',
   'Coronary artery disease is the leading cause of death worldwide.',
   '00000000-0000-0000-0000-000000000103'),
  
  ('00000000-0000-0000-0000-000000000404', 
   'What is the bronchial tree? Describe the branching pattern.', 
   'The bronchial tree is the air-conducting passages of the lungs. Branching pattern: Trachea bifurcates into right and left main bronchi at T4-T5. Right main bronchus is shorter, wider, more vertical. Each main bronchus divides into lobar (secondary) bronchi (3 right, 2 left). Lobar bronchi divide into segmental (tertiary) bronchi (10 right, 10 left). These further branch into bronchioles, terminal bronchioles, respiratory bronchioles, alveolar ducts, and alveoli.',
   'This branching explains why foreign bodies more commonly lodge in right lung.',
   '00000000-0000-0000-0000-000000000103'),
  
  ('00000000-0000-0000-0000-000000000405', 
   'Describe the course and relations of the phrenic nerve.', 
   'The phrenic nerve is the motor nerve of the diaphragm. Course: Originates from C3, C4, C5 (cervical plexus), descends on anterior scalene muscle, enters thorax between subclavian artery and vein, passes anterior to root of lung, then on pericardium to reach diaphragm. Relations: In thorax - anterior to scalene, phrenic artery, brachial plexus; anterior to mediastinal pleura and pericardium. Right nerve - lateral to SVC, along right atrium and ventricle.',
   'C3, C4, C5 keeps the diaphragm alive - phrenic nerve mnemonic.',
   '00000000-0000-0000-0000-000000000103');

-- Verify data
SELECT 'seqs_subjects' as table_name, COUNT(*) as count FROM seqs_subjects
UNION ALL
SELECT 'seqs_chapters', COUNT(*) FROM seqs_chapters
UNION ALL
SELECT 'seqs', COUNT(*) FROM seqs;
