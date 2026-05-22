// ============================================================
// PadhaiSathi — scripts/seed.ts
// Seeds all subjects + chapters for Nepal Class 8, 9, 10
// Run: npx tsx scripts/seed.ts
// Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
// ============================================================

import { createClient } from '@supabase/supabase-js'
import * as dotenv      from 'dotenv'
import * as path        from 'path'
import type { Database, ClassLevel } from '../lib/database.types'

// Load .env.local from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// ─── Validate env ─────────────────────────────────────────────
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    '❌  Missing env vars.\n' +
    '    Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
  )
  process.exit(1)
}

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Helper: slugify ──────────────────────────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// ============================================================
// SUBJECTS
// Nepal CDC subjects taught across Class 8, 9, 10
// ============================================================

interface SubjectSeed {
  slug:        string
  name:        string
  class_level: ClassLevel[]
  icon:        string
  color:       string
  bg_pattern:  string
  order_index: number
}

const SUBJECTS: SubjectSeed[] = [
  {
    slug: 'compulsory-english',
    name: 'Compulsory English',
    class_level: [8, 9, 10],
    icon: '🔤',
    color: '#3b82f6',
    bg_pattern: 'dots',
    order_index: 1,
  },
  {
    slug: 'compulsory-nepali',
    name: 'Compulsory Nepali',
    class_level: [8, 9, 10],
    icon: '🇳🇵',
    color: '#dc2626',
    bg_pattern: 'waves',
    order_index: 2,
  },
  {
    slug: 'mathematics',
    name: 'Mathematics',
    class_level: [8, 9, 10],
    icon: '📐',
    color: '#7c3aed',
    bg_pattern: 'grid',
    order_index: 3,
  },
  {
    slug: 'science',
    name: 'Science and Technology',
    class_level: [8, 9, 10],
    icon: '🔬',
    color: '#059669',
    bg_pattern: 'circuit',
    order_index: 4,
  },
  {
    slug: 'social-studies',
    name: 'Social Studies',
    class_level: [8, 9, 10],
    icon: '🌏',
    color: '#d97706',
    bg_pattern: 'map',
    order_index: 5,
  },
  {
    slug: 'optional-mathematics',
    name: 'Optional Mathematics',
    class_level: [9, 10],
    icon: '📊',
    color: '#db2777',
    bg_pattern: 'graph',
    order_index: 6,
  },
  {
    slug: 'health-population-environment',
    name: 'Health, Population and Environment',
    class_level: [8, 9, 10],
    icon: '🌱',
    color: '#16a34a',
    bg_pattern: 'leaf',
    order_index: 7,
  },
  {
    slug: 'computer-science',
    name: 'Computer Science',
    class_level: [8, 9, 10],
    icon: '💻',
    color: '#0891b2',
    bg_pattern: 'binary',
    order_index: 8,
  },
  {
    slug: 'account',
    name: 'Account',
    class_level: [9, 10],
    icon: '🧾',
    color: '#92400e',
    bg_pattern: 'ledger',
    order_index: 9,
  },
]

// ============================================================
// CHAPTERS
// Nepal CDC syllabus — exact chapter titles per class
// ============================================================

interface ChapterSeed {
  subject_slug: string
  title:        string
  class_level:  ClassLevel
  order_index:  number
}

const CHAPTERS: ChapterSeed[] = [

  // ── Compulsory English – Class 8 ─────────────────────────
  { subject_slug: 'compulsory-english', title: 'Unit 1: Myself and Others',                  class_level: 8,  order_index: 1  },
  { subject_slug: 'compulsory-english', title: 'Unit 2: My School',                          class_level: 8,  order_index: 2  },
  { subject_slug: 'compulsory-english', title: 'Unit 3: Nature and Environment',             class_level: 8,  order_index: 3  },
  { subject_slug: 'compulsory-english', title: 'Unit 4: My Community',                       class_level: 8,  order_index: 4  },
  { subject_slug: 'compulsory-english', title: 'Unit 5: Travel and Tourism',                 class_level: 8,  order_index: 5  },
  { subject_slug: 'compulsory-english', title: 'Unit 6: Health and Hygiene',                 class_level: 8,  order_index: 6  },
  { subject_slug: 'compulsory-english', title: 'Unit 7: Science and Technology',             class_level: 8,  order_index: 7  },
  { subject_slug: 'compulsory-english', title: 'Unit 8: Food and Nutrition',                 class_level: 8,  order_index: 8  },

  // ── Compulsory English – Class 9 ─────────────────────────
  { subject_slug: 'compulsory-english', title: 'Unit 1: Humans and Animals',                 class_level: 9,  order_index: 1  },
  { subject_slug: 'compulsory-english', title: 'Unit 2: Cultures and Civilizations',         class_level: 9,  order_index: 2  },
  { subject_slug: 'compulsory-english', title: 'Unit 3: History and Archeology',             class_level: 9,  order_index: 3  },
  { subject_slug: 'compulsory-english', title: 'Unit 4: Work and Leisure',                   class_level: 9,  order_index: 4  },
  { subject_slug: 'compulsory-english', title: 'Unit 5: Sports and Games',                   class_level: 9,  order_index: 5  },
  { subject_slug: 'compulsory-english', title: 'Unit 6: People and Places',                  class_level: 9,  order_index: 6  },
  { subject_slug: 'compulsory-english', title: 'Unit 7: Science and Progress',               class_level: 9,  order_index: 7  },
  { subject_slug: 'compulsory-english', title: 'Unit 8: Global Awareness',                   class_level: 9,  order_index: 8  },

  // ── Compulsory English – Class 10 ────────────────────────
  { subject_slug: 'compulsory-english', title: 'Unit 1: Relationships',                      class_level: 10, order_index: 1  },
  { subject_slug: 'compulsory-english', title: 'Unit 2: Professions',                        class_level: 10, order_index: 2  },
  { subject_slug: 'compulsory-english', title: 'Unit 3: Values and Ethics',                  class_level: 10, order_index: 3  },
  { subject_slug: 'compulsory-english', title: 'Unit 4: Democracy and Human Rights',         class_level: 10, order_index: 4  },
  { subject_slug: 'compulsory-english', title: 'Unit 5: Media and Communication',            class_level: 10, order_index: 5  },
  { subject_slug: 'compulsory-english', title: 'Unit 6: Nature and the Universe',            class_level: 10, order_index: 6  },
  { subject_slug: 'compulsory-english', title: 'Unit 7: Ecology and Environment',            class_level: 10, order_index: 7  },
  { subject_slug: 'compulsory-english', title: 'Unit 8: Creativity and Innovation',          class_level: 10, order_index: 8  },

  // ── Mathematics – Class 8 ─────────────────────────────────
  { subject_slug: 'mathematics', title: 'Sets',                                              class_level: 8,  order_index: 1  },
  { subject_slug: 'mathematics', title: 'Real Numbers',                                      class_level: 8,  order_index: 2  },
  { subject_slug: 'mathematics', title: 'Indices, Surds and Logarithm',                      class_level: 8,  order_index: 3  },
  { subject_slug: 'mathematics', title: 'Algebraic Expressions',                             class_level: 8,  order_index: 4  },
  { subject_slug: 'mathematics', title: 'Factorization',                                     class_level: 8,  order_index: 5  },
  { subject_slug: 'mathematics', title: 'Linear Equations',                                  class_level: 8,  order_index: 6  },
  { subject_slug: 'mathematics', title: 'Geometry: Triangles and Quadrilaterals',            class_level: 8,  order_index: 7  },
  { subject_slug: 'mathematics', title: 'Area and Volume',                                   class_level: 8,  order_index: 8  },
  { subject_slug: 'mathematics', title: 'Statistics: Mean, Median, Mode',                   class_level: 8,  order_index: 9  },
  { subject_slug: 'mathematics', title: 'Probability',                                       class_level: 8,  order_index: 10 },

  // ── Mathematics – Class 9 ─────────────────────────────────
  { subject_slug: 'mathematics', title: 'Sets',                                              class_level: 9,  order_index: 1  },
  { subject_slug: 'mathematics', title: 'Real Numbers and Their Properties',                 class_level: 9,  order_index: 2  },
  { subject_slug: 'mathematics', title: 'Indices, Surds and Logarithm',                      class_level: 9,  order_index: 3  },
  { subject_slug: 'mathematics', title: 'Polynomials and Algebraic Expressions',             class_level: 9,  order_index: 4  },
  { subject_slug: 'mathematics', title: 'Simultaneous Linear Equations',                    class_level: 9,  order_index: 5  },
  { subject_slug: 'mathematics', title: 'Quadratic Equations',                               class_level: 9,  order_index: 6  },
  { subject_slug: 'mathematics', title: 'Sequence and Series',                               class_level: 9,  order_index: 7  },
  { subject_slug: 'mathematics', title: 'Geometry: Circles',                                 class_level: 9,  order_index: 8  },
  { subject_slug: 'mathematics', title: 'Trigonometry',                                      class_level: 9,  order_index: 9  },
  { subject_slug: 'mathematics', title: 'Co-ordinate Geometry',                              class_level: 9,  order_index: 10 },
  { subject_slug: 'mathematics', title: 'Statistics: Quartiles and Deviation',              class_level: 9,  order_index: 11 },
  { subject_slug: 'mathematics', title: 'Probability',                                       class_level: 9,  order_index: 12 },

  // ── Mathematics – Class 10 ────────────────────────────────
  { subject_slug: 'mathematics', title: 'Sets',                                              class_level: 10, order_index: 1  },
  { subject_slug: 'mathematics', title: 'Arithmetic, Geometric and Harmonic Progressions',  class_level: 10, order_index: 2  },
  { subject_slug: 'mathematics', title: 'Linear Programming',                                class_level: 10, order_index: 3  },
  { subject_slug: 'mathematics', title: 'Quadratic Equations',                               class_level: 10, order_index: 4  },
  { subject_slug: 'mathematics', title: 'Indices, Surds and Logarithm',                      class_level: 10, order_index: 5  },
  { subject_slug: 'mathematics', title: 'Trigonometry',                                      class_level: 10, order_index: 6  },
  { subject_slug: 'mathematics', title: 'Geometry: Circle Theorems',                         class_level: 10, order_index: 7  },
  { subject_slug: 'mathematics', title: 'Co-ordinate Geometry: Straight Lines',             class_level: 10, order_index: 8  },
  { subject_slug: 'mathematics', title: 'Area and Volume of Solid Figures',                 class_level: 10, order_index: 9  },
  { subject_slug: 'mathematics', title: 'Statistics: Quartiles and Standard Deviation',     class_level: 10, order_index: 10 },
  { subject_slug: 'mathematics', title: 'Probability',                                       class_level: 10, order_index: 11 },
  { subject_slug: 'mathematics', title: 'Matrices and Determinants',                         class_level: 10, order_index: 12 },

  // ── Science and Technology – Class 8 ─────────────────────
  { subject_slug: 'science', title: 'Measurement',                                          class_level: 8,  order_index: 1  },
  { subject_slug: 'science', title: 'Force',                                                class_level: 8,  order_index: 2  },
  { subject_slug: 'science', title: 'Pressure',                                             class_level: 8,  order_index: 3  },
  { subject_slug: 'science', title: 'Energy',                                               class_level: 8,  order_index: 4  },
  { subject_slug: 'science', title: 'Heat',                                                 class_level: 8,  order_index: 5  },
  { subject_slug: 'science', title: 'Light and Sound',                                      class_level: 8,  order_index: 6  },
  { subject_slug: 'science', title: 'Matter and Its Classification',                        class_level: 8,  order_index: 7  },
  { subject_slug: 'science', title: 'Chemical Reactions',                                   class_level: 8,  order_index: 8  },
  { subject_slug: 'science', title: 'Metals and Non-Metals',                                class_level: 8,  order_index: 9  },
  { subject_slug: 'science', title: 'Cell Biology',                                         class_level: 8,  order_index: 10 },
  { subject_slug: 'science', title: 'Life Processes in Plants',                             class_level: 8,  order_index: 11 },
  { subject_slug: 'science', title: 'Life Processes in Animals',                            class_level: 8,  order_index: 12 },
  { subject_slug: 'science', title: 'Heredity and Evolution',                               class_level: 8,  order_index: 13 },
  { subject_slug: 'science', title: 'Our Earth',                                            class_level: 8,  order_index: 14 },
  { subject_slug: 'science', title: 'Universe and Space',                                   class_level: 8,  order_index: 15 },

  // ── Science and Technology – Class 9 ─────────────────────
  { subject_slug: 'science', title: 'Measurement and Motion',                               class_level: 9,  order_index: 1  },
  { subject_slug: 'science', title: 'Force, Work, Energy and Power',                        class_level: 9,  order_index: 2  },
  { subject_slug: 'science', title: 'Simple Machines',                                      class_level: 9,  order_index: 3  },
  { subject_slug: 'science', title: 'Heat and Temperature',                                 class_level: 9,  order_index: 4  },
  { subject_slug: 'science', title: 'Light',                                                class_level: 9,  order_index: 5  },
  { subject_slug: 'science', title: 'Electricity and Magnetism',                            class_level: 9,  order_index: 6  },
  { subject_slug: 'science', title: 'Atomic Structure and Chemical Bonding',                class_level: 9,  order_index: 7  },
  { subject_slug: 'science', title: 'Classification of Elements: Periodic Table',           class_level: 9,  order_index: 8  },
  { subject_slug: 'science', title: 'Chemical Reactions',                                   class_level: 9,  order_index: 9  },
  { subject_slug: 'science', title: 'Acids, Bases and Salts',                               class_level: 9,  order_index: 10 },
  { subject_slug: 'science', title: 'Some Gases',                                           class_level: 9,  order_index: 11 },
  { subject_slug: 'science', title: 'Carbon and Its Compounds',                             class_level: 9,  order_index: 12 },
  { subject_slug: 'science', title: 'Classification of Plants and Animals',                 class_level: 9,  order_index: 13 },
  { subject_slug: 'science', title: 'Ecosystems',                                           class_level: 9,  order_index: 14 },
  { subject_slug: 'science', title: 'Micro-organisms and Diseases',                         class_level: 9,  order_index: 15 },
  { subject_slug: 'science', title: 'Environmental Pollution',                              class_level: 9,  order_index: 16 },

  // ── Science and Technology – Class 10 ────────────────────
  { subject_slug: 'science', title: 'Force and Motion',                                     class_level: 10, order_index: 1  },
  { subject_slug: 'science', title: 'Pressure',                                             class_level: 10, order_index: 2  },
  { subject_slug: 'science', title: 'Energy',                                               class_level: 10, order_index: 3  },
  { subject_slug: 'science', title: 'Heat',                                                 class_level: 10, order_index: 4  },
  { subject_slug: 'science', title: 'Light: Lenses and Optical Instruments',               class_level: 10, order_index: 5  },
  { subject_slug: 'science', title: 'Electricity and Electrical Circuits',                 class_level: 10, order_index: 6  },
  { subject_slug: 'science', title: 'Magnetism and Electromagnetism',                       class_level: 10, order_index: 7  },
  { subject_slug: 'science', title: 'Classification of Elements: Modern Periodic Table',   class_level: 10, order_index: 8  },
  { subject_slug: 'science', title: 'Chemical Reactions',                                   class_level: 10, order_index: 9  },
  { subject_slug: 'science', title: 'Acids, Bases and Salts',                               class_level: 10, order_index: 10 },
  { subject_slug: 'science', title: 'Carbon and Its Compounds',                             class_level: 10, order_index: 11 },
  { subject_slug: 'science', title: 'Metals and Non-Metals',                                class_level: 10, order_index: 12 },
  { subject_slug: 'science', title: 'Human Biology: Nervous and Endocrine Systems',        class_level: 10, order_index: 13 },
  { subject_slug: 'science', title: 'Heredity and Evolution',                               class_level: 10, order_index: 14 },
  { subject_slug: 'science', title: 'Environmental Sustainability',                         class_level: 10, order_index: 15 },
  { subject_slug: 'science', title: 'The Universe and the Solar System',                   class_level: 10, order_index: 16 },
  { subject_slug: 'science', title: 'Information Technology and Communications',           class_level: 10, order_index: 17 },

  // ── Social Studies – Class 8 ──────────────────────────────
  { subject_slug: 'social-studies', title: 'Our Nation Nepal',                              class_level: 8,  order_index: 1  },
  { subject_slug: 'social-studies', title: 'Physical Geography of Nepal',                  class_level: 8,  order_index: 2  },
  { subject_slug: 'social-studies', title: 'Climate, Soil and Vegetation',                 class_level: 8,  order_index: 3  },
  { subject_slug: 'social-studies', title: 'Natural Disasters and Management',             class_level: 8,  order_index: 4  },
  { subject_slug: 'social-studies', title: 'History of Nepal',                             class_level: 8,  order_index: 5  },
  { subject_slug: 'social-studies', title: 'Social and Cultural Heritage',                 class_level: 8,  order_index: 6  },
  { subject_slug: 'social-studies', title: 'Government and Governance',                    class_level: 8,  order_index: 7  },
  { subject_slug: 'social-studies', title: 'Economic Activities and Resources',            class_level: 8,  order_index: 8  },
  { subject_slug: 'social-studies', title: 'World Geography',                              class_level: 8,  order_index: 9  },

  // ── Social Studies – Class 9 ──────────────────────────────
  { subject_slug: 'social-studies', title: 'Geography and Maps',                           class_level: 9,  order_index: 1  },
  { subject_slug: 'social-studies', title: 'Physical Regions of Nepal',                    class_level: 9,  order_index: 2  },
  { subject_slug: 'social-studies', title: 'Nepal\'s Ecological Diversity',                class_level: 9,  order_index: 3  },
  { subject_slug: 'social-studies', title: 'Natural Resources and Their Conservation',     class_level: 9,  order_index: 4  },
  { subject_slug: 'social-studies', title: 'Ancient and Medieval History of Nepal',        class_level: 9,  order_index: 5  },
  { subject_slug: 'social-studies', title: 'Unification of Nepal',                         class_level: 9,  order_index: 6  },
  { subject_slug: 'social-studies', title: 'Constitutional and Political Development',     class_level: 9,  order_index: 7  },
  { subject_slug: 'social-studies', title: 'Nepal\'s Federal Structure',                   class_level: 9,  order_index: 8  },
  { subject_slug: 'social-studies', title: 'Agriculture and Land Use',                     class_level: 9,  order_index: 9  },
  { subject_slug: 'social-studies', title: 'Industry, Trade and Commerce',                 class_level: 9,  order_index: 10 },
  { subject_slug: 'social-studies', title: 'Population and Urbanization',                  class_level: 9,  order_index: 11 },
  { subject_slug: 'social-studies', title: 'International Organizations and Nepal',        class_level: 9,  order_index: 12 },

  // ── Social Studies – Class 10 ─────────────────────────────
  { subject_slug: 'social-studies', title: 'Geographic Diversity and Land Use',            class_level: 10, order_index: 1  },
  { subject_slug: 'social-studies', title: 'Nepal\'s Water Resources and Hydropower',      class_level: 10, order_index: 2  },
  { subject_slug: 'social-studies', title: 'History of Democracy in Nepal',                class_level: 10, order_index: 3  },
  { subject_slug: 'social-studies', title: 'Constitution of Nepal 2015',                   class_level: 10, order_index: 4  },
  { subject_slug: 'social-studies', title: 'Human Rights and Civic Duties',                class_level: 10, order_index: 5  },
  { subject_slug: 'social-studies', title: 'Local Government and Federalism',              class_level: 10, order_index: 6  },
  { subject_slug: 'social-studies', title: 'Social Issues: Gender and Inclusion',          class_level: 10, order_index: 7  },
  { subject_slug: 'social-studies', title: 'Nepal\'s Economic Development',                class_level: 10, order_index: 8  },
  { subject_slug: 'social-studies', title: 'Nepal\'s Foreign Policy and SAARC',            class_level: 10, order_index: 9  },
  { subject_slug: 'social-studies', title: 'Globalization and Its Impact',                  class_level: 10, order_index: 10 },
  { subject_slug: 'social-studies', title: 'Tourism in Nepal',                              class_level: 10, order_index: 11 },
  { subject_slug: 'social-studies', title: 'World History: Major Events',                  class_level: 10, order_index: 12 },

  // ── Optional Mathematics – Class 9 ───────────────────────
  { subject_slug: 'optional-mathematics', title: 'Sets and Relations',                      class_level: 9,  order_index: 1  },
  { subject_slug: 'optional-mathematics', title: 'Functions',                               class_level: 9,  order_index: 2  },
  { subject_slug: 'optional-mathematics', title: 'Polynomial and Rational Expressions',    class_level: 9,  order_index: 3  },
  { subject_slug: 'optional-mathematics', title: 'Quadratic Equations',                     class_level: 9,  order_index: 4  },
  { subject_slug: 'optional-mathematics', title: 'Complex Numbers',                         class_level: 9,  order_index: 5  },
  { subject_slug: 'optional-mathematics', title: 'Matrices and Determinants',               class_level: 9,  order_index: 6  },
  { subject_slug: 'optional-mathematics', title: 'Sequence and Series',                     class_level: 9,  order_index: 7  },
  { subject_slug: 'optional-mathematics', title: 'Trigonometry',                            class_level: 9,  order_index: 8  },
  { subject_slug: 'optional-mathematics', title: 'Co-ordinate Geometry',                    class_level: 9,  order_index: 9  },
  { subject_slug: 'optional-mathematics', title: 'Statistics and Probability',              class_level: 9,  order_index: 10 },

  // ── Optional Mathematics – Class 10 ──────────────────────
  { subject_slug: 'optional-mathematics', title: 'Algebra: Polynomials and Functions',     class_level: 10, order_index: 1  },
  { subject_slug: 'optional-mathematics', title: 'Complex Numbers',                         class_level: 10, order_index: 2  },
  { subject_slug: 'optional-mathematics', title: 'Sequence and Series',                     class_level: 10, order_index: 3  },
  { subject_slug: 'optional-mathematics', title: 'Matrices and Determinants',               class_level: 10, order_index: 4  },
  { subject_slug: 'optional-mathematics', title: 'Permutation and Combination',             class_level: 10, order_index: 5  },
  { subject_slug: 'optional-mathematics', title: 'Binomial Theorem',                        class_level: 10, order_index: 6  },
  { subject_slug: 'optional-mathematics', title: 'Trigonometry: Compound and Multiple Angles', class_level: 10, order_index: 7 },
  { subject_slug: 'optional-mathematics', title: 'Co-ordinate Geometry: Conic Sections',   class_level: 10, order_index: 8  },
  { subject_slug: 'optional-mathematics', title: 'Vectors',                                  class_level: 10, order_index: 9  },
  { subject_slug: 'optional-mathematics', title: 'Linear Programming',                      class_level: 10, order_index: 10 },
  { subject_slug: 'optional-mathematics', title: 'Statistics: Correlation and Regression', class_level: 10, order_index: 11 },
  { subject_slug: 'optional-mathematics', title: 'Probability',                             class_level: 10, order_index: 12 },

  // ── Health, Population and Environment – Class 8 ─────────
  { subject_slug: 'health-population-environment', title: 'Personal Health and Hygiene',   class_level: 8,  order_index: 1  },
  { subject_slug: 'health-population-environment', title: 'Nutrition and Balanced Diet',   class_level: 8,  order_index: 2  },
  { subject_slug: 'health-population-environment', title: 'Communicable Diseases',         class_level: 8,  order_index: 3  },
  { subject_slug: 'health-population-environment', title: 'Non-Communicable Diseases',     class_level: 8,  order_index: 4  },
  { subject_slug: 'health-population-environment', title: 'Mental Health and Wellbeing',   class_level: 8,  order_index: 5  },
  { subject_slug: 'health-population-environment', title: 'Population Growth and Migration', class_level: 8, order_index: 6 },
  { subject_slug: 'health-population-environment', title: 'Environmental Pollution',        class_level: 8,  order_index: 7  },
  { subject_slug: 'health-population-environment', title: 'Conservation and Biodiversity', class_level: 8,  order_index: 8  },
  { subject_slug: 'health-population-environment', title: 'Disaster Risk Reduction',       class_level: 8,  order_index: 9  },

  // ── Health, Population and Environment – Class 9 ─────────
  { subject_slug: 'health-population-environment', title: 'Reproductive Health',            class_level: 9,  order_index: 1  },
  { subject_slug: 'health-population-environment', title: 'Adolescent Health',              class_level: 9,  order_index: 2  },
  { subject_slug: 'health-population-environment', title: 'Substance Abuse and Prevention', class_level: 9,  order_index: 3  },
  { subject_slug: 'health-population-environment', title: 'Population and Development',    class_level: 9,  order_index: 4  },
  { subject_slug: 'health-population-environment', title: 'Family Planning',                class_level: 9,  order_index: 5  },
  { subject_slug: 'health-population-environment', title: 'Climate Change and Environment', class_level: 9, order_index: 6  },
  { subject_slug: 'health-population-environment', title: 'Water and Sanitation',           class_level: 9,  order_index: 7  },
  { subject_slug: 'health-population-environment', title: 'Community Health Services',     class_level: 9,  order_index: 8  },

  // ── Health, Population and Environment – Class 10 ────────
  { subject_slug: 'health-population-environment', title: 'Global Health Issues',          class_level: 10, order_index: 1  },
  { subject_slug: 'health-population-environment', title: 'HIV/AIDS and STIs',             class_level: 10, order_index: 2  },
  { subject_slug: 'health-population-environment', title: 'Population Policy of Nepal',    class_level: 10, order_index: 3  },
  { subject_slug: 'health-population-environment', title: 'Sustainable Development Goals', class_level: 10, order_index: 4  },
  { subject_slug: 'health-population-environment', title: 'Ecosystem and Biodiversity',    class_level: 10, order_index: 5  },
  { subject_slug: 'health-population-environment', title: 'Environmental Laws and Policy', class_level: 10, order_index: 6  },
  { subject_slug: 'health-population-environment', title: 'First Aid and Emergency Care',  class_level: 10, order_index: 7  },
  { subject_slug: 'health-population-environment', title: 'Yoga and Meditation',           class_level: 10, order_index: 8  },

  // ── Computer Science – Class 8 ────────────────────────────
  { subject_slug: 'computer-science', title: 'Introduction to Computer',                   class_level: 8,  order_index: 1  },
  { subject_slug: 'computer-science', title: 'Operating System',                           class_level: 8,  order_index: 2  },
  { subject_slug: 'computer-science', title: 'Word Processing',                            class_level: 8,  order_index: 3  },
  { subject_slug: 'computer-science', title: 'Spreadsheet',                                class_level: 8,  order_index: 4  },
  { subject_slug: 'computer-science', title: 'Presentation Software',                      class_level: 8,  order_index: 5  },
  { subject_slug: 'computer-science', title: 'Internet and Email',                         class_level: 8,  order_index: 6  },
  { subject_slug: 'computer-science', title: 'Multimedia',                                 class_level: 8,  order_index: 7  },
  { subject_slug: 'computer-science', title: 'Introduction to Programming',                class_level: 8,  order_index: 8  },

  // ── Computer Science – Class 9 ────────────────────────────
  { subject_slug: 'computer-science', title: 'Computer System',                            class_level: 9,  order_index: 1  },
  { subject_slug: 'computer-science', title: 'Number System and Boolean Algebra',          class_level: 9,  order_index: 2  },
  { subject_slug: 'computer-science', title: 'Computer Memory and Storage',                class_level: 9,  order_index: 3  },
  { subject_slug: 'computer-science', title: 'Software: System and Application',           class_level: 9,  order_index: 4  },
  { subject_slug: 'computer-science', title: 'Computer Network and Internet',              class_level: 9,  order_index: 5  },
  { subject_slug: 'computer-science', title: 'Database Management System',                 class_level: 9,  order_index: 6  },
  { subject_slug: 'computer-science', title: 'Multimedia and Graphics',                    class_level: 9,  order_index: 7  },
  { subject_slug: 'computer-science', title: 'Programming in C: Basics',                   class_level: 9,  order_index: 8  },
  { subject_slug: 'computer-science', title: 'Programming in C: Control Structures',       class_level: 9,  order_index: 9  },
  { subject_slug: 'computer-science', title: 'Web Technology: HTML Basics',                class_level: 9,  order_index: 10 },

  // ── Computer Science – Class 10 ───────────────────────────
  { subject_slug: 'computer-science', title: 'Computer Architecture',                      class_level: 10, order_index: 1  },
  { subject_slug: 'computer-science', title: 'Number System and Conversion',               class_level: 10, order_index: 2  },
  { subject_slug: 'computer-science', title: 'Data Communication and Networking',          class_level: 10, order_index: 3  },
  { subject_slug: 'computer-science', title: 'Cyber Security and Ethics',                  class_level: 10, order_index: 4  },
  { subject_slug: 'computer-science', title: 'Database: SQL Basics',                       class_level: 10, order_index: 5  },
  { subject_slug: 'computer-science', title: 'Programming in C: Arrays and Functions',    class_level: 10, order_index: 6  },
  { subject_slug: 'computer-science', title: 'Programming in C: Strings and Pointers',    class_level: 10, order_index: 7  },
  { subject_slug: 'computer-science', title: 'Web Technology: HTML, CSS and JavaScript',  class_level: 10, order_index: 8  },
  { subject_slug: 'computer-science', title: 'E-Commerce and Digital Economy',             class_level: 10, order_index: 9  },
  { subject_slug: 'computer-science', title: 'Artificial Intelligence and Robotics',       class_level: 10, order_index: 10 },

  // ── Account – Class 9 ────────────────────────────────────
  { subject_slug: 'account', title: 'Introduction to Accounting',                          class_level: 9,  order_index: 1  },
  { subject_slug: 'account', title: 'Accounting Concepts and Principles',                  class_level: 9,  order_index: 2  },
  { subject_slug: 'account', title: 'Journal Entries',                                     class_level: 9,  order_index: 3  },
  { subject_slug: 'account', title: 'Ledger and Trial Balance',                            class_level: 9,  order_index: 4  },
  { subject_slug: 'account', title: 'Bank Reconciliation Statement',                       class_level: 9,  order_index: 5  },
  { subject_slug: 'account', title: 'Bills of Exchange',                                   class_level: 9,  order_index: 6  },
  { subject_slug: 'account', title: 'Final Accounts: Trading and P&L',                    class_level: 9,  order_index: 7  },
  { subject_slug: 'account', title: 'Balance Sheet',                                       class_level: 9,  order_index: 8  },

  // ── Account – Class 10 ───────────────────────────────────
  { subject_slug: 'account', title: 'Depreciation Accounting',                             class_level: 10, order_index: 1  },
  { subject_slug: 'account', title: 'Capital and Revenue',                                 class_level: 10, order_index: 2  },
  { subject_slug: 'account', title: 'Accounts of Not-For-Profit Organizations',            class_level: 10, order_index: 3  },
  { subject_slug: 'account', title: 'Consignment Accounts',                                class_level: 10, order_index: 4  },
  { subject_slug: 'account', title: 'Hire Purchase Accounts',                              class_level: 10, order_index: 5  },
  { subject_slug: 'account', title: 'Partnership Accounts',                                class_level: 10, order_index: 6  },
  { subject_slug: 'account', title: 'Company Accounts',                                    class_level: 10, order_index: 7  },
  { subject_slug: 'account', title: 'Accounting for Government Organizations',             class_level: 10, order_index: 8  },
]

// ============================================================
// SEED RUNNER
// ============================================================

async function seed() {
  console.log('🌱  PadhaiSathi seed starting…\n')

  // ── 1. Upsert subjects ──────────────────────────────────────
  console.log(`📚  Seeding ${SUBJECTS.length} subjects…`)

  const { data: insertedSubjects, error: subjectError } = await supabase
    .from('subjects')
    .upsert(SUBJECTS, { onConflict: 'slug', ignoreDuplicates: false })
    .select('id, slug, name')

  if (subjectError) {
    console.error(`❌  Subject seed failed: ${subjectError.message}`)
    process.exit(1)
  }

  if (!insertedSubjects || insertedSubjects.length === 0) {
    console.error('❌  No subjects returned after upsert.')
    process.exit(1)
  }

  // Build slug → id map
  const subjectMap = new Map<string, string>()
  for (const s of insertedSubjects) {
    subjectMap.set(s.slug, s.id)
    console.log(`   ✅  ${s.name} (${s.id})`)
  }

  // ── 2. Upsert chapters ─────────────────────────────────────
  console.log(`\n📖  Seeding ${CHAPTERS.length} chapters…`)

  // Resolve subject slugs → IDs and build chapter rows
  const chapterRows: {
    subject_id:  string
    title:       string
    slug:        string
    class_level: ClassLevel
    order_index: number
  }[] = []

  for (const ch of CHAPTERS) {
    const subjectId = subjectMap.get(ch.subject_slug)
    if (!subjectId) {
      console.error(`❌  No subject found for slug "${ch.subject_slug}" (chapter: "${ch.title}")`)
      process.exit(1)
    }

    chapterRows.push({
      subject_id:  subjectId,
      title:       ch.title,
      slug:        slugify(ch.title),
      class_level: ch.class_level,
      order_index: ch.order_index,
    })
  }

  // Batch upsert in chunks of 50 to stay within Supabase limits
  const CHUNK_SIZE = 50
  let totalInserted = 0

  for (let i = 0; i < chapterRows.length; i += CHUNK_SIZE) {
    const chunk = chapterRows.slice(i, i + CHUNK_SIZE)

    const { data: inserted, error: chapterError } = await supabase
      .from('chapters')
      .upsert(chunk, { onConflict: 'subject_id,slug,class_level', ignoreDuplicates: false })
      .select('id')

    if (chapterError) {
      console.error(`❌  Chapter batch ${Math.floor(i / CHUNK_SIZE) + 1} failed: ${chapterError.message}`)
      process.exit(1)
    }

    totalInserted += inserted?.length ?? 0
    console.log(
      `   ✅  Batch ${Math.floor(i / CHUNK_SIZE) + 1}: ${inserted?.length ?? 0} chapters upserted`
    )
  }

  console.log(`\n✅  Seed complete.`)
  console.log(`   Subjects:  ${insertedSubjects.length}`)
  console.log(`   Chapters:  ${totalInserted}`)
  console.log('\n🚀  PadhaiSathi is ready.')
}

seed().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`❌  Unexpected error: ${message}`)
  process.exit(1)
})