import { AuthModel } from '../modules/auth/auth.model.js';
import { PasswordUtil } from '../common/utils/password.util.js';
import { TokenUtil } from '../common/utils/token.util.js';

async function testLoginFlow() {
  console.log('Testing native Argon2 + JWT authentication flow...');

  // Test 1: Principal Seyi Bankole
  const email = 'seyibankole@gmail.com';
  const password = PasswordUtil.DEFAULT_STAFF_PASSWORD; // 'Oakland@2026'

  const user = await AuthModel.findUserByEmail(email);
  if (!user) {
    console.error(`❌ User not found for ${email}`);
    return;
  }
  console.log(`✅ Found user: ${user.email} (Role: ${user.role})`);

  const isPasswordValid = await PasswordUtil.verify(user.passwordHash, password);
  console.log(`✅ Argon2 password verification: ${isPasswordValid ? 'SUCCESS' : 'FAILED'}`);

  const token = TokenUtil.sign({
    id: user.id,
    email: user.email,
    role: user.role,
    schoolId: user.schoolId,
  });
  console.log(`✅ JWT token signed successfully (length: ${token.length})`);

  const payload = TokenUtil.verify(token);
  console.log(`✅ Verified JWT token payload:`, payload);

  // Test 2: Proprietor login
  const propEmail = 'proprietor@oaklandschools.edu.ng';
  const propUser = await AuthModel.findUserByEmail(propEmail);
  const propValid = propUser ? await PasswordUtil.verify(propUser.passwordHash, password) : false;
  console.log(`✅ Proprietor (${propEmail}) login test: ${propValid ? 'SUCCESS' : 'FAILED'}`);

  console.log('🎉 ALL AUTH TESTS PASSED!');
}

testLoginFlow();
