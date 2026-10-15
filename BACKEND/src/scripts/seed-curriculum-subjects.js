const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const DEFAULT_SCHOOL_ID = 'a0000000-0000-0000-0000-000000000001';

const subjects = [
  // Junior Secondary (Core & Pre-Vocational)
  { name: 'Mathematics', code: 'MTH', category: 'General' },
  { name: 'English Language', code: 'ENG', category: 'General' },
  { name: 'Basic Science', code: 'BSC', category: 'Sciences' },
  { name: 'Basic Technology', code: 'BTE', category: 'Sciences' },
  { name: 'Computer Studies', code: 'CMP', category: 'Sciences' },
  { name: 'Social Studies', code: 'SST', category: 'Humanities' },
  { name: 'Civic Education', code: 'CVE', category: 'General' },
  { name: 'Agricultural Science', code: 'AGR', category: 'Sciences' },
  { name: 'French', code: 'FRN', category: 'Humanities' },
  { name: 'Cultural & Creative Arts (CCA)', code: 'CCA', category: 'Humanities' },
  { name: 'Business Studies', code: 'BUS', category: 'Commercial' },
  { name: 'Physical & Health Education (PHE)', code: 'PHE', category: 'General' },

  // Senior Secondary (Sciences)
  { name: 'Physics', code: 'PHY', category: 'Sciences' },
  { name: 'Chemistry', code: 'CHM', category: 'Sciences' },
  { name: 'Biology', code: 'BIO', category: 'Sciences' },
  { name: 'Further Mathematics', code: 'FMT', category: 'Sciences' },
  { name: 'Technical Drawing', code: 'TDR', category: 'Sciences' },

  // Senior Secondary (Commercial)
  { name: 'Financial Accounting', code: 'ACC', category: 'Commercial' },
  { name: 'Economics', code: 'ECO', category: 'Commercial' },
  { name: 'Commerce', code: 'COM', category: 'Commercial' },
  { name: 'Business Management', code: 'BMG', category: 'Commercial' },

  // Senior Secondary (Humanities)
  { name: 'Literature in English', code: 'LIT', category: 'Humanities' },
  { name: 'Government', code: 'GOV', category: 'Humanities' },
  { name: 'Christian Religious Studies (CRS)', code: 'CRS', category: 'Humanities' },
  { name: 'Islamic Religious Studies (IRS)', code: 'IRS', category: 'Humanities' },
  { name: 'Geography', code: 'GEO', category: 'Humanities' },
  { name: 'History', code: 'HIS', category: 'Humanities' }
];

async function seedSubjects() {
  console.log('Seeding official NERDC curriculum subjects into PostgreSQL...');

  const payload = subjects.map(s => ({
    school_id: DEFAULT_SCHOOL_ID,
    name: s.name,
    code: s.code,
    category: s.category,
    is_active: true
  }));

  const { data, error } = await supabase
    .from('subjects')
    .upsert(payload, { onConflict: 'school_id,code' })
    .select();

  if (error) {
    console.error('Error seeding subjects:', error);
  } else {
    console.log(`Successfully seeded ${data.length} official curriculum subjects in PostgreSQL!`);
  }
}

seedSubjects();
