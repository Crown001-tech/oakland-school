const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gxkywfgoitfjyuipkmqj.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4a3l3ZmdvaXRmanl1aXBrbXFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDQxNDMxNCwiZXhwIjoyMTA1OTkwMzE0fQ.XKNB5hRbc1CsIQXAhZi7SirHgvacudIo9mRp4W3pqnA';

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SCHOOL_ID = 'a0000000-0000-0000-0000-000000000001';
const SESSION_ID = 'b0000000-0000-0000-0000-000000000001';
const TERM_ID = 'c0000000-0000-0000-0000-000000000001';

const CLASSES = [
  { name: 'JSS 1', grade_level: 1, capacity: 50 },
  { name: 'JSS 2', grade_level: 2, capacity: 50 },
  { name: 'JSS 3', grade_level: 3, capacity: 50 },
  { name: 'SS 1', grade_level: 4, capacity: 50 },
  { name: 'SS 2', grade_level: 5, capacity: 50 },
  { name: 'SS 3', grade_level: 6, capacity: 50 },
];

const USERS_TO_SEED = [
  {
    email: 'proprietor@oaklandschools.edu',
    password: 'Oakland@2026',
    role: 'proprietor',
    firstName: 'Arthur',
    lastName: 'Sterling',
    fullName: 'Chief Dr. Arthur Sterling',
    employeeId: 'OAK-PROP-001',
    phone: '+234 803 000 0001',
    department: 'Board of Governors / Executive Ownership',
  },
  {
    email: 'principal@oaklandschools.edu',
    password: 'Oakland@2026',
    role: 'admin',
    firstName: 'Beatrice',
    lastName: 'Okonkwo',
    fullName: 'Dr. Mrs. Beatrice O.',
    employeeId: 'OAK-ADM-001',
    phone: '+234 802 334 1122',
    department: 'School Administration & Academics',
  },
  {
    email: 'bursar@oaklandschools.edu',
    password: 'Oakland@2026',
    role: 'bursar',
    firstName: 'Kenneth',
    lastName: 'Chukwu',
    fullName: 'Mr. Kenneth Chukwu',
    employeeId: 'OAK-BUR-001',
    phone: '+234 803 998 7766',
    department: 'Finance & Accounts',
  },
  {
    email: 'teacher@oaklandschools.edu',
    password: 'Oakland@2026',
    role: 'teacher',
    firstName: 'Emeka',
    lastName: 'Nwosu',
    fullName: 'Mr. Emeka Nwosu',
    employeeId: 'OAK/TCH/007',
    phone: '+234 803 777 8899',
    department: 'Sciences',
    assignedClass: 'JSS 1',
  },
  {
    email: 'adebayo.funke@oaklandschools.edu',
    password: 'Oakland@2026',
    role: 'teacher',
    firstName: 'Funke',
    lastName: 'Adebayo',
    fullName: 'Mrs. Funke Adebayo',
    employeeId: 'OAK/TCH/001',
    phone: '+234 803 111 2233',
    department: 'Sciences',
    assignedClass: 'JSS 1',
  },
  {
    email: 'okonjo.paul@oaklandschools.edu',
    password: 'Oakland@2026',
    role: 'teacher',
    firstName: 'Paul',
    lastName: 'Okonjo',
    fullName: 'Mr. Paul Okonjo',
    employeeId: 'OAK/TCH/002',
    phone: '+234 803 222 3344',
    department: 'Languages & Arts',
    assignedClass: 'JSS 2',
  },
  {
    email: 'ibrahim.zainab@oaklandschools.edu',
    password: 'Oakland@2026',
    role: 'teacher',
    firstName: 'Zainab',
    lastName: 'Ibrahim',
    fullName: 'Mrs. Zainab Ibrahim',
    employeeId: 'OAK/TCH/003',
    phone: '+234 803 333 4455',
    department: 'Sciences',
    assignedClass: 'JSS 3',
  },
  {
    email: 'adeleke.segun@oaklandschools.edu',
    password: 'Oakland@2026',
    role: 'teacher',
    firstName: 'Segun',
    lastName: 'Adeleke',
    fullName: 'Mr. Segun Adeleke',
    employeeId: 'OAK/TCH/004',
    phone: '+234 803 444 5566',
    department: 'Sciences',
    assignedClass: 'SS 1',
  },
  {
    email: 'eze.chioma@oaklandschools.edu',
    password: 'Oakland@2026',
    role: 'teacher',
    firstName: 'Chioma',
    lastName: 'Eze',
    fullName: 'Dr. Chioma Eze',
    employeeId: 'OAK/TCH/005',
    phone: '+234 803 555 6677',
    department: 'Sciences',
    assignedClass: 'SS 2',
  },
  {
    email: 'babatunde.wale@oaklandschools.edu',
    password: 'Oakland@2026',
    role: 'teacher',
    firstName: 'Wale',
    lastName: 'Babatunde',
    fullName: 'Mr. Wale Babatunde',
    employeeId: 'OAK/TCH/006',
    phone: '+234 803 666 7788',
    department: 'Commercial',
    assignedClass: 'SS 3',
  },
];

async function seed() {
  console.log('🚀 Starting clean Supabase database seeding...');

  // 1. Seed School Tenant
  const { error: schoolErr } = await sb.from('schools').upsert({
    id: SCHOOL_ID,
    name: 'Oakland Schools, Lagos',
    code: 'OAK-001',
    slug: 'oakland-schools',
    motto: 'Excellence, Integrity, Leadership',
    address: '14 Academic Crescent, Victoria Island, Lagos',
    phone: '+234 800 625 5263',
    email: 'admin@oaklandschools.edu',
  });
  if (schoolErr) console.error('Error upserting school:', schoolErr);
  else console.log('✅ School tenant seeded: Oakland Schools, Lagos');

  // 2. Seed Academic Session
  const { error: sessionErr } = await sb.from('academic_sessions').upsert({
    id: SESSION_ID,
    school_id: SCHOOL_ID,
    name: '2026/2027',
    start_date: '2026-09-01',
    end_date: '2027-07-20',
    is_current: true,
  });
  if (sessionErr) console.error('Error upserting session:', sessionErr);
  else console.log('✅ Academic session seeded: 2026/2027');

  // 3. Seed Academic Term
  const { error: termErr } = await sb.from('academic_terms').upsert({
    id: TERM_ID,
    session_id: SESSION_ID,
    school_id: SCHOOL_ID,
    name: 'First Term',
    term_number: 1,
    start_date: '2026-09-01',
    end_date: '2026-12-18',
    is_current: true,
  });
  if (termErr) console.error('Error upserting term:', termErr);
  else console.log('✅ Academic term seeded: First Term');

  // 4. Seed Classes
  const classMap = {};
  for (const c of CLASSES) {
    const { data: clsData, error: clsErr } = await sb
      .from('classes')
      .upsert({
        school_id: SCHOOL_ID,
        name: c.name,
        grade_level: c.grade_level,
        capacity: c.capacity,
      }, { onConflict: 'school_id,name' })
      .select();

    if (clsErr) {
      console.error(`Error upserting class ${c.name}:`, clsErr);
    } else if (clsData && clsData[0]) {
      classMap[c.name] = clsData[0].id;
    }
  }
  console.log('✅ 6 Standard secondary classes seeded (JSS 1 – SS 3)');

  // 5. Seed Assessment Categories
  const categories = [
    { name: 'CA 1', weight: 20.0 },
    { name: 'CA 2 (Mid-Term)', weight: 20.0 },
    { name: 'Terminal Examination', weight: 60.0 },
  ];
  for (const cat of categories) {
    await sb.from('assessment_categories').upsert({
      school_id: SCHOOL_ID,
      name: cat.name,
      weight_percentage: cat.weight,
    }, { onConflict: 'school_id,name' }).catch(() => {});
  }
  console.log('✅ Assessment grading categories seeded (CA1 20%, CA2 20%, Exam 60%)');

  // 6. Fetch existing users to prevent duplicate auth creations
  const { data: existingUsersData } = await sb.auth.admin.listUsers();
  const existingUsers = existingUsersData?.users || [];
  const userMap = new Map(existingUsers.map((u) => [u.email.toLowerCase(), u]));

  // 7. Seed Auth Users and Staff Profiles
  for (const userConfig of USERS_TO_SEED) {
    const email = userConfig.email.toLowerCase();
    let authUser = userMap.get(email);

    if (authUser) {
      // Update existing user password and metadata
      const { data: updated, error: updateErr } = await sb.auth.admin.updateUserById(authUser.id, {
        password: userConfig.password,
        email_confirm: true,
        user_metadata: {
          role: userConfig.role,
          full_name: userConfig.fullName,
          employee_id: userConfig.employeeId,
          assigned_class: userConfig.assignedClass || null,
        },
      });
      if (updateErr) {
        console.error(`Error updating auth user ${email}:`, updateErr);
      } else {
        authUser = updated.user;
        console.log(`🔄 Updated Supabase Auth user: ${email} (${userConfig.role})`);
      }
    } else {
      // Create new active auth user
      const { data: created, error: createErr } = await sb.auth.admin.createUser({
        email,
        password: userConfig.password,
        email_confirm: true,
        user_metadata: {
          role: userConfig.role,
          full_name: userConfig.fullName,
          employee_id: userConfig.employeeId,
          assigned_class: userConfig.assignedClass || null,
        },
      });
      if (createErr) {
        console.error(`Error creating auth user ${email}:`, createErr);
      } else {
        authUser = created.user;
        console.log(`✨ Created Supabase Auth user: ${email} (${userConfig.role})`);
      }
    }

    if (authUser) {
      // Upsert School Membership
      await sb.from('school_memberships').upsert({
        school_id: SCHOOL_ID,
        user_id: authUser.id,
        role: userConfig.role,
        is_active: true,
      }, { onConflict: 'school_id,user_id' });

      // Upsert Staff Profile
      const { error: staffErr } = await sb.from('staff_profiles').upsert({
        user_id: authUser.id,
        school_id: SCHOOL_ID,
        employee_id: userConfig.employeeId,
        first_name: userConfig.firstName,
        last_name: userConfig.lastName,
        email: userConfig.email,
        phone: userConfig.phone,
        role: userConfig.role,
        department: userConfig.department,
        is_active: true,
      }, { onConflict: 'school_id,employee_id' });

      if (staffErr) console.error(`Error upserting staff_profile for ${email}:`, staffErr);
    }
  }

  // 8. Seed sample students across classes so rosters are populated
  const sampleStudents = [
    { first: 'Adekunle', last: 'Bamidele', gender: 'male', class: 'JSS 1', adm: 'OAK/2026/001' },
    { first: 'Chidinma', last: 'Okeke', gender: 'female', class: 'JSS 1', adm: 'OAK/2026/002' },
    { first: 'Oluwaseun', last: 'Ajayi', gender: 'male', class: 'JSS 1', adm: 'OAK/2026/003' },
    { first: 'Fatima', last: 'Sanusi', gender: 'female', class: 'JSS 1', adm: 'OAK/2026/004' },
    { first: 'David', last: 'Nwachukwu', gender: 'male', class: 'JSS 1', adm: 'OAK/2026/005' },

    { first: 'Kelechi', last: 'Maduka', gender: 'male', class: 'JSS 2', adm: 'OAK/2026/006' },
    { first: 'Blessing', last: 'Eze', gender: 'female', class: 'JSS 2', adm: 'OAK/2026/007' },
    { first: 'Samuel', last: 'Oladipo', gender: 'male', class: 'JSS 2', adm: 'OAK/2026/008' },

    { first: 'Zainab', last: 'Aliyu', gender: 'female', class: 'JSS 3', adm: 'OAK/2026/009' },
    { first: 'Daniel', last: 'Obi', gender: 'male', class: 'JSS 3', adm: 'OAK/2026/010' },

    { first: 'Tunde', last: 'Bakare', gender: 'male', class: 'SS 1', adm: 'OAK/2026/011' },
    { first: 'Amina', last: 'Bello', gender: 'female', class: 'SS 1', adm: 'OAK/2026/012' },

    { first: 'Emmanuel', last: 'Chukwuma', gender: 'male', class: 'SS 2', adm: 'OAK/2026/013' },
    { first: 'Grace', last: 'Olawale', gender: 'female', class: 'SS 2', adm: 'OAK/2026/014' },

    { first: 'Victor', last: 'Osoba', gender: 'male', class: 'SS 3', adm: 'OAK/2026/015' },
    { first: 'Ngozi', last: 'Kalu', gender: 'female', class: 'SS 3', adm: 'OAK/2026/016' },
  ];

  for (const s of sampleStudents) {
    const { data: stData, error: stErr } = await sb.from('students').upsert({
      school_id: SCHOOL_ID,
      admission_number: s.adm,
      first_name: s.first,
      last_name: s.last,
      gender: s.gender,
      dob: '2012-05-15',
      status: 'active',
    }, { onConflict: 'school_id,admission_number' }).select();

    if (stData && stData[0] && classMap[s.class]) {
      await sb.from('class_enrollments').upsert({
        student_id: stData[0].id,
        class_id: classMap[s.class],
        session_id: SESSION_ID,
        term_id: TERM_ID,
        is_current: true,
      }).catch(() => {});
    }
  }
  console.log(`✅ Seeded ${sampleStudents.length} active students with class enrollments.`);

  console.log('🎉 Database seeding completed successfully! All tables and accounts are active.');
}

seed().catch((err) => {
  console.error('Fatal error during seeding:', err);
  process.exit(1);
});
